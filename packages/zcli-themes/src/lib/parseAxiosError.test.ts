import { expect } from '@oclif/test'
import parseAxiosError from './parseAxiosError'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

describe('parseAxiosError', () => {
  it('extracts message and response from a standard AxiosError', () => {
    const mockResponse: AxiosResponse = {
      status: 400,
      statusText: 'Bad Request',
      data: { errors: [{ code: 'TestError', title: 'Test error' }] },
      headers: {},
      config: {} as InternalAxiosRequestConfig
    }

    const error: AxiosError = {
      message: 'Request failed with status code 400',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: mockResponse,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.message).to.equal('Request failed with status code 400')
    expect(result.response).to.not.equal(undefined)
    expect(result.response?.status).to.equal(400)
    expect(result.response?.data).to.deep.equal({
      errors: [{ code: 'TestError', title: 'Test error' }]
    })
  })

  it('extracts response from error.cause when using fetch adapter', () => {
    const mockResponse: AxiosResponse = {
      status: 400,
      statusText: 'Bad Request',
      data: { errors: [{ code: 'FetchError', title: 'Fetch error' }] },
      headers: {},
      config: {} as InternalAxiosRequestConfig
    }

    const error = {
      message: 'Request failed with status code 400',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: undefined,
      config: {} as InternalAxiosRequestConfig,
      cause: {
        response: mockResponse
      }
    } as unknown as AxiosError

    const result = parseAxiosError(error)

    expect(result.message).to.equal('Request failed with status code 400')
    expect(result.response).to.not.equal(undefined)
    expect(result.response?.status).to.equal(400)
    expect(result.response?.data).to.deep.equal({
      errors: [{ code: 'FetchError', title: 'Fetch error' }]
    })
  })

  it('parses JSON string data from fetch adapter response', () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
      data: '{"errors":[{"code":"JSONError","title":"JSON error"}]}',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    } as AxiosResponse

    const error = {
      message: 'Request failed with status code 400',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: undefined,
      config: {} as InternalAxiosRequestConfig,
      cause: {
        response: mockResponse
      }
    } as unknown as AxiosError

    const result = parseAxiosError(error)

    expect(result.message).to.equal('Request failed with status code 400')
    expect(result.response).to.not.equal(undefined)
    expect(result.response?.data).to.deep.equal({
      errors: [{ code: 'JSONError', title: 'JSON error' }]
    })
  })

  it('handles response with JSON string data directly on response', () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
      data: '{"template_errors":{"home_page":[{"description":"error"}]}}',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    } as AxiosResponse

    const error: AxiosError = {
      message: 'Request failed with status code 400',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: mockResponse,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.response?.data).to.deep.equal({
      template_errors: {
        home_page: [{ description: 'error' }]
      }
    })
  })

  it('keeps string data as-is when it is not JSON', () => {
    const mockResponse = {
      status: 500,
      statusText: 'Internal Server Error',
      data: 'Plain text error message',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    } as AxiosResponse

    const error: AxiosError = {
      message: 'Request failed with status code 500',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: mockResponse,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.response?.data).to.equal('Plain text error message')
  })

  it('keeps string data as-is when JSON parsing fails', () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
      data: '{invalid json}',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    } as AxiosResponse

    const error: AxiosError = {
      message: 'Request failed with status code 400',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: mockResponse,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.response?.data).to.equal('{invalid json}')
  })

  it('returns undefined response when no response exists', () => {
    const error: AxiosError = {
      message: 'Network Error',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: undefined,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.message).to.equal('Network Error')
    expect(result.response === undefined).to.equal(true)
  })

  it('returns undefined response when neither response nor cause.response exists', () => {
    const error = {
      message: 'Network Error',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: undefined,
      config: {} as InternalAxiosRequestConfig,
      cause: {}
    } as unknown as AxiosError

    const result = parseAxiosError(error)

    expect(result.message).to.equal('Network Error')
    expect(result.response === undefined).to.equal(true)
  })

  it('parses JSON string when content-type is application/json', () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
      data: '{"error":"Server error"}',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      config: {} as InternalAxiosRequestConfig
    } as AxiosResponse

    const error: AxiosError = {
      message: 'Request failed',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: mockResponse,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.response?.data).to.deep.equal({ error: 'Server error' })
  })

  it('parses JSON array string data', () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      data: '[{"id":1,"name":"test"}]',
      headers: {},
      config: {} as InternalAxiosRequestConfig
    } as AxiosResponse

    const error: AxiosError = {
      message: 'Request failed',
      name: 'AxiosError',
      isAxiosError: true,
      toJSON: () => ({}),
      response: mockResponse,
      config: {} as InternalAxiosRequestConfig
    }

    const result = parseAxiosError(error)

    expect(result.response?.data).to.deep.equal([{ id: 1, name: 'test' }])
  })
})
