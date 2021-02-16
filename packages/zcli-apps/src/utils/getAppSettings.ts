import { Manifest, ConfigParameters, Dictionary } from '../types'
import { promptAndGetSettings } from './createApp'

export const getAppSettings = async (manifest: Manifest, configParams: ConfigParameters) => {
  if (!manifest.parameters) return {}
  const configContainsParam = (paramName: string) => Object.keys(configParams).includes(paramName)

  const paramsNotInConfig = manifest.parameters.filter(param => !configContainsParam(param.name))
  const configSettings = manifest.parameters.reduce((result: Dictionary<string>, param) => {
    if (configContainsParam(param.name)) {
      result[param.name] = configParams[param.name] as string
    }
    return result
  }, {})

  const promptSettings = paramsNotInConfig ? await promptAndGetSettings(paramsNotInConfig, manifest.name, false) : {}
  return { ...configSettings, ...promptSettings }
}