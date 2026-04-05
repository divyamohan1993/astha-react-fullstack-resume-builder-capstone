/**
 * Distance Agent -- Google Maps Distance Matrix API.
 *
 * Optional, online-only. Returns driving distance in km and estimated minutes.
 * If offline or no API key: parameter excluded, weight redistributed (spec section 6.6).
 *
 * Citation: Marinescu, I. & Rathelot, R. (2018). "Mismatch Unemployment and
 * the Geography of Job Search." AEJ: Macroeconomics, 10(3), 42-70.
 *
 * API key stored in localStorage per spec section 5.6 (never transmitted elsewhere).
 */

export interface DistanceResult {
  km: number;
  minutes: number;
  originAddress: string;
  destinationAddress: string;
}

/**
 * Query Google Maps Distance Matrix API for driving distance and duration.
 *
 * Uses the Distance Matrix JSON endpoint. Returns driving distance in km
 * and estimated travel time in minutes.
 *
 * Timeout: 10 seconds. Fails gracefully (distance parameter excluded from scoring).
 */
export async function getDistance(
  apiKey: string,
  origin: string,
  destination: string
): Promise<DistanceResult | null> {
  if (!apiKey || !origin || !destination) return null;

  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: 'driving',
    units: 'metric',
    key: apiKey,
  });

  const endpoint = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.status !== 'OK') return null;

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') return null;

    return {
      km: element.distance.value / 1000, // API returns meters
      minutes: element.duration.value / 60, // API returns seconds
      originAddress: data.origin_addresses?.[0] ?? origin,
      destinationAddress: data.destination_addresses?.[0] ?? destination,
    };
  } catch {
    // Network failure, timeout, or offline: graceful degradation
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
