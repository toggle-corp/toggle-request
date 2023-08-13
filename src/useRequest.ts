import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useContext,
    useLayoutEffect,
    useMemo,
} from 'react';

import {
    prepareUrlParams,
    isFetchable,
    Methods,
    resolvePath,
} from './utils';
import { UrlParams } from './types';
import RequestContext, { ContextInterface } from './context';
import fetchResource, { RequestOptions as BaseRequestOptions } from './fetch';

function useDidUpdateEffect(fn: React.EffectCallback, inputs: React.DependencyList) {
    const didMountRef = useRef(false);

    useEffect(
        () => {
            if (didMountRef.current) {
                return fn();
            }
            didMountRef.current = true;
            return undefined;
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        inputs,
    );
}

type RequestBody = RequestInit['body'] | object;

export type RequestOptions<R, E, O> = BaseRequestOptions<R, E, null> & {
    url: string | undefined;
    pathVariables: Record<string, string | number | undefined>;
    query?: UrlParams | undefined;
    body?: RequestBody | undefined;
    method?: Methods | undefined;
    other?: Omit<RequestInit, 'body'> | undefined;

    // NOTE: disabling will cancel on-going requests
    skip?: boolean;

    // NOTE: don't ever re-trigger
    delay?: number;
    mockResponse?: R;
    preserveResponse?: boolean;
} & O;

function useRequest<R, E, O>(
    requestOptions: RequestOptions<R, E, O>,
) {
    const {
        transformOptions,
        transformUrl,
        transformResponse,
        transformError,
        getCache,
        setCache,
    } = useContext(RequestContext as React.Context<ContextInterface<R, unknown, E, O>>);

    // NOTE: forgot why the clientId is required but it is required
    const clientIdRef = useRef<number>(-1);
    const pendingSetByRef = useRef<number>(-1);
    const responseSetByRef = useRef<number>(-1);
    const errorSetByRef = useRef<number>(-1);

    // NOTE: let's not add transformOptions as dependency
    const requestOptionsRef = useRef(requestOptions);
    const transformOptionsRef = useRef(transformOptions);
    const transformUrlRef = useRef(transformUrl);
    const transformResponseRef = useRef(transformResponse);
    const transformErrorRef = useRef(transformError);
    const getCacheRef = useRef(getCache);
    const setCacheRef = useRef(setCache);

    const { skip = false } = requestOptions;

    const {
        url,
        query,
        method = 'GET',
        body,
        other,
        pathVariables,
    } = requestOptions;

    const extendedUrl = useMemo(
        () => {
            if (skip) {
                return undefined;
            }

            const urlQuery = query ? prepareUrlParams(query) : undefined;
            const middleUrl = url && urlQuery ? `${url}?${urlQuery}` : url;
            return middleUrl ? resolvePath(middleUrl, pathVariables) : url;
        },
        [pathVariables, url, query, skip],
    );

    const [response, setResponse] = useState<R | undefined>();
    const [error, setError] = useState<E | undefined>();

    const [runId, setRunId] = useState(() => (
        skip ? -1 : new Date().getTime()
    ));

    const [pending, setPending] = useState(() => (
        runId >= 0 && isFetchable(extendedUrl, method, body)
    ));

    const setPendingSafe = useCallback(
        (value: boolean, clientId: number) => {
            if (clientId >= pendingSetByRef.current) {
                pendingSetByRef.current = clientId;
                setPending(value);
            }
        },
        [],
    );
    const setResponseSafe = useCallback(
        (value: R | undefined, clientId: number) => {
            if (clientId >= responseSetByRef.current) {
                responseSetByRef.current = clientId;

                setResponse(value);
            }
        },
        [],
    );

    const setErrorSafe = useCallback(
        (value: E | undefined, clientId: number) => {
            if (clientId >= errorSetByRef.current) {
                errorSetByRef.current = clientId;
                setError(value);
            }
        },
        [],
    );

    const callSideEffectSafe = useCallback(
        (callback: () => void, clientId: number) => {
            if (clientId >= clientIdRef.current) {
                callback();
            }
        },
        [],
    );

    useLayoutEffect(
        () => {
            transformOptionsRef.current = transformOptions;
        },
        [transformOptions],
    );
    useLayoutEffect(
        () => {
            transformUrlRef.current = transformUrl;
        },
        [transformUrl],
    );
    useLayoutEffect(
        () => {
            transformResponseRef.current = transformResponse;
        },
        [transformResponse],
    );
    useLayoutEffect(
        () => {
            transformErrorRef.current = transformError;
        },
        [transformError],
    );
    useLayoutEffect(
        () => {
            requestOptionsRef.current = requestOptions;
        },
        [requestOptions],
    );

    // To re-trigger request when skip changes
    useDidUpdateEffect(
        () => {
            setRunId(skip ? -1 : new Date().getTime());
        },
        [skip],
    );

    useEffect(
        () => {
            const { mockResponse } = requestOptionsRef.current;
            if (mockResponse) {
                if (runId < 0 || !isFetchable(extendedUrl, method, body)) {
                    return undefined;
                }

                clientIdRef.current += 1;

                setResponseSafe(mockResponse, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
                setPendingSafe(false, clientIdRef.current);

                const { onSuccess } = requestOptionsRef.current;
                if (onSuccess) {
                    callSideEffectSafe(() => {
                        onSuccess(mockResponse, null);
                    }, clientIdRef.current);
                }
                return undefined;
            }

            if (runId < 0 || !isFetchable(extendedUrl, method, body)) {
                setResponseSafe(undefined, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
                setPendingSafe(false, clientIdRef.current);
                return undefined;
            }

            const {
                preserveResponse,
                delay = 0,
            } = requestOptionsRef.current;

            const previousCache = getCacheRef.current
                ? getCacheRef.current(extendedUrl)
                : undefined;
            if (method === 'GET' && previousCache) {
                setResponseSafe(previousCache, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
            } else if (!preserveResponse) {
                setResponseSafe(undefined, clientIdRef.current);
                setErrorSafe(undefined, clientIdRef.current);
            }

            clientIdRef.current += 1;

            // FIXME: this may need to move up
            setPendingSafe(true, clientIdRef.current);

            const controller = new AbortController();

            fetchResource(
                extendedUrl,
                {
                    ...other,
                    method,
                    // FIXME: here object is explicitly cast as BodyInit
                    body: body as (BodyInit | null | undefined),
                },
                delay,

                transformUrlRef,
                transformOptionsRef,
                transformResponseRef,
                transformErrorRef,
                setCacheRef,
                requestOptionsRef,
                null,

                setPendingSafe,
                setResponseSafe,
                setErrorSafe,
                callSideEffectSafe,

                controller,
                clientIdRef.current,
            );

            return () => {
                controller.abort();
            };
        },
        [
            extendedUrl, method, body, other,
            setPendingSafe, setResponseSafe, setErrorSafe, callSideEffectSafe,
            runId,
        ],
    );

    const retrigger = useCallback(
        () => {
            setRunId(skip ? -1 : new Date().getTime());
        },
        [skip],
    );

    return {
        response,
        pending,
        error,
        retrigger,
    };
}
export default useRequest;
