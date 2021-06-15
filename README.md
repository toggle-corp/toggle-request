# Toggle Request

A simple request library using react hooks

## Features

- Typesafe
- Lightweight

### Installation

```bash
npm install @togglecorp/toggle-request
// or
yarn install @togglecorp/toggle-request
```

## API

The request library exposes two react hooks to execute a request.

1. useRequest
2. useLazyRequest

### useRequest

`useRequest` will immediately execute the request when your component renders
and returns the result that can be used to render the UI.

```typescript
// Example usage

const {
    response,
    pending,
    error,
} = useRequest({
    url: `/projects/${id}/`,
    query: {
        limit: 12,
        offset: 1,
    },
    method: 'GET',
    skip: !id,
    onSuccess: (response) => {
        // NOTE: response from the server
        console.info(`Fetched ${response.total} items from server`);
    }
    onFailure: () => {
        console.error('Could not fetch items');
    }
})
```

The request options for useRequest are listed below:

|options|description|
|----|----|
|url|The request url (excluding url query)|
|query|The query part of the url as object|
|body|The request body|
|method|The request method|
|other|The request object accepted by fetch excluding body and method|
|onSuccess|Callback called when a request has completed successfully|
|onFailure|Callback called when a request has failed|
|skip|Can be used to skip calling the request|
|delay|Can be used to delay calling a request (in milliseconds)|
|shouldRetry|Can be used to retry a request. This method should return time after which request should be retried.|
|shouldPoll|Can be used to poll a request. This method should return time to poll the request.|
|mockResponse|Can be use to define a mock response|
|preserveResponse|Can be used to persist previous response until new response has arrived|

The result for useRequest are listed below:

|property|description|
|----|----|
|response|The response from server after the request completes|
|pending|The request status|
|error|The error from server after the request errors|
|retrigger|Used to re-execute the request|

### useLazyRequest

`useLazyRequest` will only execute the request once user calls the trigger
function. When triggering the request, user can define a `context` value which
can be used to define request options: url, query, body, method and other.
If there is no `context` value, user should trigger the request passing `null`
value.

```typescript
// Example usage

const {
    response,
    pending,
    error,
    trigger,
} = useRequest({
    method: 'PUT',
    url: (ctx) => `/projects/${ctx.id}/`,
    body: (ctx) => ctx.body,
    onSuccess: (response) => {
        // NOTE: response from the server
        console.info(`Updated item ${response.name}`);
    }
    onFailure: () => {
        console.error('Could not update item');
    }
})

const handleSave = useCallback(
    (id, body) => {
        trigger({
            id,
            body,
        });
    },
    [trigger],
);
```


The request options for useLazyRequest are listed below:

|options|description|
|----|----|
|url|The request url (can be a function)|
|query|The query part of the url as object (can be a function)|
|body|The request body (can be a function)|
|method|The request method (can be a function)|
|other|The request object accepted by fetch excluding body and method (can be a function)|
|onSuccess|Callback called when a request has completed successfully|
|onFailure|Callback called when a request has failed|
|delay|Can be used to delay calling a request (in milliseconds)|
|shouldRetry|Can be used to retry a request. This method should return time after which request should be retried.|
|shouldPoll|Can be used to poll a request. This method should return time to poll the request.|
|mockResponse|Can be use to define a mock response|
|preserveResponse|Can be used to persist previous response until new response has arrived|

The result for useLazyRequest are listed below:

|property|description|
|----|----|
|response|The response from server after the request completes|
|pending|The request status|
|error|The error from server after the request errors|
|context|The context of the last request|
|trigger|Used to re-execute the request. The function accepts one argument to define the request context|

### RequestContext

The RequestContext uses React Context API to define configurations available
throughout all the child components.
The context defines transformer functions to transform request url, request
option, response and error.

```typescript
const requestContextValue = {
    transformUrl: transformProjectUrls,
    transformOptions: transformProjectOptions,
    transformResponse: transformProjectResponse,
    transformError: transformProjectError,
};

return (
    <RequestContext.Provider value={requestContextValue}>
        <ProjectApp />
    </RequestContext.Provider>
)
```

|properties|description|
|----|----|
|transformUrl|Function to transform every url before request is executed|
|transformOptions|Function to transform every request options before request is executed|
|transformResponse|Function to transform every response after a successful response is received|
|transformError|Function to transform every response after a failure response is received|

### Partially defining types

```typescript
import { Error, OptionBase } from './my-project-typings';

// eslint-disable-next-line
const useMyLazyRequest: <R, C = null>(requestOptions: LazyRequestOptions<R, Error, C, OptionBase>) => {
    response: R | undefined;
    pending: boolean;
    error: Error | undefined;
    trigger: (ctx: C) => void;
    context: C | undefined,
} = useMyLazyRequest;

const useMyRequest: <R>(requestOptions: RequestOptions<R, Error, OptionBase>) => {
    response: R | undefined;
    pending: boolean;
    error: Error | undefined;
    retrigger: () => void;
} = useMyRequest;
```

In the example above:
- OptionBase defines extra property passed to request hooks, that are available
  on transformer functions.
- Error defines the error type received from the server


### Detailed API

Unfortunately, there is no detailed api documentation yet. Please refer to the
source code.

## Development

### Running locally

```bash
# Install dependencies
yarn install

# Build
yarn build
```

### Linting

```bash
# Eslint
yarn lint

# Typescript
yarn typecheck
```
