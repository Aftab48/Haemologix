import fetch from "node-fetch";

export interface Coordinates {
  latitude: string;
  longitude: string;
}

/**
 * Get latitude & longitude for a given address
 * @param address - Full address string
 * @returns Promise with latitude and longitude
 */
export async function getCoordinatesFromAddress(
  address: string
): Promise<Coordinates> {
  if (!address) {
    throw new Error("Address is required for geocoding.");
  }

  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OpenCage API key in environment variables.");
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.statusText}`);
  }

  const data = (await response.json()) as OpenCageResponse;

  if (data.results && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry;
    return {
      latitude: lat.toString(),
      longitude: lng.toString(),
    };
  } else {
    throw new Error("No coordinates found for this address.");
  }
}
