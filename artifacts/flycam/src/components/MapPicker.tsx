import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, locationName: string, isRestricted: boolean) => void;
  defaultLocation?: { lat: number; lng: number };
}

const RESTRICTED_ZONES = [
  { name: "Sân bay Tân Sơn Nhất", lat: 10.8188, lng: 106.6519, radius: 8000 },
  { name: "Sân bay Nội Bài", lat: 21.2211, lng: 105.8047, radius: 8000 },
  { name: "Sân bay Đà Nẵng", lat: 16.0439, lng: 108.1992, radius: 8000 },
  { name: "Sân bay Phú Bài (Huế)", lat: 16.4014, lng: 107.7024, radius: 8000 },
  { name: "Sân bay Cam Ranh (Nha Trang)", lat: 11.9982, lng: 109.2193, radius: 8000 },
  { name: "Sân bay Liên Khương (Đà Lạt)", lat: 11.7500, lng: 108.3670, radius: 8000 },
  { name: "Sân bay Phù Cát (Quy Nhơn)", lat: 13.9550, lng: 109.0420, radius: 8000 },
  { name: "Sân bay Chu Lai", lat: 15.4033, lng: 108.7060, radius: 8000 },
  { name: "Sân bay Pleiku", lat: 14.0045, lng: 108.0170, radius: 8000 },
  { name: "Sân bay Buôn Ma Thuột", lat: 12.6683, lng: 108.1200, radius: 8000 },
  { name: "Sân bay Rạch Giá", lat: 9.9580, lng: 105.1323, radius: 8000 },
  { name: "Sân bay Cà Mau", lat: 9.1777, lng: 105.1773, radius: 8000 },
  { name: "Sân bay Côn Đảo", lat: 8.7317, lng: 106.6330, radius: 8000 },
  { name: "Sân bay Phú Quốc", lat: 10.2270, lng: 103.9672, radius: 8000 },
  { name: "Sân bay Vân Đồn", lat: 21.1183, lng: 107.4147, radius: 8000 },
  { name: "Sân bay Cát Bi (Hải Phòng)", lat: 20.8192, lng: 106.7247, radius: 8000 },
  { name: "Sân bay Điện Biên Phủ", lat: 21.3975, lng: 103.0083, radius: 8000 },
  { name: "Sân bay Đồng Hới", lat: 17.5150, lng: 106.5906, radius: 8000 },
  { name: "Sân bay Tuy Hòa", lat: 13.0495, lng: 109.3337, radius: 8000 },
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

export function MapPicker({ onLocationSelect, defaultLocation = { lat: 16.047079, lng: 108.20623 } }: MapPickerProps) {
  return (
    <div className="relative">
      <div className="h-[360px] w-full rounded-md border overflow-hidden">
        <MapContainer
          center={[defaultLocation.lat, defaultLocation.lng]}
          zoom={6}
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
