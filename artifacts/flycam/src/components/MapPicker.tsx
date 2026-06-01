import { useState, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Circle, Polygon,
  Tooltip, useMapEvents, useMap,
} from "react-leaflet";
import L, { type LatLngBoundsLiteral, type LatLngExpression } from "leaflet";
import { useGetMapConfig } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Locate, LoaderCircle, AlertTriangle, Trash2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";
import { useEffect } from "react";

export interface LocationSelection {
  lat: number;
  lng: number;
  locationName: string;
  isRestricted: boolean;
  filmingZone: object;
}

interface MapPickerProps {
  onLocationSelect: (sel: LocationSelection) => void;
}

const DEFAULT_CENTER: LatLngExpression = [16.0, 106.0];
const DEFAULT_BOUNDS: LatLngBoundsLiteral = [[8.0, 102.0], [23.5, 110.0]];

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

function pointInGeoJsonPolygon(pointLat: number, pointLng: number, coords: number[][][]): boolean {
  const ring = coords[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [vLng1, vLat1] = ring[i];
    const [vLng2, vLat2] = ring[j];
    const intersect =
      vLat1 > pointLat !== vLat2 > pointLat &&
      pointLng < ((vLng2 - vLng1) * (pointLat - vLat1)) / (vLat2 - vLat1) + vLng1;
    if (intersect) inside = !inside;
  }
  return inside;
}

type GeoFeature = { type: "Feature"; geometry: { type: string; coordinates: number[][][] } };
type GeoPolygon = { type: "Polygon"; coordinates: number[][][] };

function extractCoords(obj: object): number[][][] | null {
  const z = obj as GeoFeature | GeoPolygon | Record<string, unknown>;
  if ((z as GeoFeature).type === "Feature") {
    const geom = (z as GeoFeature).geometry;
    if (geom?.type === "Polygon") return geom.coordinates;
  } else if ((z as GeoPolygon).type === "Polygon") {
    return (z as GeoPolygon).coordinates;
  }
  return null;
}

function isRestricted(lat: number, lng: number, zones: object[]): boolean {
  if (FALLBACK_ZONES.some((z) => getDistanceMeters(lat, lng, z.lat, z.lng) <= z.radius)) return true;
  for (const zone of zones) {
    const coords = extractCoords(zone);
    if (coords && pointInGeoJsonPolygon(lat, lng, coords)) return true;
  }
  return false;
}

function isInsideAllowedZone(lat: number, lng: number, allowedZone: object | null | undefined): boolean {
  if (!allowedZone) return true;
  const coords = extractCoords(allowedZone);
  if (!coords) return true;
  return pointInGeoJsonPolygon(lat, lng, coords);
}

// ─── Fly + bounds controllers ─────────────────────────────────────────────────

function FlyController({ flyRef }: { flyRef: React.MutableRefObject<((lat: number, lng: number) => void) | null> }) {
  const map = useMap();
  useEffect(() => {
    flyRef.current = (lat, lng) => map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
    return () => { flyRef.current = null; };
  }, [map, flyRef]);
  return null;
}

function BoundsUpdater({ bounds }: { bounds: LatLngBoundsLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.setMaxBounds(bounds);
  }, [bounds, map]);
  return null;
}

// ─── Tap-to-place handler ─────────────────────────────────────────────────────

function TapHandler({
  allowedZoneRef,
  onTap,
}: {
  allowedZoneRef: React.MutableRefObject<object | null | undefined>;
  onTap: (lat: number, lng: number, inside: boolean) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      const inside = isInsideAllowedZone(lat, lng, allowedZoneRef.current);
      onTap(lat, lng, inside);
    },
  });
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000];

export function MapPicker({ onLocationSelect }: MapPickerProps) {
  const { data: config } = useGetMapConfig();
  const flyRef = useRef<((lat: number, lng: number) => void) | null>(null);

  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusIdx, setRadiusIdx] = useState(3); // default 500 m
  const [outsideZone, setOutsideZone] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const noFlyZones: object[] = config?.noFlyZones ?? [];
  const zonesRef = useRef<object[]>(noFlyZones);
  zonesRef.current = noFlyZones;

  const allowedZoneRef = useRef<object | null | undefined>(config?.allowedZone);
  allowedZoneRef.current = config?.allowedZone;

  const radius = RADIUS_OPTIONS[radiusIdx];

  const fireCallback = useCallback((lat: number, lng: number, r: number) => {
    const restricted = isRestricted(lat, lng, zonesRef.current);
    const filmingZone = { type: "Circle", coordinates: [lng, lat], radius: r };
    setGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`)
      .then((res) => res.json() as Promise<{ display_name?: string }>)
      .then((data) => {
        onLocationSelect({ lat, lng, locationName: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, isRestricted: restricted, filmingZone });
      })
      .catch(() => {
        onLocationSelect({ lat, lng, locationName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, isRestricted: restricted, filmingZone });
      })
      .finally(() => setGeocoding(false));
  }, [onLocationSelect]);

  const handleTap = useCallback((lat: number, lng: number, inside: boolean) => {
    if (!inside) {
      setOutsideZone(true);
      return;
    }
    setOutsideZone(false);
    setCenter({ lat, lng });
    fireCallback(lat, lng, RADIUS_OPTIONS[radiusIdx]);
  }, [fireCallback, radiusIdx]);

  const handleRadiusChange = (vals: number[]) => {
    const idx = vals[0];
    setRadiusIdx(idx);
    if (center) fireCallback(center.lat, center.lng, RADIUS_OPTIONS[idx]);
  };

  const handleClear = () => {
    setCenter(null);
    setOutsideZone(false);
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
  let mapCenter: LatLngExpression = DEFAULT_CENTER;
  if (config?.allowedZone) {
    const az = config.allowedZone as { type?: string; coordinates?: number[][][] };
    if (az.type === "Polygon" && az.coordinates) {
      const ring = az.coordinates[0];
      const lats = ring.map((p) => p[1]);
      const lngs = ring.map((p) => p[0]);
      bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
      mapCenter = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
    }
  }

  return (
    <div className="space-y-3">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleLocate} disabled={locating} className="flex items-center gap-2">
          {locating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
          {locating ? "Đang định vị..." : "Định vị của tôi"}
        </Button>
        {center && (
          <Button type="button" variant="outline" size="sm" onClick={handleClear} className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Chọn lại
          </Button>
        )}
        {locateError && <span className="text-sm text-destructive">{locateError}</span>}
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-2 rounded-md bg-orange-50 border border-orange-200 px-3 py-2.5 text-sm text-orange-800">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="min-w-0 break-words">
          {center
            ? "Vùng quay đã chọn. Dùng thanh bên dưới để điều chỉnh bán kính, hoặc nhấp lại để đổi vị trí."
            : <><strong>Nhấp/chạm vào bản đồ</strong> để chọn tâm vùng quay.</>
          }
        </span>
      </div>

      {/* Outside-zone warning */}
      {outsideZone && (
        <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Vị trí này nằm ngoài khu vực hoạt động. Vui lòng chọn điểm trong vùng xanh lá trên bản đồ.</span>
        </div>
      )}

      {/* Map */}
      <div className="relative h-[400px] w-full rounded-md border overflow-hidden" style={{ touchAction: center ? "pan-x pan-y" : "none", isolation: "isolate" }}>
        <MapContainer
          center={mapCenter}
          zoom={6}
          minZoom={5}
          maxZoom={21}
          maxBounds={bounds}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
            url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={["0", "1", "2", "3"]}
            maxZoom={21}
          />
          <FlyController flyRef={flyRef} />
          <BoundsUpdater bounds={bounds} />
          <TapHandler allowedZoneRef={allowedZoneRef} onTap={handleTap} />

          {/* Allowed zone boundary */}
          {config?.allowedZone && (() => {
            const az = config.allowedZone as { type?: string; coordinates?: number[][][] };
            if (az.type === "Polygon" && az.coordinates) {
              const positions: LatLngExpression[] = az.coordinates[0].map(([lng, lat]) => [lat, lng]);
              return (
                <Polygon positions={positions} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.06, weight: 2.5, dashArray: "8 4" }}>
                  <Tooltip>Vùng được phép bay</Tooltip>
                </Polygon>
              );
            }
            return null;
          })()}

          {/* No-fly zones */}
          {noFlyZones.map((zone, i) => {
            const coords = extractCoords(zone);
            if (!coords) return null;
            const positions: LatLngExpression[] = coords[0].map(([lng, lat]) => [lat, lng]);
            return (
              <Polygon key={i} positions={positions} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, weight: 2, dashArray: "6 4" }}>
                <Tooltip>Vùng cấm bay</Tooltip>
              </Polygon>
            );
          })}

          {/* Fallback airport circles */}
          {FALLBACK_ZONES.map((zone) => (
            <Circle key={zone.name} center={[zone.lat, zone.lng]} radius={zone.radius}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.18, weight: 2, dashArray: "6 4" }}>
              <Tooltip sticky>{zone.name} — Vùng cấm bay (8km)</Tooltip>
            </Circle>
          ))}

          {/* My location */}
          {myPos && (
            <Circle center={myPos} radius={60}
              pathOptions={{ color: "#3b82f6", fillColor: "#93c5fd", fillOpacity: 0.4, weight: 2 }}>
              <Tooltip permanent direction="top">Vị trí của bạn</Tooltip>
            </Circle>
          )}

          {/* Selected filming zone */}
          {center && (
            <Circle
              center={center}
              radius={radius}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.25, weight: 2.5 }}
            >
              <Tooltip permanent direction="top">Vùng quay ({radius >= 1000 ? `${radius / 1000} km` : `${radius} m`})</Tooltip>
            </Circle>
          )}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-md px-3 py-2 text-xs space-y-1 shadow-md pointer-events-none">
          <p className="font-semibold text-foreground mb-1">Chú thích</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-orange-500 bg-orange-500/25 flex-shrink-0" />
            <span className="text-muted-foreground">Vùng muốn quay</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-red-500 bg-red-500/20 flex-shrink-0" />
            <span className="text-muted-foreground">Vùng cấm bay</span>
          </div>
          {config?.allowedZone && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-green-500 bg-green-500/10 flex-shrink-0" />
              <span className="text-muted-foreground">Vùng được phép bay</span>
            </div>
          )}
        </div>
      </div>

      {/* Radius slider — only shown after a point is selected */}
      {center && (
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Bán kính vùng quay</span>
            <span className="font-semibold text-foreground tabular-nums">
              {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
              {geocoding && <LoaderCircle className="inline ml-2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </span>
          </div>
          <Slider
            min={0}
            max={RADIUS_OPTIONS.length - 1}
            step={1}
            value={[radiusIdx]}
            onValueChange={handleRadiusChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-0.5">
            <span>100 m</span>
            <span>500 m</span>
            <span>1 km</span>
            <span>3 km</span>
          </div>
        </div>
      )}
    </div>
  );
}
