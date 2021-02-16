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
  ProductLocationIcons,
  ZcliConfigFileContent,
  Dictionary
} from '../types'
import * as path from 'path'
import * as fs from 'fs'
import { uuidV4 } from '../utils/uuid'
import { getManifestFile } from '../utils/manifest'
import { getAllConfigs } from '../utils/appConfig'
import { getAppSettings } from '../utils/getAppSettings'
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
  const installationId = configFileContents.installation_id || uuidV4()

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

export const buildAppJSON = async (appPaths: string[], port: number): Promise<AppJSONPayload> => {
  const appJSON: AppJSON = { apps: [], installations: [] }

  for (const appPath of appPaths) {
    validateAppPath(appPath)
    const manifest = getManifestFile(appPath)
    const zcliConfigFile = getAllConfigs(appPath) || {}

    const appId = zcliConfigFile.app_id?.toString() || uuidV4()
    const configParams = zcliConfigFile.parameters || {} // if there are no parameters in the config, just attach an empty object

    const appSettings = await getAppSettings(manifest, configParams)

    const locationIcons = getLocationIcons(appPath, manifest.location)
    const app = getAppPayloadFromManifest(manifest, port, appId, locationIcons)
    const installation = getInstallation(appId, app, zcliConfigFile, appSettings)

    appJSON.apps.push(app)
    appJSON.installations.push(installation)
  }

  return (appJSON as unknown) as AppJSONPayload
}
