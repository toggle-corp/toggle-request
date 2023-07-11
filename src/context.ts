import { createContext } from 'react';

export interface ContextInterface<R, RE, E, O> {
    transformUrl: (
        url: string,
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => string;
    transformOptions: (
        url: string,
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => RequestInit;
    transformResponse: (
        res: Response,
        url: string,
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => R | RE;
    transformError: (
        res: RE | 'parse' | 'network',
        url: string,
        options: Omit<RequestInit, 'body'> & { body?: RequestInit['body'] | object | undefined },
        requestOptions: O,
    ) => E;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCache?: (key: string) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCache?: (key: string, value: any) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    transformResponse: (res) => res,
    transformError: (res) => res,
    getCache: () => undefined,
    setCache: () => {
        // eslint-disable-next-line no-console
        console.warn('Trying to set cache');
    },
};

const RequestContext = createContext(defaultContext);
export default RequestContext;
