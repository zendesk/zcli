import {
  App,
  AppJSONPayload,
  AppJSON,
  AppLocation,
  ConfigParameters,
  IconLocationWhitelist,
  Installation,
  Location,
  LocationIcons,
  Manifest,
  ManifestParameter,
  ProductLocationIcons,
  ZcliConfigFileContent
} from '../types'
import * as path from 'path'
import * as fs from 'fs'
import { uuidV4 } from '../utils/uuid'
import { getManifestFile } from '../utils/manifest'
import { getAllConfigs } from '../utils/appConfig'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/errors'
import { validateAppPath } from './appPath'

// The SVGs here are in the top bar or nav bar locations. Chat don’t have these locations thus not here.
const ICON_LOCATION_WHITELIST: IconLocationWhitelist = {
  support: ['top_bar', 'nav_bar', 'system_top_bar', 'ticket_editor'],
  sell: ['top_bar']
}

export const getAppAssetsURLPrefix = (port: number, appID: string) => `http://localhost:${port}/${appID}/assets/`

const isMultiProductApp = (location: Location): boolean => {
  return Object.keys(location).length > 1
}

export const getIconsByProduct = (product: string, locations: AppLocation, manifestLocations: Location, appPath: string) => Object
  .entries(locations)
  .filter(([location]) => ICON_LOCATION_WHITELIST[product] && ICON_LOCATION_WHITELIST[product].includes(location))
  .reduce((productLocationIcons: ProductLocationIcons, [location]) => {
    const svgPath = isMultiProductApp(manifestLocations) ? `${product}/icon_${location}.svg` : `icon_${location}.svg`
    if (fs.existsSync(path.join(appPath, 'assets', svgPath))) productLocationIcons[location] = { svg: svgPath }
    return productLocationIcons
  }, {})

export const getLocationIcons = (appPath: string, manifestLocations: Location): LocationIcons => {
  return Object
    .entries(manifestLocations)
    .reduce((locationIcons: LocationIcons, [product, locations]) => {
      locationIcons[product] = getIconsByProduct(product, locations, manifestLocations, appPath)
      return locationIcons
    }, {})
}

export const getInstallation = (appId: string, app: App, configFileContents: ZcliConfigFileContent, appSettings: ConfigParameters): Installation => {
  const installationId = uuidV4()
  return {
    app_id: appId,
    name: app.name,
    collapsible: true,
    enabled: true,
    id: installationId,
    plan: configFileContents.plan,
    requirements: {},
    settings: {
      ...appSettings,
      title: app.name
    },
    updated_at: new Date().toISOString()
  }
}

export const getAppPayloadFromManifest = (appManifest: Manifest, port: number, appID: string, locationIcons: LocationIcons): App => {
  return {
    name: appManifest.name,
    id: appID,
    default_locale: appManifest.defaultLocale,
    location: appManifest.location,
    location_icons: locationIcons,
    asset_url_prefix: getAppAssetsURLPrefix(port, appID),
    single_install: appManifest.singleInstall,
    signed_urls: appManifest.signedUrls,
    version: appManifest.version,
    framework_version: appManifest.frameworkVersion
  }
}

export const getUnsetParameters = (configParams: ConfigParameters, manifestParams: Array<ManifestParameter>): Array<string> => {
  const unsetParameters: string[] = []

  const configParamNames = Object.keys(configParams)
  return manifestParams
    .reduce((unsetParams, manifestParam) => {
      if (!configParamNames.includes(manifestParam.name)) {
        unsetParams.push(manifestParam.name)
      }
      return unsetParams
    }, unsetParameters)
}

export const warnMissingParamsValues = (configParams: ConfigParameters, manifestParams: Array<ManifestParameter>, appId: string): void => {
  const unsetParameters = getUnsetParameters(configParams, manifestParams)
  unsetParameters
    .map(unsetParameter => {
      throw new CLIError(chalk.red(`Your zcli configuration file is missing a setting: ${unsetParameter}, for app: ${appId}`))
    })
}

export const getAppSettings = (configParams: ConfigParameters, manifestParams: Array<ManifestParameter>): ConfigParameters => {
  const allowedKeys = manifestParams.map(param => param.name)
  return allowedKeys
    .reduce((appSettings, key) => {
      return { ...appSettings, [key]: configParams[key] }
    }, {})
}

export const buildAppJSON = (appPaths: string[], port: number, configFileName: string): AppJSONPayload => {
  const appJSONStructure: AppJSON = { apps: [], installations: [] }
  let appSettings: ConfigParameters

  const appJSON = appPaths
    .map(appPath => {
      validateAppPath(appPath)
      const manifest = getManifestFile(appPath)
      const zcliConfigFile = getAllConfigs(appPath, configFileName) || {}

      const appId = zcliConfigFile.app_id?.toString() || uuidV4()
      const configParams = zcliConfigFile.parameters || {} // if there are no parameters in the config, just attach an empty object
      const manifestParams = manifest.parameters

      if (manifestParams && manifestParams.length) {
        warnMissingParamsValues(configParams, manifestParams, appId)
        appSettings = getAppSettings(configParams, manifestParams)
      }

      const locationIcons = getLocationIcons(appPath, manifest.location)
      const app = getAppPayloadFromManifest(manifest, port, appId, locationIcons)
      const installation = getInstallation(appId, app, zcliConfigFile, appSettings)

      return {
        app,
        installation
      }
    })
    .reduce((result, current) => {
      result.apps.push(current.app)
      result.installations.push(current.installation)

      return result
    }, appJSONStructure)

  return (appJSON as unknown) as AppJSONPayload
}
