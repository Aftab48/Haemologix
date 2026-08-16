/**
 * Donor accept/decline links carry `${donorId}-${requestId}-${timestamp}`.
 * The ids are UUIDs (which contain dashes), so a naive split("-") can never
 * parse them; match two UUIDs + a numeric timestamp, with a legacy fallback.
 */
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const UUID_TOKEN = new RegExp(`^(${UUID})-(${UUID})-(\\d+)$`);

export function buildResponseToken(donorId: string, requestId: string, timestamp = Date.now()): string {
  return `${donorId}-${requestId}-${timestamp}`;
}

export function parseResponseToken(
  token: string
): { donor_id: string; request_id: string; timestamp: number } | null {
  const m = token.match(UUID_TOKEN);
  if (m) return { donor_id: m[1], request_id: m[2], timestamp: parseInt(m[3], 10) };
  // Legacy / non-UUID ids: everything up to the first dash, then up to the last dash
  const first = token.indexOf("-");
  const last = token.lastIndexOf("-");
  if (first < 1 || last <= first) return null;
  const donor_id = token.slice(0, first);
  const request_id = token.slice(first + 1, last);
  const timestamp = parseInt(token.slice(last + 1), 10);
  if (!donor_id || !request_id || !Number.isFinite(timestamp)) return null;
  return { donor_id, request_id, timestamp };
}
