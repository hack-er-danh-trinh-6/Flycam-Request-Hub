import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import "@/lib/leaflet-fix";
import { Button } from "@/components/ui/button";
import { Locate, LoaderCircle, CheckCircle, Pencil, Trash2, SquareDashedBottom } from "lucide-react";

export interface MapEditorValue {
  allowedZone: object | null;
  noFlyZones: object[];
}

interface MapEditorProps {
  initialValue?: MapEditorValue;
  onChange: (value: MapEditorValue) => void;
}

const ALLOWED_STYLE = { color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15, weight: 2.5 };
const NO_FLY_STYLE  = { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.2, dashArray: "6 4", weight: 2 };

export function MapEditor({ initialValue, onChange }: MapEditorProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const allowedLayerRef = useRef<L.Polygon | null>(null);
  const noFlyGroupRef   = useRef<L.FeatureGroup | null>(null);
  const allowedGroupRef = useRef<L.FeatureGroup | null>(null);
  const onChangeRef     = useRef(onChange);
  onChangeRef.current   = onChange;

  // Stable emitChange accessible outside useEffect
  const emitChangeRef = useRef<() => void>(() => {});

  // Whether we're currently drawing the allowed zone (vs a no-fly zone)
  const isDrawingAllowedRef = useRef(false);

  const [locating,      setLocating]      = useState(false);
  const [locateError,   setLocateError]   = useState<string | null>(null);
  const [drawing,       setDrawing]       = useState(false);
  const [drawingAllowed, setDrawingAllowed] = useState(false);
  const [hasAllowedZone, setHasAllowedZone] = useState(!!initialValue?.allowedZone);

  // ── Locate ────────────────────────────────────────────────────────────────

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError("Trình duyệt không hỗ trợ định vị");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true, duration: 1.2 });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED ? "Chưa cấp quyền định vị" : "Không xác định được vị trí");
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  };

  // ── Finish draw (mobile helper) ───────────────────────────────────────────

  const handleFinishDraw = () => {
    mapRef.current?.pm.disableDraw();
  };

  // ── Draw allowed zone ─────────────────────────────────────────────────────

  const handleDrawAllowedZone = () => {
    const map = mapRef.current;
    const allowedGroup = allowedGroupRef.current;
    if (!map || !allowedGroup) return;
    isDrawingAllowedRef.current = true;
    setDrawingAllowed(true);
    // Switch Geoman's target to the allowed group so the new polygon lands there
    map.pm.setGlobalOptions({
      layerGroup: allowedGroup,
      pathOptions: ALLOWED_STYLE,
    });
    map.pm.enableDraw("Polygon");
  };

  // ── Clear allowed zone ────────────────────────────────────────────────────

  const handleClearAllowedZone = () => {
    allowedGroupRef.current?.clearLayers();
    allowedLayerRef.current = null;
    setHasAllowedZone(false);
    emitChangeRef.current();
  };

  // ── Map setup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [9.9, 105.65], zoom: 9 });

    const streetLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri", maxZoom: 19 }
    );

    L.control.layers({ "Bản đồ đường phố": streetLayer, "Vệ tinh": satellite }).addTo(map);

    // Feature groups
    const allowedGroup = new L.FeatureGroup().addTo(map);
    const noFlyGroup   = new L.FeatureGroup().addTo(map);
    allowedGroupRef.current = allowedGroup;
    noFlyGroupRef.current   = noFlyGroup;

    // Load initial allowed zone
    if (initialValue?.allowedZone) {
      try {
        const layer = L.geoJSON(initialValue.allowedZone as GeoJSON.GeoJsonObject, {
          style: ALLOWED_STYLE,
        }).getLayers()[0] as L.Polygon;
        allowedGroup.addLayer(layer);
        allowedLayerRef.current = layer;
      } catch {}
    }

    // Load initial no-fly zones
    if (initialValue?.noFlyZones) {
      for (const zone of initialValue.noFlyZones) {
        try {
          const layer = L.geoJSON(zone as GeoJSON.GeoJsonObject, {
            style: NO_FLY_STYLE,
          }).getLayers()[0] as L.Polygon;
          noFlyGroup.addLayer(layer);
        } catch {}
      }
    }

    // Configure Geoman — default target is noFlyGroup
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
      snappable: false,
      allowSelfIntersection: false,
      layerGroup: noFlyGroup,
      pathOptions: NO_FLY_STYLE,
    });

    // ── Drawing lifecycle ───────────────────────────────────────────────────

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
      // If the user cancelled the allowed-zone draw without completing it, reset
      if (isDrawingAllowedRef.current) {
        isDrawingAllowedRef.current = false;
        setDrawingAllowed(false);
        map.pm.setGlobalOptions({ layerGroup: noFlyGroup, pathOptions: NO_FLY_STYLE });
      }
    });

    // ── emitChange ─────────────────────────────────────────────────────────

    function emitChange() {
      const allowedZone = allowedLayerRef.current
        ? (allowedLayerRef.current.toGeoJSON() as GeoJSON.Feature).geometry
        : null;
      const zones = noFlyGroup.getLayers().map((l) => (l as L.Polygon).toGeoJSON());
      onChangeRef.current({ allowedZone, noFlyZones: zones });
    }
    emitChangeRef.current = emitChange;

    // ── pm:create ──────────────────────────────────────────────────────────

    map.on("pm:create", (e) => {
      const layer = e.layer as L.Polygon;

      if (isDrawingAllowedRef.current) {
        // This polygon is the allowed zone
        isDrawingAllowedRef.current = false;
        setDrawingAllowed(false);

        // Clear any previous allowed zone
        allowedGroup.clearLayers();
        layer.setStyle(ALLOWED_STYLE);
        // layer is already in allowedGroup (via layerGroup option)
        allowedLayerRef.current = layer;
        setHasAllowedZone(true);

        // Restore noFlyGroup as the Geoman target
        map.pm.setGlobalOptions({ layerGroup: noFlyGroup, pathOptions: NO_FLY_STYLE });
      } else {
        // Regular no-fly zone
        if ("setStyle" in layer) layer.setStyle(NO_FLY_STYLE);
      }

      emitChange();
    });

    // ── Change listeners ───────────────────────────────────────────────────

    map.on("pm:remove",       () => emitChange());
    noFlyGroup.on("pm:remove", () => emitChange());
    noFlyGroup.on("pm:edit",   () => emitChange());

    allowedGroup.on("pm:remove", () => {
      allowedLayerRef.current = null;
      setHasAllowedZone(false);
      emitChange();
    });
    allowedGroup.on("pm:edit", () => emitChange());

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Toolbar row 1: locate + finish-draw helper */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-2"
        >
          {locating ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
          {locating ? "Đang định vị..." : "Định vị vị trí của tôi"}
        </Button>

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

        {locateError && <span className="text-sm text-destructive">{locateError}</span>}
      </div>

      {/* Toolbar row 2: allowed zone controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
        <SquareDashedBottom className="w-4 h-4 text-green-700 shrink-0" />
        <span className="text-sm font-medium text-green-800 mr-1">Vùng hoạt động:</span>

        {!drawingAllowed ? (
          <Button
            type="button"
            size="sm"
            onClick={handleDrawAllowedZone}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            <Pencil className="w-3.5 h-3.5" />
            {hasAllowedZone ? "Vẽ lại vùng" : "Vẽ vùng hoạt động"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleFinishDraw}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white animate-pulse"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Kết thúc vẽ vùng
          </Button>
        )}

        {hasAllowedZone && !drawingAllowed && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClearAllowedZone}
            className="flex items-center gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa vùng
          </Button>
        )}

        <p className="w-full text-xs text-green-700 mt-0.5">
          {drawingAllowed
            ? "Nhấp từng điểm trên bản đồ → nhấp điểm đầu để đóng vùng hoạt động (màu xanh)"
            : hasAllowedZone
              ? "Người dùng chỉ thấy và chọn địa điểm trong vùng xanh này."
              : "Vẽ vùng khu vực bạn hoạt động. Người dùng sẽ bị giới hạn chỉ chọn trong vùng này."}
        </p>
      </div>

      {/* Tip for no-fly zones */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded border-2 border-dashed border-red-500 bg-red-100 flex-shrink-0" />
          <span>Dùng công cụ bên trái bản đồ để vẽ vùng cấm bay (màu đỏ)</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[520px] w-full rounded-md border overflow-hidden"
        style={{ touchAction: "none" }}
      />

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
