import type { AxiosError, AxiosResponse } from 'axios'

/**
 * Parses an AxiosError to extract message and response, handling quirks with the fetch adapter.
 *
 * When axios uses adapter: 'fetch', it creates nested errors where:
 * - The actual response is in error.cause.response instead of error.response
 * - The response.data is an unparsed JSON string instead of a parsed object
 *
 * This function normalizes the error structure across different axios configurations.
 *
 * @param error - The AxiosError to parse
 * @returns An object containing the error message and normalized response (if any)
 */
export default function parseAxiosError (error: AxiosError): {
  message: string;
  response: AxiosResponse | undefined;
} {
  let response = error.response

  // Handle axios fetch adapter quirk: response might be in error.cause.response
  interface ErrorWithCause {
    cause?: { response?: AxiosResponse };
  }
  const errorWithCause = error as ErrorWithCause
  if (!response && errorWithCause.cause?.response) {
    response = errorWithCause.cause.response
  }

  // Handle axios fetch adapter quirk: data might be unparsed JSON string
  if (response && typeof response.data === 'string' && response.data.trim().startsWith('{')) {
    try {
      response.data = JSON.parse(response.data)
    } catch (parseError) {
      // Keep as string if parsing fails
    }
  }

  return {
    message: error.message,
    response
  }
}
