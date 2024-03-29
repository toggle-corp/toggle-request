import { isDefined, isNotDefined, isTruthyString } from '@togglecorp/fujs';

import { UrlParams } from './types';

export function prepareUrlParams(params: UrlParams): string {
    return Object.keys(params)
        .filter((k) => isDefined(params[k]))
        .map((k) => {
            const param = params[k];
            if (isNotDefined(param)) {
                return undefined;
            }
            let val: string;
            if (Array.isArray(param)) {
                val = param.join(',');
            } else if (typeof param === 'number' || typeof param === 'boolean') {
                val = String(param);
            } else {
                val = param;
            }
            return `${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
        })
        .filter(isDefined)
        .join('&');
}

export type Methods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function isFetchable(
    url: string | undefined,
    method: Methods,
    body: RequestInit['body'] | object | undefined,
): url is string {
    return (
        isTruthyString(url)
        && (!['PUT', 'PATCH', 'POST'].includes(method) || isDefined(body))
    );
}

export function resolvePath(
    path: string,
    params: Record<string, string | number | undefined> | undefined,
) {
    if (isNotDefined(path)) {
        return '';
    }

    const resolvedUrl = path.replace(
        /{(\w+)}/g,
        (matchedText, matchedGroup) => {
            const value = params?.[matchedGroup];
            if (isNotDefined(value)) {
                // eslint-disable-next-line no-console
                console.error(`resolveUrlPath: value for key "${matchedGroup}" not provided in ${path}`);
                return matchedText;
            }
            return String(value);
        },
    );

    return resolvedUrl;
}
