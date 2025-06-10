import { isAxiosError } from 'axios';

/**
 * Create an axios response error interceptor to strip the
 * sensitive internal docbox URL from error responses
 *
 * Also lifts the docbox error messages out of the response
 * body onto the returned error for better HAPI error reporting
 *
 * @param docboxURL URL of the docbox server
 * @returns The request handler
 */
export function createHandleAxiosError(docboxURL: string) {
  return (error: any): any => {
    const expr = new RegExp(escapeRegExp(docboxURL), 'g');

    // Extract error messages from response body up to the error itself
    if (isAxiosError(error)) {
      if (error.response && error.response.data && error.response.data.message) {
        error.message = error.response.data.message;
      }
      if (error.response && error.response.data && error.response.data.reason) {
        error.message = error.response.data.reason;
      }
    }

    // Prevent leaking the docbox API url in error messages
    if (error instanceof Error && error.message.includes(docboxURL)) {
      error.message = error.message.replace(expr, '');
    } else if (typeof error === 'string') {
      error = error.replace(expr, '');
    }

    return Promise.reject(error);
  };
}

/**
 * Escapes any regex characters in the provided string
 *
 * @param string The string to escape
 * @returns The escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
