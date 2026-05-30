import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, Tooltip } from "react-leaflet";
import type { LatLngBoundsLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, locationName: string, isRestricted: boolean) => void;
  defaultLocation?: { lat: number; lng: number };
}

// Cần Thơ sau sáp nhập (gồm Hậu Giang + Sóc Trăng)
const CAN_THO_BOUNDS: LatLngBoundsLiteral = [
  [9.15, 104.75],  // Tây Nam
  [10.55, 106.25], // Đông Bắc
];

const CAN_THO_CENTER = { lat: 9.9, lng: 105.65 };

const RESTRICTED_ZONES = [
  { name: "Sân bay Quốc tế Cần Thơ", lat: 10.0853, lng: 105.7118, radius: 8000 },
];

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInRestrictedZone(lat: number, lng: number): boolean {
  return RESTRICTED_ZONES.some(
    (zone) => getDistanceMeters(lat, lng, zone.lat, zone.lng) <= zone.radius
  );
}

function LocationMarker({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number, locationName: string, isRestricted: boolean) => void;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });
      const restricted = isInRestrictedZone(lat, lng);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`
        );
        const data = await response.json();
        const name = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect(lat, lng, name, restricted);
      } catch {
        onLocationSelect(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, restricted);
      }
    },
  });

  return position === null ? null : <Marker position={position} />;
}

export function MapPicker({ onLocationSelect, defaultLocation = CAN_THO_CENTER }: MapPickerProps) {
  return (
    <div className="relative">
      <div className="h-[360px] w-full rounded-md border overflow-hidden">
        <MapContainer
          center={[defaultLocation.lat, defaultLocation.lng]}
          zoom={9}
          minZoom={9}
          maxZoom={18}
          maxBounds={CAN_THO_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Satellite base layer */}
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          {/* Roads and labels overlay */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.35}
            maxZoom={19}
          />

          {/* No-fly zones */}
          {RESTRICTED_ZONES.map((zone) => (
            <Circle
              key={zone.name}
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.18,
                weight: 2,
                dashArray: "6 4",
              }}
            >
              <Tooltip sticky>{zone.name} — Vùng cấm bay (8km)</Tooltip>
            </Circle>
          ))}

          <LocationMarker onLocationSelect={onLocationSelect} />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-md px-3 py-2 text-xs space-y-1 shadow-md pointer-events-none">
        <p className="font-semibold text-foreground mb-1">Chú thích</p>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-dashed border-red-500 bg-red-500/20 flex-shrink-0" />
          <span className="text-muted-foreground">Vùng cấm bay (sân bay, 8km)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-green-500 bg-green-500/20 flex-shrink-0" />
          <span className="text-muted-foreground">Vùng được phép bay</span>
        </div>
      </div>
    </div>
  );
}
