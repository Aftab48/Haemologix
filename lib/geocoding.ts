import fetch from "node-fetch";

export interface Coordinates {
  latitude: string;
  longitude: string;
}

/**
 * Get latitude & longitude for a given address
 * Tries free Nominatim (OpenStreetMap) first, falls back to OpenCage if available
 * @param address - Full address string
 * @returns Promise with latitude and longitude
 */
export async function getCoordinatesFromAddress(
  address: string
): Promise<Coordinates> {
  if (!address) {
    throw new Error("Address is required for geocoding.");
  }

  // Try Nominatim first (free, no API key needed)
  try {
    return await getCoordinatesFromNominatim(address);
  } catch (error) {
    console.warn("Nominatim geocoding failed, trying OpenCage fallback...", error);
  }

  // Fallback to OpenCage (if API key is available)
  const openCageKey = process.env.OPENCAGE_API_KEY;
  if (openCageKey) {
    return await getCoordinatesFromOpenCage(address, openCageKey);
  }

  throw new Error("All geocoding services failed for this address");
}

export interface DonorAddressParts {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface DonorCoordinates extends Coordinates {
  /** How specific the match was — useful when deciding whether to ask for a GPS fix. */
  precision: "address" | "locality" | "pincode" | "region";
}

/**
 * Geocode a donor's address, falling back to coarser queries.
 *
 * A full Indian street address ("Tulip Garden Apartments, Block-D, 4th Floor…")
 * is usually not in OpenStreetMap, so asking for it verbatim fails for most real
 * donors. But precision to the street is not what this is for: the matching agent
 * only needs to know whether a donor is inside an alert's search radius, which is
 * kilometres wide. A pincode- or city-level fix answers that perfectly well, and
 * the mobile app replaces it with a real GPS fix the first time the donor opens it.
 *
 * Returning *something* therefore beats returning nothing — a donor with no
 * coordinates is invisible to every alert.
 */
export async function geocodeDonorAddress(
  parts: DonorAddressParts
): Promise<DonorCoordinates> {
  const join = (...values: (string | null | undefined)[]) =>
    values.filter(Boolean).join(", ");

  const attempts: { query: string; precision: DonorCoordinates["precision"] }[] = [
    { query: join(parts.address, parts.city, parts.state, parts.pincode), precision: "address" },
    { query: join(parts.city, parts.state, parts.pincode), precision: "locality" },
    { query: join(parts.pincode, "India"), precision: "pincode" },
    { query: join(parts.city, parts.state, "India"), precision: "region" },
  ];

  for (const attempt of attempts) {
    if (!attempt.query) continue;

    try {
      const coords = await getCoordinatesFromAddress(attempt.query);
      return { ...coords, precision: attempt.precision };
    } catch {
      // Try the next, coarser query.
    }
  }

  throw new Error("Could not geocode this address at any level of precision");
}

/**
 * OpenCage geocoding service
 */
async function getCoordinatesFromOpenCage(
  address: string,
  apiKey: string
): Promise<Coordinates> {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenCage API error: ${response.statusText}`);
  }

  const data = (await response.json()) as OpenCageResponse;

  if (data.results && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry;
    return {
      latitude: lat.toString(),
      longitude: lng.toString(),
    };
  }
  throw new Error("No coordinates found from OpenCage");
}

/**
 * Nominatim (OpenStreetMap) geocoding service - Free, no API key required
 */
async function getCoordinatesFromNominatim(address: string): Promise<Coordinates> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Haemologix/1.0 (Blood Donation Platform)' // Required by Nominatim usage policy
    }
  });
  
  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0) {
    return {
      latitude: data[0].lat,
      longitude: data[0].lon,
    };
  }
  throw new Error("No coordinates found for this address");
}
