export interface ZcliConfigFileContent {
    zat_latest?: string;
    zat_update_check?: string;
    plan?: string;
    app_id?: string;
    parameters?: ConfigParameters;
}

export type Dictionary<T> = {
    [key: string]: T;
}

// Begin AppJSON definitions
export interface AppLocation {
  [appLocation: string]: string;
}

export interface IconLocationWhitelist {
  [product: string]: Array<string>;
}

export interface Location {
  [product: string]: AppLocation;
}

export interface FileList {
    name: string;
    time: number;
}

export interface Manifest {
    name?: string;
    author: Author;
    defaultLocale: string;
    private?: boolean;
    location: Location;
    version?: string;
    frameworkVersion: string;
    singleInstall?: boolean;
    signedUrls?: boolean;
    parameters?: ManifestParameter[];
}

export interface LocationIcons {
  [product: string]: ProductLocationIcons;
}

export interface ProductLocationIcons {
  [appLocation: string]: {
    [fileType: string]: string;
  };
}

export interface App {
    asset_url_prefix: string;
    location_icons: LocationIcons;
    id: string;
    name?: string;
    default_locale: string;
    private?: boolean;
    location: Location;
    version?: string;
    framework_version: string;
    single_install?: boolean;
    signed_urls?: boolean;
    parameters?: ManifestParameter[];
}

export interface AppPayload {
    name: string;
    id: string;
    default_locale: string;
    private: boolean;
    location: Location;
    location_icons: LocationIcons;
    version: string;
    framework_version: string;
    asset_url_prefix: number;
    signed_urls: boolean;
    single_install: boolean;
}

export interface Settings {
    title?: string;
}

export interface Installation {
    app_id: string;
    name?: string;
    collapsible: boolean;
    enabled: boolean;
    id: string;
    plan?: string;
    requirements: {};
    settings: Settings;
    updated_at: string;
}

export interface ConfigParameters {
  [parameterKey: string]: string | number | boolean;
}

export interface ManifestParameter {
    name: string;
    type: string;
    secure: boolean;
}

export interface AppJSONPayload {
    apps: AppPayload[];
    installations: Installation[];
}

export interface AppJSON {
    apps: App[];
    installations: Installation[];
}

export interface Author {
    name: string;
    email: string;
    url?: string;
}

export interface AppManifest {
    name?: string;
    author: Author;
    default_locale: string;
    private?: boolean;
    location: Location;
    version?: string;
    framework_version: string;
}

// End AppJSON definitions

export interface Scaffolds {
  [name: string]: string;
}

export interface ManifestPath {
  [name: string]: string;
}

export interface Installations{
  installations: Installation[];
}
