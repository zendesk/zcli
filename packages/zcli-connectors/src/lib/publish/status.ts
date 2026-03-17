import { request } from '@zendesk/zcli-core'
import type { ProvisioningStatus } from './poller'

export interface ProvisioningStatusResult {
  id: string
  connectorName: string
  version: string
  status: ProvisioningStatus
  reason?: string
}

export async function getProvisioningStatus (connectorName: string): Promise<ProvisioningStatusResult> {
  const endpoint = `/flowstate/connectors/private/${connectorName}/provisioning_status`

  const response = await request.requestAPI(endpoint, {
    method: 'GET'
  })

  if (response.status !== 200) {
    const errorDetails = response.data?.message || response.data?.error || JSON.stringify(response.data)
    throw new Error(`Failed to fetch provisioning status: HTTP ${response.status} - ${errorDetails}`)
  }

  const data = response.data
  return {
    id: data.id,
    connectorName: data.connector_name,
    version: data.version,
    status: data.status as ProvisioningStatus,
    reason: data.reason ?? undefined
  }
}
