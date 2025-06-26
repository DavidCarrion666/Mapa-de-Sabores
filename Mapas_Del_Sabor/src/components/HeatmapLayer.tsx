import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// Declaración de types para TypeScript:
declare module "leaflet" {
  function heatLayer(
    latlngs: [number, number, number?][],
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      radius?: number;
      blur?: number;
      max?: number;
      gradient?: { [key: number]: string };
    }
  ): L.Layer;
}

interface HeatmapLayerProps {
  points: [number, number, number?][];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heatLayer = L.heatLayer(points, {
      radius: 35,
      blur: 20,
      minOpacity: 0.2,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [points, map]);

  return null;
}
