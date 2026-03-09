import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

/**
 * Convert geographic coordinates to a 3D Cartesian vector on a sphere.
 * Three.js uses a Y-up coordinate system; latitude maps to Y, longitude to XZ.
 */
export function latLngToVector3(lat: number, lng: number, radius = 1): THREE.Vector3 {
  const phi   = (90 - lat) * DEG2RAD;   // Polar angle from +Y
  const theta = (lng + 180) * DEG2RAD;  // Azimuthal angle from -Z

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Convert a 3D vector back to geographic lat/lng.
 */
export function vector3ToLatLng(v: THREE.Vector3): { lat: number; lng: number } {
  const normalized = v.clone().normalize();
  const lat = 90 - Math.acos(normalized.y) / DEG2RAD;
  const lng = (Math.atan2(normalized.z, -normalized.x) / DEG2RAD) - 180;
  return { lat, lng };
}

/**
 * Build a smooth bezier arc between two lat/lng points.
 * The arc height scales with the angular distance between points.
 */
export function buildArcPoints(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  radius = 1,
  segments = 64
): THREE.Vector3[] {
  const start = latLngToVector3(from.lat, from.lng, radius);
  const end   = latLngToVector3(to.lat,   to.lng,   radius);

  // Arc height proportional to angular distance (min 0.15, max 0.5)
  const angle = start.angleTo(end);
  const arcHeight = radius + THREE.MathUtils.clamp(angle * 0.6, 0.15, 0.5);

  const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(arcHeight);

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  return curve.getPoints(segments);
}

/**
 * Compute the great-circle distance (km) between two lat/lng points.
 */
export function haversineKm(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = (to.lat - from.lat) * DEG2RAD;
  const dLng = (to.lng - from.lng) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * DEG2RAD) * Math.cos(to.lat * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
