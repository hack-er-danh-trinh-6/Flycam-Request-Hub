import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polygon, useMapEvents, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsLiteral, LatLngExpression } from "leaflet";
import { useGetMapConfig } from "@workspace/api-client-react";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, locationName: string, isRestricted: boolean) => void;
}

const DEFAULT_CENTER: LatLngExpression = [9.9, 105.65];
const DEFAULT_BOUNDS: LatLngBoundsLiteral = [[9.15, 104.75], [10.55, 106.25]];

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInPolygon(lat: number, lng: number, coords: number[][][]): boolean {
  const ring = coords[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isInNoFlyZone(lat: number, lng: number, zones: object[]): boolean {
  for (const zone of zones) {
    const z = zone as { type?: string; geometry?: { type: string; coordinates: number[][][] }; coordinates?: number[][][] };
    const geometry = z.geometry ?? (z.type === "Polygon" ? z : null);
    if (geometry?.type === "Polygon" && geometry.coordinates) {
      if (pointInPolygon(lng, lat, geometry.coordinates)) return true;
    }
  }
  return false;
}

// Fixed airport no-fly zone as fallback
const FALLBACK_ZONES = [
  { name: "Sân bay Quốc tế Cần Thơ", lat: 10.0853, lng: 105.7118, radius: 8000 },
];

function BoundsUpdater({ bounds }: { bounds: LatLngBoundsLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.setMaxBounds(bounds);
  }, [bounds, map]);
  return null;
}

function LocationMarker({
  onLocationSelect,
  noFlyZones,
}: {
  onLocationSelect: (lat: number, lng: number, name: string, restricted: boolean) => void;
  noFlyZones: object[];
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      const restricted =
        isInNoFlyZone(lat, lng, noFlyZones) ||
        FALLBACK_ZONES.some((z) => getDistanceMeters(lat, lng, z.lat, z.lng) <= z.radius);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`
        );
        const data = await res.json() as { display_name?: string };
        onLocationSelect(lat, lng, data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, restricted);
      } catch {
        onLocationSelect(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`, restricted);
      }
    },
  });

  return position ? <Marker position={position} /> : null;
}

export function MapPicker({ onLocationSelect }: MapPickerProps) {
  const { data: config } = useGetMapConfig();

  const noFlyZones: object[] = config?.noFlyZones ?? [];

  // Derive bounds from allowed zone if available
  let bounds: LatLngBoundsLiteral | null = DEFAULT_BOUNDS;
  let center: LatLngExpression = DEFAULT_CENTER;

  if (config?.allowedZone) {
    const az = config.allowedZone as { type?: string; coordinates?: number[][][] };
    if (az.type === "Polygon" && az.coordinates) {
      const ring = az.coordinates[0];
      const lats = ring.map((p) => p[1]);
      const lngs = ring.map((p) => p[0]);
      bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
      center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
    }
  }

  return (
    <div className="relative">
      <div className="h-[360px] w-full rounded-md border overflow-hidden">
        <MapContainer
          center={center}
          zoom={9}
          minZoom={8}
          maxZoom={18}
          maxBounds={bounds}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          {/* CartoDB Voyager — clean official-looking map */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />

          <BoundsUpdater bounds={bounds} />

          {/* Allowed zone boundary (green) */}
          {config?.allowedZone && (() => {
            const az = config.allowedZone as { type?: string; coordinates?: number[][][] };
            if (az.type === "Polygon" && az.coordinates) {
              const positions: LatLngExpression[] = az.coordinates[0].map(([lng, lat]) => [lat, lng]);
              return (
                <Polygon
                  positions={positions}
                  pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.08, weight: 2.5, dashArray: "8 4" }}
                >
                  <Tooltip>Vùng được phép bay</Tooltip>
                </Polygon>
              );
            }
            return null;
          })()}

          {/* Custom no-fly zones (red polygons from admin) */}
          {noFlyZones.map((zone, i) => {
            const z = zone as { type?: string; geometry?: { type: string; coordinates: number[][][] }; coordinates?: number[][][] };
            const geometry = z.geometry ?? (z.type === "Polygon" ? z : null);
            if (geometry?.type === "Polygon" && geometry.coordinates) {
              const positions: LatLngExpression[] = geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
              return (
                <Polygon
                  key={i}
                  positions={positions}
                  pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, weight: 2, dashArray: "6 4" }}
                >
                  <Tooltip>Vùng cấm bay</Tooltip>
                </Polygon>
              );
            }
            return null;
          })}

          {/* Fallback airport no-fly zone */}
          {FALLBACK_ZONES.map((zone) => (
            <Circle
              key={zone.name}
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.18, weight: 2, dashArray: "6 4" }}
            >
              <Tooltip sticky>{zone.name} — Vùng cấm bay (8km)</Tooltip>
            </Circle>
          ))}

          <LocationMarker onLocationSelect={onLocationSelect} noFlyZones={noFlyZones} />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-md px-3 py-2 text-xs space-y-1 shadow-md pointer-events-none">
        <p className="font-semibold text-foreground mb-1">Chú thích</p>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-red-500 bg-red-500/20 flex-shrink-0" />
          <span className="text-muted-foreground">Vùng cấm bay</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-green-500 bg-green-500/20 flex-shrink-0" />
          <span className="text-muted-foreground">Vùng được phép bay</span>
        </div>
      </div>
    </div>
  );
}
