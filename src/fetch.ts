import ReactDOM from 'react-dom';
import { MutableRefObject } from 'react';

import sleep from './sleep';
import { ContextInterface } from './context';

export interface RequestOptions<R, E, C> {
    shouldRetry?: (
        val: { errored: true, value: E } | { errored: false, value: R },
        run: number,
        context: C,
    ) => number;
    shouldPoll?: (
        val: { errored: true, value: E } | { errored: false, value: R },
        context: C,
    ) => number;
    onSuccess?: (val: R, context: C) => void;
    onFailure?: (val: E, context: C) => void;
}

type ExtendedRequestOptions<R, E, C, O> = RequestOptions<R, E, C> & O;

async function fetchResource<R, RE, E, C, O>(
    url: string,
    options: RequestInit,
    delay: number,

    transformUrlRef: MutableRefObject<ContextInterface<R, RE, E, ExtendedRequestOptions<R, E, C, O>>['transformUrl']>,
    transformOptionsRef: MutableRefObject<ContextInterface<R, RE, E, ExtendedRequestOptions<R, E, C, O>>['transformOptions']>,
    transformResponseRef: MutableRefObject<ContextInterface<R, RE, E, ExtendedRequestOptions<R, E, C, O>>['transformResponse']>,
    transformErrorRef: MutableRefObject<ContextInterface<R, RE, E, ExtendedRequestOptions<R, E, C, O>>['transformError']>,
    setCacheRef: MutableRefObject<ContextInterface<R, RE, E, ExtendedRequestOptions<R, E, C, O>>['setCache']>,
    requestOptionsRef: MutableRefObject<ExtendedRequestOptions<R, E, C, O>>,
    context: C,

    setPendingSafe: (value: boolean, clientId: number) => void,
    setResponseSafe: (value: R | undefined, clientId: number) => void,
    setErrorSafe: (value: E | undefined, clientId: number) => void,
    callSideEffectSafe: (value: () => void, clientId: number) => void,

    myController: AbortController,
    clientId: number,
    run = 1,
) {
    const { signal } = myController;
    try {
        await sleep(delay, { signal });
    } catch (ex) {
        // eslint-disable-next-line no-console
        console.error(`Aborted request ${url}`);
        return;
    }

    async function handlePoll(pollTime: number) {
        try {
            await sleep(pollTime, { signal });
        } catch (ex) {
            // eslint-disable-next-line no-console
            console.error(`Aborted request ${url}`);
            return;
        }

        await fetchResource(
            url,
            options,
            delay,

            transformUrlRef,
            transformOptionsRef,
            transformResponseRef,
            transformErrorRef,
            setCacheRef,
            requestOptionsRef,
            context,

            setPendingSafe,
            setResponseSafe,
            setErrorSafe,
            callSideEffectSafe,

            myController,
            clientId, // NOTE: may not need to increase clientId
            1, // NOTE: run should be reset
        );
    }

    async function handleError(message: E) {
        const { shouldRetry, shouldPoll } = requestOptionsRef.current;

        const retryTime = shouldRetry
            ? shouldRetry({ errored: true, value: message }, run, context)
            : -1;

        if (retryTime >= 0) {
            try {
                await sleep(retryTime, { signal });
            } catch (ex) {
                // eslint-disable-next-line no-console
                console.error(`Aborted request ${url}`);
                return;
            }
            await fetchResource(
                url,
                options,
                delay,

                transformUrlRef,
                transformOptionsRef,
                transformResponseRef,
                transformErrorRef,
                setCacheRef,
                requestOptionsRef,
                context,

                setPendingSafe,
                setResponseSafe,
                setErrorSafe,
                callSideEffectSafe,

                myController,
                clientId,
                run + 1,
            );
            return;
        }

        ReactDOM.unstable_batchedUpdates(() => {
            setPendingSafe(false, clientId);
            setResponseSafe(undefined, clientId);
            setErrorSafe(message, clientId);
        });

        const { onFailure } = requestOptionsRef.current;
        if (onFailure) {
            callSideEffectSafe(() => {
                onFailure(message, context);
            }, clientId);
        }

        const pollTime = shouldPoll
            ? shouldPoll({ errored: true, value: message }, context)
            : -1;
        if (pollTime > 0) {
            await handlePoll(pollTime);
        }
    }

    async function handleSuccess(response: R) {
        const { shouldRetry, shouldPoll } = requestOptionsRef.current;

        const retryTime = shouldRetry
            ? shouldRetry({ errored: false, value: response }, run, context)
            : -1;

        if (retryTime >= 0) {
            try {
                await sleep(retryTime, { signal });
            } catch (ex) {
                // eslint-disable-next-line no-console
                console.error(`Aborted request ${url}`);
                return;
            }
            await fetchResource(
                url,
                options,
                delay,

                transformUrlRef,
                transformOptionsRef,
                transformResponseRef,
                transformErrorRef,
                setCacheRef,
                requestOptionsRef,
                context,

                setPendingSafe,
                setResponseSafe,
                setErrorSafe,
                callSideEffectSafe,

                myController,
                clientId,
                run + 1,
            );
            return;
        }

        ReactDOM.unstable_batchedUpdates(() => {
            setPendingSafe(false, clientId);
            setErrorSafe(undefined, clientId);
            if (options.method === 'GET' && setCacheRef.current) {
                setCacheRef.current(url, response);
            }
            setResponseSafe(response, clientId);
        });

        const { onSuccess } = requestOptionsRef.current;
        if (onSuccess) {
            callSideEffectSafe(() => {
                onSuccess(response, context);
            }, clientId);
        }

        const pollTime = shouldPoll
            ? shouldPoll({ errored: false, value: response as R }, context)
            : -1;
        if (pollTime > 0) {
            await handlePoll(pollTime);
        }
    }

    const myUrl = transformUrlRef.current(
        url,
        options,
        requestOptionsRef.current,
    );
    const myOptions = transformOptionsRef.current(
        url,
        options,
        requestOptionsRef.current,
    );

    let res;
    try {
        res = await fetch(myUrl, { ...myOptions, signal });
    } catch (e) {
        if (!signal.aborted) {
            // eslint-disable-next-line no-console
            console.error(`An error occurred while fetching ${myUrl}`, e);

            const transformedError = transformErrorRef.current(
                'network',
                url,
                options,
                requestOptionsRef.current,
            );
            await handleError(transformedError);
        }
        return;
    }

    let resBody: R | RE;
    try {
        resBody = await transformResponseRef.current(
            res,
            url,
            options,
            requestOptionsRef.current,
        );
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`An error occurred while parsing ${myUrl}`, e);
        const transformedError = transformErrorRef.current(
            'parse',
            url,
            options,
            requestOptionsRef.current,
        );
        await handleError(transformedError);
        return;
    }

    if (!res.ok) {
        const transformedError = transformErrorRef.current(
            resBody as RE,
            url,
            options,
            requestOptionsRef.current,
        );
        await handleError(transformedError);
        return;
    }

    await handleSuccess(resBody as R);
}

export default fetchResource;
