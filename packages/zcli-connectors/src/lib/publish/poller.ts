import { request } from '@zendesk/zcli-core'

export type ProvisioningStatus = 'PENDING_UPLOAD' | 'PENDING_VALIDATION' | 'SUCCESS' | 'FAILED' | 'ABORTED'

interface ProvisioningStatusResponse {
  status: ProvisioningStatus
  reason?: string
}

export interface ProvisioningResult {
  status: ProvisioningStatus
  reason?: string
}

const POLLING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const MAX_HTTP_RETRIES = 3
const BASE_RETRY_DELAY_MS = 5000 // 5 seconds base delay

/**
 * Validates if the given status is a valid ProvisioningStatus
 * @param status - The status to validate
 * @returns True if the status is valid
 */
function isValidProvisioningStatus (status: any): status is ProvisioningStatus {
  const validStatuses: ProvisioningStatus[] = ['PENDING_UPLOAD', 'PENDING_VALIDATION', 'SUCCESS', 'FAILED', 'ABORTED']
  return typeof status === 'string' && validStatuses.includes(status as ProvisioningStatus)
}

/**
 * Make an HTTP request with retry logic and exponential backoff
 * @param endpoint - The API endpoint to call
 * @returns Promise that resolves with the HTTP response
 */
async function makeRequestWithRetry (endpoint: string): Promise<any> {
  let httpRetryCount = 0

  while (httpRetryCount <= MAX_HTTP_RETRIES) {
    const response = await request.requestAPI(endpoint, {
      method: 'GET'
    })

    if (response.status === 200) {
      return response
    }

    httpRetryCount++
    if (httpRetryCount > MAX_HTTP_RETRIES) {
      const errorDetails = response.data?.message || response.data?.error || JSON.stringify(response.data)
      throw new Error(`HTTP ${response.status}: ${errorDetails}`)
    }

    // Exponential backoff: 5s, 10s, 20s for retries 1, 2, 3
    const backoffDelay = BASE_RETRY_DELAY_MS * Math.pow(2, httpRetryCount - 1)
    await new Promise(resolve => setTimeout(resolve, backoffDelay))
  }
}

/**
 * Get an adaptive polling interval that starts fast and backs off over time.
 * Polls frequently at first for responsiveness, then less often to reduce load.
 *
 * @param startTime - The timestamp when polling started (Date.now())
 * @returns The polling interval in milliseconds
 */
export function getAdaptivePollIntervalMs (startTime: number): number {
  const timeElapsed = Date.now() - startTime
  switch (true) {
  case timeElapsed < 60000:
    // every 5s for first 1min
    return 5000
  case timeElapsed < 300000:
    // every 30s for 1min-5min
    return 30000
  default:
    // every 1min for 5min+
    return 60000
  }
}

/**
 * Poll the provisioning status of a connector
 * @param connectorName - The name of the connector
 * @param jobId - The job ID returned from createConnector
 * @returns Promise that resolves when status is final (SUCCESS, FAILED, or ABORTED)
 */
export async function pollProvisioningStatus (
  connectorName: string,
  jobId: string
): Promise<ProvisioningResult> {
  const startTime = Date.now()
  const endpoint = `/flowstate/connectors/private/${connectorName}/provisioning_status/${jobId}`

  while (true) {
    const timeElapsed = Date.now() - startTime
    if (timeElapsed >= POLLING_TIMEOUT_MS) {
      throw new Error(`Provisioning status polling timed out after ${POLLING_TIMEOUT_MS / (60 * 1000)} minutes`)
    }

    try {
      const response = await makeRequestWithRetry(endpoint)
      const statusResponse: ProvisioningStatusResponse = response.data
      const status = statusResponse.status

      if (!isValidProvisioningStatus(status)) {
        throw new Error(`Received unexpected provisioning status: '${status}'. Expected one of: PENDING_UPLOAD, PENDING_VALIDATION, SUCCESS, FAILED, ABORTED`)
      }

      if (status === 'SUCCESS' || status === 'FAILED' || status === 'ABORTED') {
        return { status, reason: statusResponse.reason }
      }

      const pollInterval = getAdaptivePollIntervalMs(startTime)
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    } catch (error) {
      if (error instanceof Error && error.message.includes('polling timed out')) {
        throw new Error(`Provisioning status polling timed out after ${POLLING_TIMEOUT_MS / (60 * 1000)} minutes`)
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      throw new Error(`Failed to check provisioning status: ${errorMessage}`)
    }
  }
}
