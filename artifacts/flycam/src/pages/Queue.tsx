import { useGetQueue } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Plane, CheckCircle2, Clock, MapPin, User, Video, List, XCircle, Ban, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusBadge({ status, rank }: { status: string; rank: number }) {
  switch (status) {
    case "filming":
      return (
        <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs px-2.5 py-1">
          <span className="ring-pulse inline-block w-1.5 h-1.5 rounded-full bg-white mr-1.5" />
          Đang quay
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="w-3 h-3 mr-1" />
          {rank === 1 ? "Tiếp theo" : "Đã duyệt"}
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Chờ duyệt
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs px-2.5 py-1">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Hoàn thành
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Từ chối
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-slate-100 text-slate-500 border-slate-200">
          <Ban className="w-3 h-3 mr-1" />
          Đã hủy
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs px-2.5 py-1">
          {status}
        </Badge>
      );
  }
}

export default function Queue() {
  const { data: queue, isLoading } = useGetQueue();

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4 space-y-4">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="hero-gradient text-white px-4 py-10">
        <div className="container max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-white/10 rounded-xl border border-white/10">
              <List className="w-5 h-5 text-orange-200" />
            </div>
            <h1 className="text-2xl font-bold">Tất cả yêu cầu quay</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Danh sách tất cả yêu cầu — đang quay, chờ duyệt, hoàn thành và đã hủy.
          </p>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto py-6 px-4 space-y-3">
        {!queue?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-600 mb-1">Chưa có yêu cầu nào</h3>
            <p className="text-slate-400 text-sm">Hiện chưa có yêu cầu quay nào được gửi.</p>
          </div>
        ) : (
          queue.map((entry, index) => {
            const isFilming = entry.status === "filming";
            const isCompleted = entry.status === "completed";
            const isCancelledOrRejected = entry.status === "cancelled" || entry.status === "rejected";
            const rank = index + 1;

            return (
              <div
                key={entry.id}
                className={`relative rounded-2xl overflow-hidden border bg-white transition-all duration-200 card-lift ${
                  isFilming
                    ? "border-orange-300 shadow-md shadow-orange-100"
                    : isCompleted
                    ? "border-emerald-200 shadow-sm"
                    : isCancelledOrRejected
                    ? "border-slate-200 shadow-sm opacity-70"
                    : "border-slate-200 shadow-sm"
                }`}
              >
                {isFilming && (
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-50/80 to-transparent pointer-events-none" />
                )}
                {isCompleted && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/60 to-transparent pointer-events-none" />
                )}

                <div className="flex items-stretch">
                  {/* Rank column */}
                  <div className={`flex items-center justify-center w-16 shrink-0 text-xl font-bold ${
                    isFilming
                      ? "bg-gradient-to-b from-orange-500 to-orange-600 text-white"
                      : isCompleted
                      ? "bg-emerald-50 text-emerald-500"
                      : isCancelledOrRejected
                      ? "bg-slate-50 text-slate-300"
                      : rank === 1
                      ? "bg-amber-50 text-amber-500"
                      : "bg-slate-50 text-slate-400"
                  }`}>
                    {isFilming
                      ? <Plane className="w-6 h-6 animate-pulse" />
                      : isCompleted
                      ? <CheckCircle2 className="w-6 h-6" />
                      : `#${rank}`
                    }
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-slate-800">
                          {entry.locationName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className="flex items-center text-xs text-slate-400 gap-1">
                            <User className="w-3 h-3" /> {entry.name}
                          </span>
                          <span className="flex items-center text-xs text-slate-400 gap-1">
                            <MapPin className="w-3 h-3" />
                            {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                          </span>
                        </div>
                        {entry.cancellationReason && (
                          <p className="text-xs text-red-400 mt-1 italic">"{entry.cancellationReason}"</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={entry.status} rank={rank} />

                        {entry.scheduledAt && (
                          <p className="text-xs text-slate-500 font-medium">
                            {format(new Date(entry.scheduledAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </p>
                        )}

                        {entry.videoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl"
                          >
                            <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="w-3.5 h-3.5 mr-1.5" /> Xem video
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
