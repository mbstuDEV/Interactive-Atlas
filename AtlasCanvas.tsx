import { useEffect, useRef, useCallback } from 'react';
import { Atlas } from '../Atlas';
import {
  AtlasTheme,
  ArcOptions,
  HeatmapPoint,
  ColorScale,
  ParticleLayerOptions,
} from '../types';

interface AtlasCanvasProps {
  theme?: AtlasTheme;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showAtmosphere?: boolean;
  showStars?: boolean;
  arcs?: ArcOptions[];
  heatmap?: HeatmapPoint[];
  particles?: ParticleLayerOptions;
  choropleth?: {
    topoUrl: string;
    dataset: Map<string, number>;
    scale: ColorScale;
  };
  onCountryClick?: (iso: string) => void;
  onReady?: (atlas: Atlas) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function AtlasCanvas({
  theme = 'dark',
  autoRotate = true,
  autoRotateSpeed = 0.3,
  showAtmosphere = true,
  showStars = true,
  arcs,
  heatmap,
  particles,
  choropleth,
  onCountryClick,
  onReady,
  style,
  className,
}: AtlasCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const atlasRef     = useRef<Atlas | null>(null);

  // Initialize Atlas once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const atlas = new Atlas({
      container,
      theme,
      autoRotate,
      autoRotateSpeed,
      showAtmosphere,
      showStars,
    });

    atlasRef.current = atlas;
    onReady?.(atlas);

    return () => {
      atlas.dispose();
      atlasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — Atlas is imperative, we don't re-init on prop changes

  // Sync arcs
  useEffect(() => {
    const atlas = atlasRef.current;
    if (!atlas || !arcs) return;
    atlas.clearArcs();
    arcs.forEach((arc) => atlas.addArc(arc));
  }, [arcs]);

  // Sync heatmap
  useEffect(() => {
    const atlas = atlasRef.current;
    if (!atlas || !heatmap) return;
    atlas.setHeatmap(heatmap);
  }, [heatmap]);

  // Sync particles
  useEffect(() => {
    const atlas = atlasRef.current;
    if (!atlas || !particles) return;
    atlas.setParticles(particles);
  }, [particles]);

  // Sync choropleth
  useEffect(() => {
    const atlas = atlasRef.current;
    if (!atlas || !choropleth) return;
    atlas.loadChoropleth(choropleth.topoUrl, choropleth.dataset, choropleth.scale);
  }, [choropleth]);

  // Country click handler
  const handleCountryClick = useCallback((iso: string) => {
    onCountryClick?.(iso);
  }, [onCountryClick]);

  useEffect(() => {
    const atlas = atlasRef.current;
    if (!atlas) return;
    return atlas.onCountryClick(handleCountryClick);
  }, [handleCountryClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', ...style }}
      className={className}
    />
  );
}
