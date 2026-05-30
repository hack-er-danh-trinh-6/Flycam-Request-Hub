import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polygon, useMapEvents, Tooltip, useMap } from "react-leaflet";
import L, { type LatLngBoundsLiteral, type LatLngExpression } from "leaflet";
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

// Blue "you are here" dot icon
const youAreHereIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Fixed airport no-fly zone as fallback
const FALLBACK_ZONES = [
  { name: "Sân bay Quốc tế Cần Thơ", lat: 10.0853, lng: 105.7118, radius: 8000 },
];

// ─── Bounds updater ──────────────────────────────────────────────────────────

function BoundsUpdater({ bounds }: { bounds: LatLngBoundsLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.setMaxBounds(bounds);
  }, [bounds, map]);
  return null;
}

// ─── Locate control — uses L.Control so it mounts in the real control pane ───

function LocateControl({
  onLocated,
}: {
  onLocated: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const onLocatedRef = useRef(onLocated);
  onLocatedRef.current = onLocated;

  useEffect(() => {
    const LocateBtn = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        container.style.cursor = "pointer";

        const btn = L.DomUtil.create("a", "", container);
        btn.title = "Định vị vị trí của tôi";
        btn.href = "#";
        btn.style.cssText =
          "display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:18px;";
        btn.innerHTML =
          `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" opacity=".3"/></svg>`;

        L.DomEvent.on(btn, "click", L.DomEvent.stop);
        L.DomEvent.on(btn, "click", () => {
          if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ định vị");
            return;
          }
          btn.innerHTML =
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.flyTo([latitude, longitude], 15, { animate: true, duration: 1.2 });
              onLocatedRef.current(latitude, longitude);
              btn.innerHTML =
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" opacity=".3"/></svg>`;
            },
            (err) => {
              btn.innerHTML =
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" opacity=".3"/></svg>`;
              alert(
                err.code === err.PERMISSION_DENIED
                  ? "Bạn chưa cấp quyền định vị cho trang này."
                  : "Không thể xác định vị trí. Vui lòng thử lại."
              );
            },
            { timeout: 10000, maximumAge: 30000 }
          );
        });

        return container;
      },
    });

    const ctrl = new LocateBtn();
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map]);

  return null;
}

// ─── Click-to-select marker ───────────────────────────────────────────────────

function LocationMarker({
  onLocationSelect,
  noFlyZones,
  userPosition,
  setPosition,
}: {
  onLocationSelect: (lat: number, lng: number, name: string, restricted: boolean) => void;
  noFlyZones: object[];
  userPosition: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number }) => void;
}) {
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

  return userPosition ? <Marker position={userPosition} /> : null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MapPicker({ onLocationSelect }: MapPickerProps) {
  const { data: config } = useGetMapConfig();
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);

  const noFlyZones: object[] = config?.noFlyZones ?? [];

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
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />

          <BoundsUpdater bounds={bounds} />

          {/* Allowed zone (green dashed border) */}
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

          {/* Admin-defined no-fly zones */}
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

          {/* Blue "you are here" dot */}
          {myPosition && (
            <>
              <Marker position={myPosition} icon={youAreHereIcon}>
                <Tooltip permanent direction="top" offset={[0, -12]}>Vị trí của bạn</Tooltip>
              </Marker>
              <Circle
                center={myPosition}
                radius={60}
                pathOptions={{ color: "#3b82f6", fillColor: "#93c5fd", fillOpacity: 0.3, weight: 1.5 }}
              />
            </>
          )}

          {/* Selected pin marker */}
          <LocationMarker
            onLocationSelect={onLocationSelect}
            noFlyZones={noFlyZones}
            userPosition={selectedPosition}
            setPosition={setSelectedPosition}
          />

          {/* Locate button (top-right, inside map) */}
          <LocateControl onLocated={(lat, lng) => setMyPosition({ lat, lng })} />
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
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white flex-shrink-0" style={{ boxShadow: "0 0 0 1.5px #3b82f6" }} />
          <span className="text-muted-foreground">Vị trí của bạn</span>
        </div>
      </div>
    </div>
  );
}
