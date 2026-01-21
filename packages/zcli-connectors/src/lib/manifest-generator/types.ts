// Simplified connector interface based on ManifestConfig from core package
export interface ConnectorConfig {
  name: string;
  title: string;
  description: string;
  author: string;
  version: string;
  default_locale: string;
  platform_version: string;
  metadata?: {
    connection_type: string;
  };
}

export interface ManifestData {
  name: string;
  title: string;
  description: string;
  author?: string;
  version: string;
  platform_version: string;
  default_locale: string;
  metadata?: {
    connection_type: string;
  };
}

export interface ManifestGeneratorOptions {
  outputPath: string;
}
