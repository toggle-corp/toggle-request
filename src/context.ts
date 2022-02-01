import { createContext } from 'react';

export interface ContextInterface<R, RE, E, O> {
    transformUrl: (
        url: string,
        // eslint-disable-next-line @typescript-eslint/ban-types
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => string;
    transformOptions: (
        url: string,
        // eslint-disable-next-line @typescript-eslint/ban-types
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => RequestInit;
    transformResponse: (
        res: Response,
        url: string,
        // eslint-disable-next-line @typescript-eslint/ban-types
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => [R | RE, boolean];
    transformError: (
        res: RE | 'parse' | 'network',
        url: string,
        // eslint-disable-next-line @typescript-eslint/ban-types
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => E;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCache?: (key: string) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCache?: (key: string, value: any) => void;
}

const defaultContext: ContextInterface<any, any, any, any> = {
    transformUrl: (url) => url,
    transformOptions: (_, { body, ...otherOptions }) => ({
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
        ...otherOptions,
    }),
    transformResponse: (res) => [res, false],
    transformError: (res) => res,
    getCache: () => undefined,
    setCache: () => {
        console.warn('Trying to set cache');
    },
};

const RequestContext = createContext(defaultContext);
export default RequestContext;
