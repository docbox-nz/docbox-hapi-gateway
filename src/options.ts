import type { Request, RouteOptions } from '@hapi/hapi';
import type { CreateAxiosDefaults } from 'axios';

export interface DocboxRequestUser {
  /** Internal unique user ID for the user (Specific to your app) */
  id?: string;

  /** Username of the user */
  name?: string;

  /** Some internal field used to identify the profile image of the user */
  imageId?: string;
}

export interface DocboxRequestTenant {
  /** ID of the tenant */
  id: string;

  /** Environment the tenant is within */
  env: string;
}

export interface PluginOptions {
  /**
   * Base URL of the docbox server
   */
  docboxBaseURL: string;

  /**
   * Base path to serve docbox endpoints from. Must begin
   * with a slash
   *
   * Docbox endpoints will be added in a nested /box path
   *
   * @default /
   */
  basePath?: string;

  /**
   * Base set of route options applied to any routes created
   * by docbox
   */
  baseRouteOptions?: RouteOptions;

  /**
   * Base set of route options applied only to forwarding
   * routes created by docbox
   */
  baseForwardRouteOptions?: RouteOptions;

  /**
   * Additional configuration options for axios
   */
  axiosConfig?: CreateAxiosDefaults;

  /**
   * Get a API key for making requests to docbox
   *
   * @returns The key or a promise to the key
   */
  getApiKey?: () => (string | null) | Promise<string | null>;

  /**
   * Write access check, will be invoked to check whether the request
   * has authorization to perform a write action against docbox
   *
   * @param request The HTTP request
   * @param scope The requested docbox scope
   * @param path The requested path
   * @returns Whether the user is allowed to write
   */
  isAllowedWrite(request: Request, scope: string, path: string): Promise<boolean> | boolean;

  /**
   * Read access check, will be invoked to check whether the request
   * has authorization to perform a read action against docbox
   *
   * @param request The HTTP request
   * @param scope The requested docbox scope
   * @param path The requested path
   * @returns Whether the user is allowed to write
   */
  isAllowedRead(request: Request, scope: string, path: string): Promise<boolean> | boolean;

  /**
   * Extract the user details from the provided request
   *
   * @param request The HTTP request
   * @returns The user details if they were obtainable
   */
  getRequestUser?: (
    request: Request
  ) => Promise<DocboxRequestUser | null> | (DocboxRequestUser | null);

  /**
   * Gets the docbox tenant from the request
   *
   * @param request The HTTP request
   * @returns The current tenant
   */
  getRequestTenant(request: Request): Promise<DocboxRequestTenant> | DocboxRequestTenant;
}
