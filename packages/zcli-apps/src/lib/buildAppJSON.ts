import {
  App,
  AppJSONPayload,
  AppJSON,
  AppLocation,
  ConfigParameters,
  IconLocationWhitelist,
  Installation,
  InstallationOrder,
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
import { promptAndGetSettings } from '../utils/createApp'
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

  const promptSettings = paramsNotInConfig ? await promptAndGetSettings(paramsNotInConfig, manifest.name) : {}
  return { ...configSettings, ...promptSettings }
}

// returns an installationOrder of the form
// {
//   "support": {
//     "ticket_sidebar": [123, 456]
//   }
// }
export const generateInstallationOrder = (location: Location, installationId: string): InstallationOrder => {
  // Note that location is of the form { "support": { "ticket_sidebar": "iframe.html" } }.  We don't want
  // iframe.html here, so we should throw that information away and replace it with an array consisting of
  // [ installationId ].
  const product = Object.keys(location)[0]
  const appLocation = Object.keys(location[product])[0]
  const installationLocation = { [product]: { [appLocation]: [installationId] } }
  return installationLocation
}

// takes the existing InstallationOrder on appJSON of the form
// {
//   "support": {
//     "ticket_sidebar": [123],
//     "nav_bar": [456, 789]
//   },
//   "chat": {
//     "chat_sidebar": [278, 987]
//   }
// }
// and a singleton InstallationOrder of the form
// {
//   "sell": {
//     "dashboard": [777]
//   }
// }
// and merges the two together to create a new InstallationOrder object.
export const mergeInstallationOrder = (currentInstallationOrder: InstallationOrder, newInstallationOrderSingleton: InstallationOrder): InstallationOrder => {
  for (const product in newInstallationOrderSingleton) {
    if (currentInstallationOrder[product] === undefined) {
      currentInstallationOrder[product] = newInstallationOrderSingleton[product]
    } else {
      for (const appLocation in currentInstallationOrder[product]) {
        if (newInstallationOrderSingleton[product][appLocation] && (currentInstallationOrder[product][appLocation] !== newInstallationOrderSingleton[product][appLocation])) {
          currentInstallationOrder[product][appLocation] = currentInstallationOrder[product][appLocation].concat(newInstallationOrderSingleton[product][appLocation])
        }
      }
      for (const appLocation in newInstallationOrderSingleton[product]) {
        if (currentInstallationOrder[product][appLocation] !== newInstallationOrderSingleton[product][appLocation]) {
          currentInstallationOrder[product][appLocation] = newInstallationOrderSingleton[product][appLocation]
        }
      }
    }
  }
  return currentInstallationOrder
}

export const buildAppJSON = async (appPaths: string[], port: number, configFileName: string): Promise<AppJSONPayload> => {
  const appJSON: AppJSON = { apps: [], installations: [], installation_orders: {} }

  for (const appPath of appPaths) {
    validateAppPath(appPath)
    const manifest = getManifestFile(appPath)
    const zcliConfigFile = getAllConfigs(appPath, configFileName) || {}

    const appId = zcliConfigFile.app_id?.toString() || uuidV4()
    const configParams = zcliConfigFile.parameters || {} // if there are no parameters in the config, just attach an empty object

    const appSettings = await getAppSettings(manifest, configParams)

    const locationIcons = getLocationIcons(appPath, manifest.location)
    const app = getAppPayloadFromManifest(manifest, port, appId, locationIcons)
    const installation = getInstallation(appId, app, zcliConfigFile, appSettings)
    const installationOrder = generateInstallationOrder(manifest.location, installation.id)

    appJSON.apps.push(app)
    appJSON.installations.push(installation)
    appJSON.installation_orders = mergeInstallationOrder(appJSON.installation_orders, installationOrder)
  }

  return (appJSON as unknown) as AppJSONPayload
}
