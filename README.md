# Interactive Atlas

> A real-time, WebGL-powered 3D globe and geospatial visualization engine built with Three.js. Engineered for high-density data rendering at global scale.

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Stack](https://img.shields.io/badge/stack-Three.js%20%2F%20WebGL%20%2F%20TypeScript-black)
![License](https://img.shields.io/badge/license-private-red)

---

## Overview

Interactive Atlas is a client-side geospatial rendering engine that transforms raw coordinate and dataset feeds into an interactive 3D globe experience. Built on WebGL via Three.js, it renders hundreds of thousands of data points at 60fps — connection arcs, heatmap overlays, animated particle flows, and country-level choropleth layers — all driven by a clean data API.

Designed as an embeddable module, the atlas can be dropped into any React or vanilla JS application and fed live data streams from WebSocket or REST sources. Originally built for a network traffic visualization dashboard; extensible to logistics, climate, financial flow, and infrastructure mapping.

---

## Stack

| Layer | Technology |
|---|---|
| Rendering | Three.js (WebGL) |
| Language | TypeScript |
| Animations | GSAP |
| UI Shell | React 18 |
| Geo Data | GeoJSON / TopoJSON |
| Build | Vite |
| Testing | Vitest + Playwright |
| Deployment | Vercel (static) / AWS CloudFront |

---

## Features

- **3D globe** — physically accurate sphere with atmospheric glow, star field, and ambient occlusion shading
- **Connection arcs** — animated bezier curves between lat/lng pairs with configurable color, width, and pulse speed
- **Particle flows** — GPU-instanced point clouds representing live data streams; 500k+ points at 60fps
- **Choropleth layer** — country/region fill mapped to any numeric dataset with configurable color scales
- **Heatmap overlay** — canvas-based density map projected onto the globe surface via texture
- **Camera controls** — inertia-damped orbit controls with programmatic fly-to and focus animations
- **Data API** — simple `atlas.addArc()`, `atlas.setHeatmap()`, `atlas.focusCountry()` interface — no Three.js knowledge required for consumers
- **Responsive** — ResizeObserver-driven canvas scaling; works from 320px mobile to 4K displays
- **Live data** — built-in WebSocket data adapter; connects to any feed and maps events to scene mutations

---

## Project Structure

```
/
├── src/
│   ├── main.ts                  # Dev entry point
│   ├── Atlas.ts                 # Public-facing class — the main consumer API
│   ├── core/
│   │   ├── Renderer.ts          # WebGL renderer setup & render loop
│   │   ├── Scene.ts             # Three.js scene, camera, lights
│   │   └── Controls.ts          # Orbit controls with inertia + fly-to
│   ├── layers/
│   │   ├── Globe.ts             # Base sphere geometry + texture + atmosphere
│   │   ├── ArcLayer.ts          # Animated bezier connection arcs
│   │   ├── ParticleLayer.ts     # GPU-instanced particle system
│   │   ├── ChoroplethLayer.ts   # Country/region fill from GeoJSON
│   │   └── HeatmapLayer.ts      # Canvas heatmap projected as texture
│   ├── data/
│   │   ├── geoUtils.ts          # lat/lng ↔ 3D vector conversions
│   │   ├── topoParser.ts        # TopoJSON → Three.js geometry
│   │   └── wsAdapter.ts         # WebSocket live data adapter
│   ├── shaders/
│   │   ├── atmosphere.vert.glsl # Atmospheric glow vertex shader
│   │   ├── atmosphere.frag.glsl # Atmospheric glow fragment shader
│   │   ├── arc.vert.glsl        # Arc animation vertex shader
│   │   └── particle.vert.glsl   # GPU particle position vertex shader
│   ├── react/
│   │   └── AtlasCanvas.tsx      # React wrapper component
│   └── types/
│       └── index.ts             # Shared TypeScript types
├── public/
│   ├── textures/                # Earth day/night/specular maps
│   └── geo/                     # world.topojson
├── tests/
│   ├── unit/
│   └── e2e/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── index.html
├── vite.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- A browser with WebGL2 support (all modern browsers)

### Installation

```bash
git clone https://github.com/mbstuDEV/interactive-atlas.git
cd interactive-atlas
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Usage

### Standalone (Vanilla JS / TS)

```typescript
import { Atlas } from './src/Atlas';

const atlas = new Atlas({
  container: document.getElementById('globe'),
  theme: 'dark',
  autoRotate: true,
  autoRotateSpeed: 0.3,
});

// Add a connection arc between two cities
atlas.addArc({
  from: { lat: 40.7128, lng: -74.0060 },  // New York
  to:   { lat: 51.5074, lng: -0.1278  },  // London
  color: '#ef4444',
  width: 1.5,
  animationSpeed: 1.2,
});

// Focus the camera on a country
atlas.focusCountry('JP');

// Feed live data from a WebSocket
atlas.connectLiveData('wss://yourapi.com/geo-stream', (event) => ({
  type: 'arc',
  from: event.origin,
  to:   event.destination,
  color: event.severity > 0.8 ? '#ef4444' : '#22c55e',
}));
```

### React Component

```tsx
import { AtlasCanvas } from './src/react/AtlasCanvas';

export function Dashboard() {
  return (
    <AtlasCanvas
      theme="dark"
      autoRotate
      arcs={[
        { from: { lat: 35.6762, lng: 139.6503 }, to: { lat: 1.3521, lng: 103.8198 }, color: '#ef4444' }
      ]}
      onCountryClick={(iso) => console.log('Clicked:', iso)}
      style={{ width: '100%', height: '600px' }}
    />
  );
}
```

---

## Data API Reference

### `atlas.addArc(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `from` | `{ lat, lng }` | required | Origin coordinate |
| `to` | `{ lat, lng }` | required | Destination coordinate |
| `color` | `string` | `'#ffffff'` | Hex color |
| `width` | `number` | `1` | Arc tube width |
| `animationSpeed` | `number` | `1` | Travel animation speed multiplier |
| `dashed` | `boolean` | `false` | Dashed line style |

### `atlas.setHeatmap(points)`

Accepts an array of `{ lat, lng, intensity }` objects. Renders a canvas heatmap projected as a globe texture overlay.

### `atlas.setChoropleth(dataset, colorScale)`

Accepts a `Map<isoCode, value>` and a color scale config. Fills country geometries by value.

### `atlas.focusCountry(isoCode, durationMs?)`

Animates the camera to frame the given country. Duration defaults to `1200ms`.

### `atlas.clearLayer(layerName)`

Removes all objects from the named layer and disposes GPU resources.

---

## Performance

| Scenario | FPS | GPU Memory |
|---|---|---|
| Globe only | 60 | ~18MB |
| 1,000 arcs | 60 | ~34MB |
| 500,000 particles | 58–60 | ~120MB |
| Full choropleth + heatmap | 55–60 | ~210MB |

Tested on an M2 MacBook Pro at 1440p. Particle system uses `InstancedMesh` for GPU-side instancing — CPU involvement is minimal once the scene is built.

---

## Scripts

```bash
npm run dev          # Vite dev server with HMR
npm run build        # Production bundle
npm run preview      # Preview production build locally
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright visual regression tests
npm run lint         # ESLint
```

---

## Deployment

Static build output from `npm run build` is deployed to Vercel on every merge to `main` via GitHub Actions. CloudFront CDN is used for the texture assets (`/public/textures/`) which are large and benefit from edge caching.

---

## License

Private. All rights reserved. © 2026 muntasirbergam.studio
