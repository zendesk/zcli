export interface ConfigParameters {
  [parameterKey: string]: string | number | boolean;
}

export interface ZcliConfigFileContent {
    connection_id?: string;
    parameters?: ConfigParameters;
}

export type Dictionary<T> = {
    [key: string]: T;
}

export interface FileList {
    name: string;
    time: number;
}

export interface FsExtraError extends Error {
    code: string;
}
