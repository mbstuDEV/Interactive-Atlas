import * as THREE from 'three';
import atmosphereVert from '../shaders/atmosphere.vert.glsl';
import atmosphereFrag from '../shaders/atmosphere.frag.glsl';

export class Globe {
  public group: THREE.Group;
  private sphere: THREE.Mesh;
  private atmosphere: THREE.Mesh;
  private stars: THREE.Points | null = null;

  constructor(
    private radius = 1,
    showAtmosphere = true,
    showStars = true
  ) {
    this.group = new THREE.Group();
    this.sphere = this.buildSphere();
    this.atmosphere = this.buildAtmosphere();

    this.group.add(this.sphere);
    if (showAtmosphere) this.group.add(this.atmosphere);
    if (showStars) {
      this.stars = this.buildStars();
      this.group.add(this.stars);
    }
  }

  private buildSphere(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(this.radius, 64, 64);

    // Load earth texture — falls back to a solid color if texture missing
    const loader = new THREE.TextureLoader();
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });

    loader.load('/textures/earth_day.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    });

    loader.load('/textures/earth_specular.jpg', (tex) => {
      mat.specularMap = tex;
      mat.needsUpdate = true;
    });

    return new THREE.Mesh(geo, mat);
  }

  private buildAtmosphere(): THREE.Mesh {
    // Slightly larger sphere with a custom fresnel shader — produces the rim glow
    const geo = new THREE.SphereGeometry(this.radius * 1.08, 64, 64);
    const mat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      uniforms: {
        glowColor:     { value: new THREE.Color(0x4488ff) },
        glowIntensity: { value: 0.65 },
        glowPower:     { value: 3.5 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Mesh(geo, mat);
  }

  private buildStars(): THREE.Points {
    const count = 8000;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute stars on a large sphere around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 90 + Math.random() * 10;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });

    return new THREE.Points(geo, mat);
  }

  update(deltaMs: number) {
    // Stars counter-rotate slightly for parallax depth
    if (this.stars) {
      this.stars.rotation.y += (deltaMs / 1000) * 0.005;
    }
  }

  dispose() {
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
    this.atmosphere.geometry.dispose();
    (this.atmosphere.material as THREE.Material).dispose();
    this.stars?.geometry.dispose();
    (this.stars?.material as THREE.Material | undefined)?.dispose();
  }
}
