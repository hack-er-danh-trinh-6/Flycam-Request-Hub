import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import "@/lib/leaflet-fix";
import { Button } from "@/components/ui/button";
import { Locate, LoaderCircle, CheckCircle } from "lucide-react";

export interface MapEditorValue {
  allowedZone: object | null;
  noFlyZones: object[];
}

interface MapEditorProps {
  initialValue?: MapEditorValue;
  onChange: (value: MapEditorValue) => void;
}

export function MapEditor({ initialValue, onChange }: MapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const allowedLayerRef = useRef<L.Polygon | null>(null);
  const noFlyGroupRef = useRef<L.FeatureGroup | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError("Trình duyệt không hỗ trợ định vị");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo([latitude, longitude], 15, { animate: true, duration: 1.2 });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Chưa cấp quyền định vị"
            : "Không xác định được vị trí"
        );
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleFinishDraw = () => {
    mapRef.current?.pm.disableDraw();
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [9.9, 105.65],
      zoom: 9,
    });

    const streetLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri", maxZoom: 19 }
    );

    L.control
      .layers({ "Bản đồ đường phố": streetLayer, "Vệ tinh": satellite })
      .addTo(map);

    const noFlyGroup = new L.FeatureGroup().addTo(map);
    noFlyGroupRef.current = noFlyGroup;

    // Load initial allowed zone
    if (initialValue?.allowedZone) {
      try {
        const layer = L.geoJSON(initialValue.allowedZone as GeoJSON.GeoJsonObject, {
          style: { color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15, weight: 2 },
        }).getLayers()[0] as L.Polygon;
        layer.addTo(map);
        allowedLayerRef.current = layer;
      } catch {}
    }

    // Load initial no-fly zones
    if (initialValue?.noFlyZones) {
      for (const zone of initialValue.noFlyZones) {
        try {
          const layer = L.geoJSON(zone as GeoJSON.GeoJsonObject, {
            style: { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, weight: 2, dashArray: "6 4" },
          }).getLayers()[0] as L.Polygon;
          layer.addTo(noFlyGroup);
        } catch {}
      }
    }

    // Configure Geoman
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      drawCircle: true,
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    map.pm.setGlobalOptions({
      snappable: false,       // disable snapping — less confusing on mobile
      allowSelfIntersection: false,
      layerGroup: noFlyGroup, // Geoman adds/removes layers directly in this group
      pathOptions: {
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.2,
        dashArray: "6 4",
        weight: 2,
      },
    });

    // ── When drawing starts: disable map pan so touches go to drawing ──
    map.on("pm:drawstart", () => {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      setDrawing(true);
    });

    map.on("pm:drawend", () => {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      setDrawing(false);
    });

    function emitChange() {
      const allowedZone = allowedLayerRef.current
        ? (allowedLayerRef.current.toGeoJSON() as GeoJSON.Feature).geometry
        : null;
      const zones = noFlyGroup.getLayers().map((l) =>
        (l as L.Polygon).toGeoJSON()
      );
      onChangeRef.current({ allowedZone, noFlyZones: zones });
    }

    map.on("pm:create", (e) => {
      const layer = e.layer as L.Polygon;
      // Style the created layer (layerGroup option already placed it in noFlyGroup)
      if ("setStyle" in layer) {
        (layer as L.Polygon).setStyle({
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.2,
          dashArray: "6 4",
          weight: 2,
        });
      }
      emitChange();
    });

    map.on("pm:remove", () => emitChange());
    noFlyGroup.on("pm:remove", () => emitChange());
    noFlyGroup.on("pm:edit", () => emitChange());

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-2"
        >
          {locating
            ? <LoaderCircle className="w-4 h-4 animate-spin" />
            : <Locate className="w-4 h-4" />}
          {locating ? "Đang định vị..." : "Định vị vị trí của tôi"}
        </Button>

        {/* Shown only while actively drawing — lets mobile users finish a polygon */}
        {drawing && (
          <Button
            type="button"
            size="sm"
            onClick={handleFinishDraw}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white animate-pulse"
          >
            <CheckCircle className="w-4 h-4" />
            Kết thúc vẽ
          </Button>
        )}

        {locateError && (
          <span className="text-sm text-destructive">{locateError}</span>
        )}
      </div>

      {/* Mobile drawing tips */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded border-2 border-dashed border-red-500 bg-red-100 flex-shrink-0" />
          <span>Chọn công cụ bên trái → chạm để vẽ từng điểm → chạm điểm đầu để đóng vùng</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[520px] w-full rounded-md border overflow-hidden"
        style={{ touchAction: "none" }}
      />

      {/* Larger touch targets for Geoman toolbar on mobile (CSS injection) */}
      <style>{`
        .leaflet-pm-toolbar .leaflet-pm-icon {
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
        }
        @media (max-width: 640px) {
          .leaflet-pm-toolbar .leaflet-pm-icon {
            width: 40px !important;
            height: 40px !important;
            line-height: 40px !important;
            font-size: 18px !important;
          }
          .leaflet-pm-toolbar a {
            width: 40px !important;
            height: 40px !important;
          }
        }
      `}</style>
    </div>
  );
}
