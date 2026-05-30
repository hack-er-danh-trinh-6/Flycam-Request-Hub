import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import "@/lib/leaflet-fix";

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [9.9, 105.65],
      zoom: 9,
    });

    // CartoDB Voyager — clean, official-looking OSM-based map
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }
    ).addTo(map);

    // Satellite toggle layer
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri", maxZoom: 19 }
    );

    L.control
      .layers({ "Bản đồ đường phố": L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 20 }).addTo(map) as L.TileLayer, "Vệ tinh": satellite })
      .addTo(map);

    const noFlyGroup = new L.FeatureGroup().addTo(map);
    noFlyGroupRef.current = noFlyGroup;

    // Load initial allowed zone
    if (initialValue?.allowedZone) {
      try {
        const geoJson = initialValue.allowedZone as GeoJSON.Polygon;
        const layer = L.geoJSON(geoJson, {
          style: { color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15, weight: 2 },
        }).getLayers()[0] as L.Polygon;
        layer.addTo(map);
        allowedLayerRef.current = layer;
        (layer as L.Polygon & { options: { pmIgnore?: boolean } }).options.pmIgnore = false;
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

    // Set draw mode defaults — no-fly zones are red by default
    map.pm.setGlobalOptions({
      pathOptions: {
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.2,
        dashArray: "6 4",
        weight: 2,
      },
      layerGroup: noFlyGroup,
    });

    function emitChange() {
      const allowedZone = allowedLayerRef.current
        ? (allowedLayerRef.current.toGeoJSON() as GeoJSON.Feature).geometry
        : null;
      const noFlyZones = noFlyGroup.getLayers().map((l) =>
        (l as L.Polygon).toGeoJSON()
      );
      onChangeRef.current({ allowedZone, noFlyZones });
    }

    map.on("pm:create", (e) => {
      const layer = e.layer as L.Polygon;
      noFlyGroup.addLayer(layer);
      map.removeLayer(layer);
      emitChange();
    });

    map.on("pm:remove", () => emitChange());
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
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded border-2 border-dashed border-red-500 bg-red-100 flex-shrink-0" />
          <span>Vùng cấm bay — vẽ bằng Polygon / Rectangle / Circle</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">Xoá</span>
          <span>Click nút thùng rác để xoá vùng</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[520px] w-full rounded-md border overflow-hidden"
      />
    </div>
  );
}
