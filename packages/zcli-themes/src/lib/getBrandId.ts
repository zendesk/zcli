import { error } from '@oclif/core/lib/errors'
import type { Brand } from '../types'
import { request } from '@zendesk/zcli-core'
import * as inquirer from 'inquirer'

export default async function getBrandId (): Promise<string> {
  try {
    const { data: { brands } } = await request.requestAPI('/api/v2/brands.json', {
      validateStatus: (status: number) => status === 200
    })

    if (brands.length === 1) {
      return brands[0].id.toString()
    }

    const { brandId } = await inquirer.prompt({
      type: 'list',
      name: 'brandId',
      message: 'What brand should the theme be imported to?',
      choices: brands.map((brand: Brand) => ({
        name: brand.name,
        value: brand.id.toString()
      }))
    })

    return brandId
  } catch {
    error('Failed to retrieve brands')
  }
}
