
// Profiles and Cred Store definitions
export type Credential = { account: string; password: string }

export interface KeyTar {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
  findPassword: (service: string) => Promise<string | null>;
  findCredentials: (service: string) => Promise<Array<Credential>>;
}

export interface Profile { subdomain: string }

// End profiles and Cred Store definitions
