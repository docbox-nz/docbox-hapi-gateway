# 📦 @docbox-nz/hapi-gateway

Docbox Gateway implementation for hapi 

Provides routes for forwarding requests to docbox and methods for enforcing access control over said routes

## Requirements
- Hapi.js v20.1.0 or newer
- Node.js 20+

## Installation

To install the gateway use the following command (adjusted for your desired package manager):

```sh
npm i @docbox-nz/hapi-gateway
```

You will also need to ensure that you have `@hapi/hapi` installed this plugin supports versions `^20.1.0 || ^21.0.0`


## Plugin setup

For a simple installation where not much additional logic is required, you can add the following to your server setup

```js
import { DocboxGateway } from "@docbox-nz/hapi-gateway";

server.register({
  plugin: DocboxGateway,
  options: {
    // Prefix all routes with /data
    basePath: '/data',
    // Base request options for docbox routes
    baseRouteOptions: { },
    // URL for the docbox API
    docboxBaseURL: "http://docbox-server",

    // Get the tenant for a request
    getRequestTenant(request) {
      // ..derive your target tenant
      // this can be hard-coded for single tenant setups
      return { id: '81284060-9542-4d66-9731-49ca3eb93bf9', env: "Development"}
    },

    // Get the user for a request
    getRequestUser(request) {
      // ..derive your request user
      return {
        id: "dd5ba8b5-7da2-4e8b-b255-9641faece80e",
        name: "Example User",
        imageId: "https://example.com/example.png"
      }
    },

    // Check request read access
    async isAllowedRead(request, scope, path) {
      // ..assert request is allowed to access scope
      return true;
    },

    // Check request write access
    async isAllowedWrite(request, scope, path) {
      // ..assert request is allowed to access scope
      return true;
    },
  }
});
```

## Custom Routing Setup

If you have a more complex routing setup for your hapi app, you can use the `createDocboxRoutes` function to create a docbox setup and obtain a list of routes that you can manually add using `server.route`

```js
import { createDocboxRoutes } from "@docbox-nz/hapi-gateway";

const routes = createDocboxRoutes({
  // Prefix all routes with /data
  basePath: '/data',
  // Base request options for docbox routes
  baseRouteOptions: { },
  // URL for the docbox API
  docboxBaseURL: "http://docbox-server",

  // Get the tenant for a request
  getRequestTenant(request) {
    // ..derive your target tenant
    // this can be hard-coded for single tenant setups
    return { id: '81284060-9542-4d66-9731-49ca3eb93bf9', env: "Development"}
  },

  // Get the user for a request
  getRequestUser(request) {
    // ..derive your request user
    return {
      id: "dd5ba8b5-7da2-4e8b-b255-9641faece80e",
      name: "Example User",
      imageId: "https://example.com/example.png"
    }
  },

  // Check request read access
  async isAllowedRead(request, scope, path) {
    // ..assert request is allowed to access scope
    return true;
  },

  // Check request write access
  async isAllowedWrite(request, scope, path) {
    // ..assert request is allowed to access scope
    return true;
  },
});

module.exports = routes;
```


## Example access control 

Access control is enforced on a scope level, you should check the `scope` (Document box scope) and decide whether the request should be allowed based 
on some information extracted from the request (or some other available context)

> [!NOTE]
>
> The `isAllowedRead` and `isAllowedWrite` functions can be sync or async, this allows you to perform additional logic such as checking your database for permission requirements
>
> `isAllowedWrite` also enforces the access control for creating new document boxes. Requests to `POST /box` are document box creation requests.

```js

function isAllowedWrite(request, scope, path) {

    // Get authenticated user scopes
    const userScopes = request.auth.credentials.scope

    // User is trying to access the "admin-area" scope
    if (scope === "admin-area") {

        // Ensure the user has the required admin scope
        if (userScopes.includes('admin')) {
            return true;
        }

    }

    // Deny by default
    return false;
} 

```
