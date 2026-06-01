import { useGetQueue, useGetQueueStats } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Plane, CheckCircle2, Clock, MapPin, User, Video,
  List, XCircle, Ban, AlertCircle, Calendar, Hash,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Status = "pending" | "approved" | "filming" | "completed" | "rejected" | "cancelled" | string;

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  rowClass: string;
  rankClass: string;
  dot?: boolean;
}> = {
  filming: {
    label: "Đang quay",
    badgeClass: "bg-orange-500 hover:bg-orange-500 text-white",
    rowClass: "border-orange-300 shadow-orange-100 shadow-md",
    rankClass: "bg-gradient-to-b from-orange-500 to-orange-600 text-white",
    dot: true,
  },
  approved: {
    label: "Đã duyệt",
    badgeClass: "bg-blue-500 hover:bg-blue-500 text-white",
    rowClass: "border-blue-200 shadow-blue-50 shadow-sm",
    rankClass: "bg-blue-50 text-blue-500",
  },
  pending: {
    label: "Chờ duyệt",
    badgeClass: "bg-amber-400 hover:bg-amber-400 text-white",
    rowClass: "border-amber-200 shadow-sm",
    rankClass: "bg-amber-50 text-amber-500",
  },
  completed: {
    label: "Hoàn thành",
    badgeClass: "bg-emerald-500 hover:bg-emerald-500 text-white",
    rowClass: "border-emerald-200 shadow-emerald-50 shadow-sm",
    rankClass: "bg-emerald-50 text-emerald-500",
  },
  rejected: {
    label: "Từ chối",
    badgeClass: "bg-red-400 hover:bg-red-400 text-white",
    rowClass: "border-red-200 shadow-sm opacity-75",
    rankClass: "bg-red-50 text-red-400",
  },
  cancelled: {
    label: "Đã hủy",
    badgeClass: "bg-slate-400 hover:bg-slate-400 text-white",
    rowClass: "border-slate-200 shadow-sm opacity-60",
    rankClass: "bg-slate-50 text-slate-400",
  },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badgeClass: "bg-slate-400 text-white", dot: false };
  return (
    <Badge className={`${cfg.badgeClass} text-xs px-2.5 py-1 gap-1.5 font-semibold`}>
      {cfg.dot && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {cfg.label}
    </Badge>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-2xl ${color}`}>
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="text-[11px] mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

export default function Queue() {
  const { data: queue, isLoading } = useGetQueue();
  const { data: stats } = useGetQueueStats();

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Hero header */}
      <div className="hero-gradient text-white px-4 pt-8 pb-6">
        <div className="container max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20">
              <List className="w-5 h-5 text-orange-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Tất cả yêu cầu quay</h1>
              <p className="text-slate-300 text-xs mt-0.5">
                {queue?.length ?? 0} yêu cầu tổng cộng
              </p>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="flex gap-2 flex-wrap">
              <StatPill label="Đang quay" value={stats.filming} color="bg-orange-500/30 text-white" />
              <StatPill label="Đã duyệt"  value={stats.approved} color="bg-blue-500/30 text-white" />
              <StatPill label="Chờ duyệt" value={stats.pending}  color="bg-amber-400/30 text-white" />
              <StatPill label="Hoàn thành" value={stats.completed} color="bg-emerald-500/30 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="container max-w-2xl mx-auto py-5 px-4 space-y-3">
        {!queue?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-600 mb-1">Chưa có yêu cầu nào</h3>
            <p className="text-slate-400 text-sm">Hiện chưa có yêu cầu quay nào được gửi.</p>
          </div>
        ) : (
          queue.map((entry, index) => {
            const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
            const isFilming = entry.status === "filming";
            const isCompleted = entry.status === "completed";

            return (
              <div
                key={entry.id}
                className={`relative rounded-2xl overflow-hidden border bg-white transition-all duration-200 ${cfg.rowClass}`}
              >
                {isFilming && (
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-50/70 to-transparent pointer-events-none" />
                )}
                {isCompleted && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-transparent pointer-events-none" />
                )}

                <div className="flex items-stretch">
                  {/* Rank / icon column */}
                  <div className={`flex flex-col items-center justify-center w-14 shrink-0 gap-1 py-4 ${cfg.rankClass}`}>
                    {isFilming ? (
                      <Plane className="w-5 h-5 animate-pulse" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : entry.status === "cancelled" ? (
                      <Ban className="w-4 h-4" />
                    ) : entry.status === "rejected" ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-lg font-bold leading-none">#{index + 1}</span>
                    )}
                    {entry.queuePosition != null && !isFilming && (
                      <span className="text-[10px] opacity-60 font-medium">Q{entry.queuePosition}</span>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-4 min-w-0 border-l border-slate-100">
                    {/* Top row: name + badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm text-slate-800 leading-snug line-clamp-2 flex-1">
                        {entry.locationName}
                      </h3>
                      <StatusBadge status={entry.status} />
                    </div>

                    {/* Meta info grid */}
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-600">{entry.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ID: {entry.id}</span>
                        <span className="mx-1 text-slate-300">·</span>
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </span>
                      </div>

                      {entry.scheduledAt && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Lịch quay: {format(new Date(entry.scheduledAt), "dd/MM/yyyy HH:mm", { locale: vi })}</span>
                        </div>
                      )}

                      {entry.cancellationReason && (
                        <div className="flex items-start gap-1.5 text-xs text-red-500 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="italic">"{entry.cancellationReason}"</span>
                        </div>
                      )}
                    </div>

                    {/* Video button */}
                    {entry.videoUrl && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl"
                        >
                          <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="w-3.5 h-3.5 mr-1.5" />
                            Xem video hoàn thành
                          </a>
                        </Button>
                      </div>
                    )}
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
