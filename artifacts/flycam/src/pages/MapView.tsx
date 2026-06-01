import { useGetQueue } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-fix";
import { Video, MapPin, User, Calendar, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useMemo } from "react";

const completedIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:36px;height:36px;
    background:linear-gradient(135deg,#f97316,#ea580c);
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  ">
    <div style="
      transform:rotate(45deg);
      display:flex;align-items:center;justify-content:center;
      width:100%;height:100%;
      color:white;font-size:14px;font-weight:bold;
    ">✓</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

export default function MapView() {
  const { data: queue, isLoading } = useGetQueue();

  const completed = useMemo(
    () => (queue ?? []).filter((e) => e.status === "completed"),
    [queue]
  );

  const center = useMemo(() => {
    if (!completed.length) return [10.0341, 105.7767] as [number, number];
    const avgLat = completed.reduce((s, e) => s + e.latitude, 0) / completed.length;
    const avgLng = completed.reduce((s, e) => s + e.longitude, 0) / completed.length;
    return [avgLat, avgLng] as [number, number];
  }, [completed]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-65px)]">
      {/* Header */}
      <div className="hero-gradient text-white px-4 py-5 shrink-0">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/15 rounded-xl border border-white/20">
                <Map className="w-5 h-5 text-orange-200" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Bản đồ video</h1>
                <p className="text-slate-300 text-xs mt-0.5">
                  {isLoading ? "Đang tải..." : `${completed.length} địa điểm đã quay`}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/15">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="text-xs text-orange-100 font-medium">Đã hoàn thành</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 p-4">
          <Skeleton className="w-full h-full rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative min-h-[300px]">
            <MapContainer
              center={center}
              zoom={completed.length ? 12 : 10}
              className="w-full h-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <TileLayer
                attribution=""
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                opacity={0.8}
              />

              {completed.map((entry) => (
                <Marker
                  key={entry.id}
                  position={[entry.latitude, entry.longitude]}
                  icon={completedIcon}
                >
                  <Popup maxWidth={280} className="rounded-2xl">
                    <div className="p-1 min-w-[220px]">
                      {/* Location */}
                      <div className="flex items-start gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {entry.locationName}
                        </p>
                      </div>

                      {/* Meta */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{entry.name}</span>
                        </div>
                        {entry.scheduledAt && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {format(new Date(entry.scheduledAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}</span>
                        </div>
                      </div>

                      {/* Video button */}
                      {entry.videoUrl ? (
                        <Button
                          asChild
                          size="sm"
                          className="w-full h-9 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
                        >
                          <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="w-3.5 h-3.5 mr-1.5" />
                            Xem video
                          </a>
                        </Button>
                      ) : (
                        <div className="text-center text-xs text-slate-400 py-1">Chưa có video</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Empty state overlay */}
            {completed.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-[1000]">
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Map className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-600 text-sm">Chưa có video nào</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Bản đồ sẽ hiển thị khi có yêu cầu hoàn thành.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar list (desktop) */}
          {completed.length > 0 && (
            <div className="hidden md:flex flex-col w-72 bg-white border-l border-slate-200 overflow-y-auto shrink-0">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 sticky top-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {completed.length} địa điểm
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {completed.map((entry) => (
                  <div key={entry.id} className="px-4 py-3 hover:bg-orange-50/50 transition-colors">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug mb-1">
                      {entry.locationName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                      <User className="w-3 h-3" />
                      <span>{entry.name}</span>
                    </div>
                    {entry.scheduledAt && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(entry.scheduledAt), "dd/MM/yyyy", { locale: vi })}</span>
                      </div>
                    )}
                    {entry.videoUrl && (
                      <a
                        href={entry.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-orange-600 font-semibold hover:underline"
                      >
                        <Video className="w-3 h-3" /> Xem video
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
