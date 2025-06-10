import { badRequest, forbidden } from '@hapi/boom';
import type { Plugin, Request, ResponseToolkit, RouteOptions, ServerRoute } from '@hapi/hapi';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { createHandleAxiosError } from './error';
import type { DocboxRequestTenant, DocboxRequestUser, PluginOptions } from './options';

const DEFAULT_BASE_PATH: string = '/';

export const DocboxGateway: Plugin<PluginOptions> = {
  name: '@docbox-nz/hapi-gateway',
  version: '0.1.0',
  register: function (server, options) {
    const routes = createDocboxRoutes(options);
    for (const route of routes) {
      server.route(route);
    }
  },
};

export function createDocboxRoutes(options: PluginOptions) {
  let basePath = options.basePath ?? DEFAULT_BASE_PATH;

  // Remove trailing slashes from base path
  if (basePath.endsWith('/')) basePath = basePath.substring(0, basePath.length - 1);

  const baseRouteOptions: RouteOptions = options.baseRouteOptions ?? {};
  const baseForwardRouteOptions: RouteOptions = options.baseForwardRouteOptions ?? {};

  // Axios instance to perform connections
  const axiosInstance = axios.create({
    ...options.axiosConfig,
    baseURL: options.docboxBaseURL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Add interceptor to handle axios errors
  axiosInstance.interceptors.response.use(
    (res) => res,
    createHandleAxiosError(options.docboxBaseURL)
  );

  const getRequestUser: PluginOptions['getRequestUser'] = options.getRequestUser ?? (() => null);

  // Base route for creating document boxes
  const createBoxRoute: ServerRoute = {
    path: `${basePath}/box`,
    method: 'POST',
    handler: async function (request, h) {
      const payload = request.payload;
      if (typeof payload !== 'object') {
        return badRequest('request payload must be an object');
      }

      const scope = (payload as any).scope;
      if (scope === undefined || typeof scope !== 'string') {
        return badRequest('scope must be defined and a string');
      }

      const path = request.path.substring(basePath.length);
      const isAllowed = await options.isAllowedWrite(request, scope, path);
      if (!isAllowed) {
        return forbidden("you don't have permission to access this resource");
      }

      const tenant = await options.getRequestTenant(request);
      const user = await getRequestUser(request);
      return forwardRequest(axiosInstance, request, tenant, user, h, path);
    },
    options: baseRouteOptions,
  };

  // Docbox read forwarding endpoint
  const forwardReadRoute: ServerRoute = {
    path: `${basePath}/box/{scope}/{path*}`,
    method: ['GET'],
    handler: async function (request, h) {
      const scope = request.params.scope;
      if (scope === undefined || typeof scope !== 'string') {
        return badRequest('scope must be defined and a string');
      }

      const path = request.path.substring(basePath.length);
      const isAllowed = await options.isAllowedRead(request, scope, path);
      if (!isAllowed) {
        return forbidden("you don't have permission to access this resource");
      }

      const tenant = await options.getRequestTenant(request);
      const user = await getRequestUser(request);
      return forwardRequest(axiosInstance, request, tenant, user, h, path);
    },
    options: { ...baseRouteOptions, ...baseForwardRouteOptions },
  };

  // Docbox write forwarding endpoint
  const forwardWriteRoute: ServerRoute = {
    path: `${basePath}/box/{scope}/{path*}`,
    method: ['POST', 'PATCH', 'PUT', 'DELETE'],
    handler: async function (request, h) {
      const scope = request.params.scope;
      if (scope === undefined || typeof scope !== 'string') {
        return badRequest('scope must be defined and a string');
      }

      const path = request.path.substring(basePath.length);

      // Searching uses the POST method but only requires read access
      const isWriting = isWriteRequest(request, path);

      const accessHandler = isWriting ? options.isAllowedWrite : options.isAllowedRead;

      const isAllowed = await accessHandler(request, scope, path);
      if (!isAllowed) {
        return forbidden("you don't have permission to access this resource");
      }

      const tenant = await options.getRequestTenant(request);
      const user = await getRequestUser(request);
      return forwardRequest(axiosInstance, request, tenant, user, h, path);
    },
    options: {
      ...baseRouteOptions,
      ...baseForwardRouteOptions,
      payload: {
        ...baseRouteOptions.payload,
        ...baseForwardRouteOptions.payload,

        // Payload must not be parsed so that files are properly sent to
        // the docbox server
        parse: false,

        // Ensure we get our data as full buffers to forward onward, not
        // preprocessed by HAPI
        output: 'data',
      },
    },
  };

  return [createBoxRoute, forwardReadRoute, forwardWriteRoute];
}

/**
 * Additional check for write endpoints to see if the
 * request is actually a write, as some endpoints such
 * as search use the POST method
 *
 * @param request The HTTP request
 * @param path The request path
 * @returns Whether the request is a write request
 */
function isWriteRequest(request: Request, path: string) {
  if (request.method === 'post') {
    const parts = path.substring(1).split('/');

    // Request is a search request (/box/{scope}/search)
    if (parts.length === 3 && parts[0] === 'box' && parts[2] === 'search') {
      return false;
    }

    // Request is a file search request (/box/{scope}/file/{file_id}/search)
    if (parts.length === 5 && parts[0] === 'box' && parts[2] === 'file' && parts[4] === 'search') {
      return false;
    }
  }

  return true;
}

/**
 * Forwards the provided request onto the docbox server
 *
 * @param axios Axios instance to forward the request through
 * @param request The request itself
 * @param user User performing the request
 * @param h Response toolkit for creating the response
 * @param path Path requested from the server
 */
async function forwardRequest(
  axios: AxiosInstance,
  request: Request,
  tenant: DocboxRequestTenant,
  user: DocboxRequestUser | null,
  h: ResponseToolkit,
  path: string
) {
  const userHeaders: Record<string, any> = request.headers;
  const forwardHeaders: Record<string, any> = {};

  // Forward content related headers
  if (userHeaders['accept'] !== undefined) {
    forwardHeaders['accept'] = userHeaders['accept'];
  }

  if (userHeaders['content-type'] !== undefined) {
    forwardHeaders['content-type'] = userHeaders['content-type'];
  }

  if (userHeaders['content-length'] !== undefined) {
    forwardHeaders['content-length'] = userHeaders['content-length'];
  }

  // Set tenant headers
  forwardHeaders['x-tenant-env'] = tenant.env;
  forwardHeaders['x-tenant-id'] = tenant.id;

  // Set user headers
  if (user !== null && user.id !== undefined) {
    forwardHeaders['x-user-id'] = encodeURIComponent(user.id);

    if (user.name) {
      forwardHeaders['x-user-name'] = encodeURIComponent(user.name);
    }

    if (user.imageId) {
      forwardHeaders['x-user-image-id'] = encodeURIComponent(user.imageId);
    }
  }

  // Forward the request to docbox
  const docboxResponse = await axios.request({
    method: request.method.toUpperCase(),
    url: path,
    headers: forwardHeaders,
    data: request.payload,
    params: request.query,
    responseType: 'stream',
    // Don't throw if the status code is not an 2xx status code
    // (we pass error statuses onto the consumer)
    validateStatus: () => true,
  });

  let response = h.response(docboxResponse.data).code(docboxResponse.status);

  // Set the response headers
  Object.entries(docboxResponse.headers).forEach(
    ([name, value]) => (response = response.header(name, value))
  );

  return response;
}
