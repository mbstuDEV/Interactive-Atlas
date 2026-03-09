// Atmospheric glow — vertex shader
// Computes a fresnel-style rim factor based on the view direction vs surface normal.

varying float vFresnel;
varying vec3 vNormal;

uniform vec3 cameraPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec3 worldNormal   = normalize(mat3(modelMatrix) * normal);
  vec3 viewDir       = normalize(cameraPosition - worldPosition.xyz);

  // Fresnel: dot product of view direction and surface normal
  // When looking edge-on (perpendicular), fresnel approaches 1.0
  vFresnel = 1.0 - max(0.0, dot(viewDir, worldNormal));
  vNormal  = worldNormal;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
