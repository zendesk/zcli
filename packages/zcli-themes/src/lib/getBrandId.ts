import type { Brand } from '../types'
import { request } from '@zendesk/zcli-core'
import * as inquirer from 'inquirer'

export default async function getBrandId (): Promise<string> {
  const { data: { brands } } = await request.requestAPI('/api/v2/brands.json')
  if (brands.length === 1) return brands[0].id

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
}
