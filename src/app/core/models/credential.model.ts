/** A WakaTime OAuth access token, sent as `Authorization: Bearer <token>`. */
export interface StoredWakaTimeCredential {
  token: string;
  savedAt: string;
}

export interface WakaTimeCredentialInput {
  token: string;
}
