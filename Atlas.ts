import * as THREE from 'three';
import { Renderer }         from './core/Renderer';
import { Scene }            from './core/Scene';
import { Controls }         from './core/Controls';
import { Globe }            from './layers/Globe';
import { ArcLayer }         from './layers/ArcLayer';
import { ParticleLayer }    from './layers/ParticleLayer';
import { ChoroplethLayer }  from './layers/ChoroplethLayer';
import { HeatmapLayer }     from './layers/HeatmapLayer';
import { WsAdapter }        from './data/wsAdapter';
import { parseTopology }    from './data/topoParser';
import { latLngToVector3 }  from './data/geoUtils';
import {
  AtlasConfig,
  ArcOptions,
  HeatmapPoint,
  ColorScale,
  FlyToOptions,
  LiveDataMapper,
  ParticleLayerOptions,
} from './types';

export class Atlas {
  private renderer:   Renderer;
  private scene:      Scene;
  private controls:   Controls;
  private globe:      Globe;
  private arcLayer:   ArcLayer;
  private particles:  ParticleLayer;
  private choropleth: ChoroplethLayer;
  private heatmap:    HeatmapLayer;
  private wsAdapters: WsAdapter[] = [];
  private raycaster   = new THREE.Raycaster();
  private mouse       = new THREE.Vector2();

  private countryClickHandlers: ((iso: string) => void)[] = [];

  constructor(config: AtlasConfig) {
    const {
      container,
      theme          = 'dark',
      autoRotate     = true,
      autoRotateSpeed = 0.3,
      globeRadius    = 1,
      showAtmosphere = true,
      showStars      = true,
    } = config;

    // Core systems
    this.renderer  = new Renderer(container);
    this.scene     = new Scene(this.renderer.aspect, theme);
    this.controls  = new Controls(
      this.scene.camera,
      this.renderer.renderer.domElement,
      autoRotate,
      autoRotateSpeed
    );

    // Layers
    this.globe      = new Globe(globeRadius, showAtmosphere, showStars);
    this.arcLayer   = new ArcLayer(globeRadius);
    this.particles  = new ParticleLayer(globeRadius);
    this.choropleth = new ChoroplethLayer();
    this.heatmap    = new HeatmapLayer(globeRadius);

    this.scene.scene.add(this.globe.group);
    this.scene.scene.add(this.arcLayer.group);
    this.scene.scene.add(this.choropleth.group);

    // Country click detection
    this.renderer.renderer.domElement.addEventListener('click', this.onCanvasClick);

    // Start render loop
    this.renderer.start((deltaMs) => this.tick(deltaMs));
  }

  // ── Render loop ──────────────────────────────────────────────────────────

  private tick(deltaMs: number) {
    this.controls.update(deltaMs);
    this.globe.update(deltaMs);
    this.arcLayer.update(deltaMs);
    this.particles.update(deltaMs);

    // Keep camera aspect in sync with canvas
    this.scene.updateAspect(this.renderer.aspect);

    this.scene.render(this.renderer.renderer);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Add an animated connection arc between two coordinates */
  addArc(options: ArcOptions): string {
    return this.arcLayer.add(options);
  }

  /** Remove an arc by ID */
  removeArc(id: string) {
    this.arcLayer.remove(id);
  }

  /** Clear all arcs */
  clearArcs() {
    this.arcLayer.clear();
  }

  /** Build or replace the particle layer */
  setParticles(options: ParticleLayerOptions) {
    if (this.particles.points) this.scene.scene.remove(this.particles.points);
    this.particles.build(options);
    if (this.particles.points) this.scene.scene.add(this.particles.points);
  }

  /** Set a heatmap overlay from intensity points */
  setHeatmap(points: HeatmapPoint[]) {
    const existing = this.scene.scene.getObjectByName('heatmap');
    if (existing) this.scene.scene.remove(existing);

    const mesh = this.heatmap.build(points);
    mesh.name = 'heatmap';
    this.scene.scene.add(mesh);
  }

  /** Update the heatmap in place without rebuilding */
  updateHeatmap(points: HeatmapPoint[]) {
    this.heatmap.update(points);
  }

  /** Load world TopoJSON and apply a choropleth dataset */
  async loadChoropleth(topoUrl: string, dataset: Map<string, number>, scale: ColorScale) {
    const res = await fetch(topoUrl);
    const topo = await res.json();
    const meshes = parseTopology(topo);
    this.choropleth.load(meshes);
    this.choropleth.apply(dataset, scale);
  }

  /** Animate the camera to a geographic coordinate */
  flyTo(options: FlyToOptions) {
    this.controls.flyTo(options);
  }

  /** Fly to and focus a specific country by ISO alpha-3 code */
  focusCountry(isoCode: string, durationMs = 1200) {
    // Country centroids (a subset of common ones)
    const centroids: Record<string, [number, number]> = {
      USA: [37.09, -95.71], GBR: [55.37, -3.43], DEU: [51.16, 10.45],
      FRA: [46.22, 2.21],   JPN: [36.20, 138.25], CHN: [35.86, 104.19],
      BRA: [-14.23, -51.92], IND: [20.59, 78.96], AUS: [-25.27, 133.77],
      RUS: [61.52, 105.31], ZAF: [-30.55, 22.93], NGA: [9.08, 8.67],
    };

    const centroid = centroids[isoCode.toUpperCase()];
    if (!centroid) {
      console.warn(`[Atlas] No centroid for ISO code: ${isoCode}`);
      return;
    }

    this.controls.flyTo({ lat: centroid[0], lng: centroid[1], altitude: 0.6, durationMs });
  }

  /** Connect to a live WebSocket data source */
  connectLiveData<T = unknown>(url: string, mapper: LiveDataMapper<T>) {
    const adapter = new WsAdapter<T>(url, mapper);
    adapter.onEvent((event) => {
      if (event.type === 'arc') this.addArc({ from: event.from, to: event.to, color: event.color });
    });
    adapter.connect();
    this.wsAdapters.push(adapter as WsAdapter);
  }

  /** Register a callback for country click events */
  onCountryClick(handler: (iso: string) => void) {
    this.countryClickHandlers.push(handler);
    return () => { this.countryClickHandlers = this.countryClickHandlers.filter((h) => h !== handler); };
  }

  // ── Click detection ──────────────────────────────────────────────────────

  private onCanvasClick = (e: MouseEvent) => {
    if (!this.countryClickHandlers.length) return;

    const rect = this.renderer.renderer.domElement.getBoundingClientRect();
    this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.scene.camera);

    const fills = this.choropleth.group.children.filter((c) => c instanceof THREE.Mesh);
    const hits  = this.raycaster.intersectObjects(fills);

    if (hits.length > 0) {
      const hitObj = hits[0].object;
      const iso = hitObj.userData['isoCode'] as string | undefined;
      if (iso) this.countryClickHandlers.forEach((h) => h(iso));
    }
  };

  // ── Cleanup ──────────────────────────────────────────────────────────────

  dispose() {
    this.wsAdapters.forEach((a) => a.disconnect());
    this.renderer.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    this.controls.dispose();
    this.globe.dispose();
    this.arcLayer.dispose();
    this.particles.dispose();
    this.choropleth.dispose();
    this.heatmap.dispose();
    this.scene.dispose();
    this.renderer.dispose();
  }
}
