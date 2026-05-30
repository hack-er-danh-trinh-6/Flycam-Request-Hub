import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Marker, Circle, Polygon,
  useMapEvents, Tooltip, useMap,
} from "react-leaflet";
import L, { type LatLngBoundsLiteral, type LatLngExpression } from "leaflet";
import { useGetMapConfig } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Locate, LoaderCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, locationName: string, isRestricted: boolean) => void;
}

const DEFAULT_CENTER: LatLngExpression = [9.9, 105.65];
const DEFAULT_BOUNDS: LatLngBoundsLiteral = [[9.15, 104.75], [10.55, 106.25]];

const FALLBACK_ZONES = [
  { name: "Sân bay Quốc tế Cần Thơ", lat: 10.0853, lng: 105.7118, radius: 8000 },
];

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GeoJSON coords are [lng, lat]; we receive point as (lat, lng) from Leaflet
function pointInGeoJsonPolygon(pointLat: number, pointLng: number, coords: number[][][]): boolean {
  const ring = coords[0]; // exterior ring
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [vLng1, vLat1] = ring[i]; // GeoJSON: [lng, lat]
    const [vLng2, vLat2] = ring[j];
    // Ray casting along longitude axis
    const intersect =
      vLat1 > pointLat !== vLat2 > pointLat &&
      pointLng < ((vLng2 - vLng1) * (pointLat - vLat1)) / (vLat2 - vLat1) + vLng1;
    if (intersect) inside = !inside;
  }
  return inside;
}

type GeoFeature = { type: "Feature"; geometry: { type: string; coordinates: number[][][] } };
type GeoPolygon = { type: "Polygon"; coordinates: number[][][] };

function isRestricted(lat: number, lng: number, zones: object[]): boolean {
  // Fallback: airport radius check
  if (FALLBACK_ZONES.some((z) => getDistanceMeters(lat, lng, z.lat, z.lng) <= z.radius)) {
    return true;
  }
  // Admin-drawn no-fly zones (stored as GeoJSON Features or Polygons)
  for (const zone of zones) {
    const z = zone as GeoFeature | GeoPolygon | Record<string, unknown>;
    let coords: number[][][] | null = null;
    if ((z as GeoFeature).type === "Feature") {
      const geom = (z as GeoFeature).geometry;
      if (geom?.type === "Polygon") coords = geom.coordinates;
    } else if ((z as GeoPolygon).type === "Polygon") {
      coords = (z as GeoPolygon).coordinates;
    }
    if (coords && pointInGeoJsonPolygon(lat, lng, coords)) return true;
  }
  return false;
}

// ─── Fly controller ───────────────────────────────────────────────────────────

function MapController({ flyRef }: { flyRef: React.MutableRefObject<((lat: number, lng: number) => void) | null> }) {
  const map = useMap();
  useEffect(() => {
    flyRef.current = (lat, lng) => map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
    return () => { flyRef.current = null; };
  }, [map, flyRef]);
  return null;
}

// ─── Bounds enforcer ─────────────────────────────────────────────────────────

function BoundsUpdater({ bounds }: { bounds: LatLngBoundsLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.setMaxBounds(bounds);
  }, [bounds, map]);
  return null;
}

// ─── Click-to-select marker ───────────────────────────────────────────────────
// Uses refs for noFlyZones + callback to avoid stale closures in useMapEvents.

function LocationMarker({
  position,
  zonesRef,
  onSelectRef,
}: {
  position: { lat: number; lng: number } | null;
  zonesRef: React.MutableRefObject<object[]>;
  onSelectRef: React.MutableRefObject<(lat: number, lng: number, name: string, restricted: boolean) => void>;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      const restricted = isRestricted(lat, lng, zonesRef.current);
      // Reverse geocode, then fire callback
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`)
        .then((r) => r.json() as Promise<{ display_name?: string }>)
        .then((data) => {
          onSelectRef.current(lat, lng, data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, restricted);
        })
        .catch(() => {
          onSelectRef.current(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`, restricted);
        });
    },
  });
  return position ? <Marker position={position} /> : null;
}

// ─── Blue dot icon ────────────────────────────────────────────────────────────

const youAreHereIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// ─── Main component ───────────────────────────────────────────────────────────

export function MapPicker({ onLocationSelect }: MapPickerProps) {
  const { data: config } = useGetMapConfig();
  const flyRef = useRef<((lat: number, lng: number) => void) | null>(null);

  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Always-fresh ref to avoid stale closure in LocationMarker's useMapEvents
  const noFlyZones: object[] = config?.noFlyZones ?? [];
  const zonesRef = useRef<object[]>(noFlyZones);
  zonesRef.current = noFlyZones;

  const onSelectRef = useRef<(lat: number, lng: number, name: string, restricted: boolean) => void>(
    (lat, lng, name, res) => { setSelectedPos({ lat, lng }); onLocationSelect(lat, lng, name, res); }
  );
  onSelectRef.current = (lat, lng, name, res) => {
    setSelectedPos({ lat, lng });
    onLocationSelect(lat, lng, name, res);
  };

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) { setLocateError("Trình duyệt không hỗ trợ định vị"); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyPos({ lat: latitude, lng: longitude });
        flyRef.current?.(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED ? "Chưa cấp quyền định vị" : "Không xác định được vị trí");
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // Derive bounds/center from allowed zone
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
    <div className="space-y-2">
      {/* Locate button */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={handleLocate} disabled={locating} className="flex items-center gap-2">
          {locating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
          {locating ? "Đang định vị..." : "Định vị vị trí của tôi"}
        </Button>
        {locateError && <span className="text-sm text-destructive">{locateError}</span>}
        {myPos && !locating && (
          <span className="text-sm text-muted-foreground">{myPos.lat.toFixed(4)}, {myPos.lng.toFixed(4)}</span>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[360px] w-full rounded-md border overflow-hidden" style={{ touchAction: "none" }}>
        <MapContainer
          center={center}
          zoom={9}
          minZoom={8}
          maxZoom={18}
          maxBounds={bounds}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
          <MapController flyRef={flyRef} />
          <BoundsUpdater bounds={bounds} />

          {/* Allowed zone (green dashed) */}
          {config?.allowedZone && (() => {
            const az = config.allowedZone as { type?: string; coordinates?: number[][][] };
            if (az.type === "Polygon" && az.coordinates) {
              const positions: LatLngExpression[] = az.coordinates[0].map(([lng, lat]) => [lat, lng]);
              return (
                <Polygon positions={positions} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.08, weight: 2.5, dashArray: "8 4" }}>
                  <Tooltip>Vùng được phép bay</Tooltip>
                </Polygon>
              );
            }
            return null;
          })()}

          {/* Admin no-fly zones (red) */}
          {noFlyZones.map((zone, i) => {
            const z = zone as GeoFeature | GeoPolygon | Record<string, unknown>;
            let coords: number[][][] | null = null;
            if ((z as GeoFeature).type === "Feature") {
              const geom = (z as GeoFeature).geometry;
              if (geom?.type === "Polygon") coords = geom.coordinates;
            } else if ((z as GeoPolygon).type === "Polygon") {
              coords = (z as GeoPolygon).coordinates;
            }
            if (!coords) return null;
            const positions: LatLngExpression[] = coords[0].map(([lng, lat]) => [lat, lng]);
            return (
              <Polygon key={i} positions={positions} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, weight: 2, dashArray: "6 4" }}>
                <Tooltip>Vùng cấm bay</Tooltip>
              </Polygon>
            );
          })}

          {/* Fallback airport circle */}
          {FALLBACK_ZONES.map((zone) => (
            <Circle key={zone.name} center={[zone.lat, zone.lng]} radius={zone.radius}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.18, weight: 2, dashArray: "6 4" }}>
              <Tooltip sticky>{zone.name} — Vùng cấm bay (8km)</Tooltip>
            </Circle>
          ))}

          {/* Blue "you are here" dot */}
          {myPos && (
            <>
              <Marker position={myPos} icon={youAreHereIcon}>
                <Tooltip permanent direction="top" offset={[0, -12]}>Vị trí của bạn</Tooltip>
              </Marker>
              <Circle center={myPos} radius={60}
                pathOptions={{ color: "#3b82f6", fillColor: "#93c5fd", fillOpacity: 0.3, weight: 1.5 }} />
            </>
          )}

          {/* Click-to-select — uses refs, never stale */}
          <LocationMarker position={selectedPos} zonesRef={zonesRef} onSelectRef={onSelectRef} />
        </MapContainer>

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
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white flex-shrink-0" style={{ boxShadow: "0 0 0 1.5px #3b82f6" }} />
            <span className="text-muted-foreground">Vị trí của bạn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
