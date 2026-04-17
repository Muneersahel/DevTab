export type WakaTimeCredentialType = 'apiKey' | 'bearerToken';

export interface StoredWakaTimeCredential {
  type: WakaTimeCredentialType;
  token: string;
  savedAt: string;
}

export interface WakaTimeCredentialInput {
  type: WakaTimeCredentialType;
  token: string;
}
