import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, locationName: string) => void;
  defaultLocation?: { lat: number; lng: number };
}

function LocationMarker({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number, locationName: string) => void;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });

      try {
        // Reverse geocoding using Nominatim
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        const name = data.display_name || "Unknown Location";
        onLocationSelect(lat, lng, name);
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        onLocationSelect(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    },
  });

  return position === null ? null : <Marker position={position} />;
}

export function MapPicker({
  onLocationSelect,
  defaultLocation = { lat: 10.762622, lng: 106.660172 }, // Default to HCMC
}: MapPickerProps) {
  return (
    <div className="h-[300px] w-full rounded-md border overflow-hidden">
      <MapContainer
        center={[defaultLocation.lat, defaultLocation.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}
