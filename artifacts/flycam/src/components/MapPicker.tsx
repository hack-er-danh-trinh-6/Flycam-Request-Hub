import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapContainer, TileLayer, Circle, Polygon,
  Tooltip, useMap,
} from "react-leaflet";
import L, { type LatLngBoundsLiteral, type LatLngExpression } from "leaflet";
import { useGetMapConfig } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Locate, LoaderCircle, AlertTriangle, Trash2, CheckCircle } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import "@/lib/leaflet-fix";

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

const DEFAULT_CENTER: LatLngExpression = [9.9, 105.65];
const DEFAULT_BOUNDS: LatLngBoundsLiteral = [[9.15, 104.75], [10.55, 106.25]];
const ZONE_STYLE = { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.25, weight: 2.5 };

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

function polygonCentroid(latlngs: L.LatLng[]): [number, number] {
  const lat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
  const lng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;
  return [lat, lng];
}

// ─── Fly + bounds controllers ─────────────────────────────────────────────────

function MapController({ flyRef }: { flyRef: React.MutableRefObject<((lat: number, lng: number) => void) | null> }) {
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

// ─── Zone drawer (Geoman inside react-leaflet) ────────────────────────────────

function ZoneDrawer({
  zonesRef,
  allowedZoneRef,
  onZoneReady,
  onOutsideZone,
  clearSignal,
  onDrawingChange,
}: {
  zonesRef: React.MutableRefObject<object[]>;
  allowedZoneRef: React.MutableRefObject<object | null | undefined>;
  onZoneReady: (sel: LocationSelection) => void;
  onOutsideZone: (outside: boolean) => void;
  clearSignal: number;
  onDrawingChange: (drawing: boolean) => void;
}) {
  const map = useMap();
  const zoneGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawnLayerRef = useRef<L.Polygon | null>(null);

  // Set up Geoman once
  useEffect(() => {
    const zoneGroup = new L.FeatureGroup().addTo(map);
    zoneGroupRef.current = zoneGroup;

    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      drawCircle: false,
      drawRectangle: true,
      drawPolygon: true,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    map.pm.setGlobalOptions({
      snappable: false,
      allowSelfIntersection: false,
      layerGroup: zoneGroup,
      pathOptions: ZONE_STYLE,
    });

    map.on("pm:drawstart", () => {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      onDrawingChange(true);
    });

    map.on("pm:drawend", () => {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      onDrawingChange(false);
    });

    map.on("pm:create", (e) => {
      const layer = e.layer as L.Polygon;

      // Remove previous drawn zone
      if (drawnLayerRef.current) zoneGroup.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = layer;
      layer.setStyle(ZONE_STYLE);

      const rawLatlngs = layer.getLatLngs();
      const latlngs = (Array.isArray(rawLatlngs[0]) ? rawLatlngs[0] : rawLatlngs) as L.LatLng[];
      const [centLat, centLng] = polygonCentroid(latlngs);

      if (!isInsideAllowedZone(centLat, centLng, allowedZoneRef.current)) {
        onOutsideZone(true);
        return;
      }
      onOutsideZone(false);

      const restricted = isRestricted(centLat, centLng, zonesRef.current);
      const zoneGeoJson = (layer.toGeoJSON() as GeoJSON.Feature).geometry;

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${centLat}&lon=${centLng}&accept-language=vi`)
        .then((r) => r.json() as Promise<{ display_name?: string }>)
        .then((data) => {
          onZoneReady({ lat: centLat, lng: centLng, locationName: data.display_name ?? `${centLat.toFixed(5)}, ${centLng.toFixed(5)}`, isRestricted: restricted, filmingZone: zoneGeoJson });
        })
        .catch(() => {
          onZoneReady({ lat: centLat, lng: centLng, locationName: `${centLat.toFixed(5)}, ${centLng.toFixed(5)}`, isRestricted: restricted, filmingZone: zoneGeoJson });
        });
    });

    return () => {
      map.pm.removeControls();
      zoneGroup.remove();
      map.off("pm:drawstart");
      map.off("pm:drawend");
      map.off("pm:create");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Clear signal from parent
  useEffect(() => {
    if (clearSignal > 0 && zoneGroupRef.current) {
      zoneGroupRef.current.clearLayers();
      drawnLayerRef.current = null;
    }
  }, [clearSignal]);

  return null;
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

  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [outsideZone, setOutsideZone] = useState(false);
  const [hasZone, setHasZone] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [clearSignal, setClearSignal] = useState(0);

  const noFlyZones: object[] = config?.noFlyZones ?? [];
  const zonesRef = useRef<object[]>(noFlyZones);
  zonesRef.current = noFlyZones;

  const allowedZoneRef = useRef<object | null | undefined>(config?.allowedZone);
  allowedZoneRef.current = config?.allowedZone;

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

  const handleClearZone = () => {
    setClearSignal((n) => n + 1);
    setHasZone(false);
    setOutsideZone(false);
  };

  const handleZoneReady = useCallback((sel: LocationSelection) => {
    setHasZone(true);
    setOutsideZone(false);
    onLocationSelect(sel);
  }, [onLocationSelect]);

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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={handleLocate} disabled={locating} className="flex items-center gap-2">
          {locating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
          {locating ? "Đang định vị..." : "Định vị vị trí của tôi"}
        </Button>

        {hasZone && !drawing && (
          <Button type="button" variant="outline" size="sm" onClick={handleClearZone} className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Vẽ lại vùng
          </Button>
        )}

        {locateError && <span className="text-sm text-destructive">{locateError}</span>}
      </div>

      {/* Instructions */}
      <div className="flex flex-wrap items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
        {drawing
          ? <><CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" /><span>Đang vẽ — nhấp từng điểm trên bản đồ, nhấp lại điểm đầu để đóng vùng</span></>
          : hasZone
            ? <><CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-500" /><span>Vùng quay đã được chọn. Nhấn "Vẽ lại vùng" nếu muốn thay đổi.</span></>
            : <><span className="shrink-0">📐</span><span>Chọn công cụ hình chữ nhật hoặc đa giác ở bên trái bản đồ, sau đó khoanh vùng khu vực bạn muốn quay.</span></>
        }
      </div>

      {/* Outside-zone warning */}
      {outsideZone && (
        <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Vùng vẽ nằm ngoài khu vực hoạt động. Vui lòng khoanh vùng bên trong đường viền xanh lá trên bản đồ.</span>
        </div>
      )}

      {/* Map */}
      <div className="relative h-[420px] w-full rounded-md border overflow-hidden" style={{ touchAction: "none" }}>
        <MapContainer
          center={center}
          zoom={9}
          minZoom={8}
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
          <MapController flyRef={flyRef} />
          <BoundsUpdater bounds={bounds} />

          {/* Allowed zone (green dashed) */}
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

          {/* No-fly zones (red) */}
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

          {/* Blue "you are here" dot */}
          {myPos && (
            <Circle center={myPos} radius={60}
              pathOptions={{ color: "#3b82f6", fillColor: "#93c5fd", fillOpacity: 0.4, weight: 2 }}>
              <Tooltip permanent direction="top">Vị trí của bạn</Tooltip>
            </Circle>
          )}

          {/* Geoman zone drawer */}
          <ZoneDrawer
            zonesRef={zonesRef}
            allowedZoneRef={allowedZoneRef}
            onZoneReady={handleZoneReady}
            onOutsideZone={setOutsideZone}
            clearSignal={clearSignal}
            onDrawingChange={setDrawing}
          />
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-md px-3 py-2 text-xs space-y-1 shadow-md pointer-events-none">
          <p className="font-semibold text-foreground mb-1">Chú thích</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded border-2 border-blue-500 bg-blue-500/25 flex-shrink-0" />
            <span className="text-muted-foreground">Vùng muốn quay</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-red-500 bg-red-500/20 flex-shrink-0" />
            <span className="text-muted-foreground">Vùng cấm bay</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded border-2 border-dashed border-green-500 bg-green-500/10 flex-shrink-0" />
            <span className="text-muted-foreground">Vùng được phép bay</span>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-pm-toolbar .leaflet-pm-icon {
          width: 34px !important; height: 34px !important; line-height: 34px !important;
        }
        @media (max-width: 640px) {
          .leaflet-pm-toolbar .leaflet-pm-icon {
            width: 40px !important; height: 40px !important; line-height: 40px !important; font-size: 18px !important;
          }
          .leaflet-pm-toolbar a { width: 40px !important; height: 40px !important; }
        }
      `}</style>
    </div>
  );
}
