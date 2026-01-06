export type AnnounceMode = "polite" | "assertive";

export interface AnnouncePayload {
  message: string;
  mode?: AnnounceMode;
}
