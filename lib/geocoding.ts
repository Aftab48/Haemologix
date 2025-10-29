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
