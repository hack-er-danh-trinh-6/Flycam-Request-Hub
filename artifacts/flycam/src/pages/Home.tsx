import { useState, useRef } from "react";
import { useGetQueue, useGetQueueStats, useCreateRequest, getGetMyRequestQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPicker, type LocationSelection } from "@/components/MapPicker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Plane, Activity, Clock, AlertTriangle, MapPin,
  LoaderCircle, PlaneTakeoff, ChevronRight, User, Mail,
  ArrowRight, CheckCircle2, XCircle, Ban, Calendar,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@workspace/api-client-react";

const formSchema = z.object({
  name: z.string().min(2, "Vui lòng nhập tên (ít nhất 2 ký tự)."),
  email: z.string().email("Vui lòng nhập email hợp lệ."),
  locationName: z.string().min(1, "Vui lòng chọn vị trí trên bản đồ."),
  latitude: z.number(),
  longitude: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: queueStats } = useGetQueueStats();
  const { data: queue } = useGetQueue();
  const createRequest = useCreateRequest();

  const [isRestrictedZone, setIsRestrictedZone] = useState(false);
  const [filmingZone, setFilmingZone] = useState<object | null>(null);
  const [zoneError, setZoneError] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const pendingDataRef = useRef<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", locationName: "", latitude: 0, longitude: 0 },
  });

  const submitRequest = (data: FormValues) => {
    createRequest.mutate(
      { data: { ...data, filmingZone: filmingZone as Record<string, unknown> } },
      {
        onSuccess: () => {
          toast({ title: "Đã gửi yêu cầu!", description: "Yêu cầu quay flycam của bạn đã được ghi nhận." });
          queryClient.invalidateQueries({ queryKey: getGetMyRequestQueryKey() });
          setLocation("/status");
        },
        onError: (err) => {
          const apiErr = err as ApiError;
          if (apiErr.status === 409) {
            pendingDataRef.current = data;
            setShowReplaceDialog(true);
            return;
          }
          const serverMsg =
            (apiErr.data as { error?: string } | null)?.error ??
            apiErr.message ??
            "Đã xảy ra lỗi. Vui lòng thử lại.";
          toast({ title: "Không thể gửi yêu cầu", description: serverMsg, variant: "destructive" });
        },
      }
    );
  };

  const onSubmit = (_data: FormValues) => {
    toast({ title: "Không tiếp nhận đơn", description: "Hiện tại chúng tôi không tiếp nhận đơn trong thời gian này. Vui lòng thử lại sau.", variant: "destructive" });
  };

  const handleReplace = async () => {
    if (!pendingDataRef.current) return;
    setReplacing(true);
    try {
      const res = await fetch("/api/requests/mine", { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const body = await res.json() as { error?: string };
        toast({ title: "Không thể hủy yêu cầu cũ", description: body.error ?? "Lỗi không xác định", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetMyRequestQueryKey() });
      setShowReplaceDialog(false);
      submitRequest(pendingDataRef.current);
    } catch {
      toast({ title: "Lỗi kết nối", description: "Vui lòng thử lại.", variant: "destructive" });
    } finally {
      setReplacing(false);
    }
  };

  const locationName = form.watch("locationName");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ── */}
      <div className="hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(56,189,248,0.15),_transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50/20 to-transparent" />

        <div className="container mx-auto px-4 pt-10 pb-14 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-3 max-w-lg">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-xs font-medium text-orange-200 backdrop-blur-sm">
                <Plane className="w-3.5 h-3.5" />
                Dịch vụ quay flycam chuyên nghiệp
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
                Ghi hình từ trên cao.<br />
                <span className="text-orange-300">Đơn giản. Nhanh chóng.</span>
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
                Chọn khu vực, điền thông tin — đội phi công của chúng tôi sẽ liên hệ và thực hiện cho bạn.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-3 shrink-0">
              <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <div className="p-2 bg-orange-400/20 rounded-xl">
                  <Activity className="w-4 h-4 text-orange-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white leading-none">{queueStats?.filming ?? 0}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Đang quay</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <div className="p-2 bg-amber-400/20 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white leading-none">{queueStats?.pending ?? 0}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Đang chờ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── Form ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Form header */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                  <PlaneTakeoff className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Gửi yêu cầu quay</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Điền đầy đủ thông tin để chúng tôi liên hệ lại.</p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Step 1: Personal info */}
                <div className="px-6 pt-5 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">1</div>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Thông tin cá nhân</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Họ và tên
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nguyễn Văn A"
                              {...field}
                              className="rounded-xl border-slate-200 focus:border-orange-400 focus:ring-orange-400/20 h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> Email liên hệ
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="example@email.com"
                              {...field}
                              className="rounded-xl border-slate-200 focus:border-orange-400 focus:ring-orange-400/20 h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Step 2: Location */}
                <div className="px-6 pt-5 pb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">2</div>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Khu vực cần quay</span>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" /> Chọn vị trí trên bản đồ
                    </Label>

                    <MapPicker
                      onLocationSelect={(sel: LocationSelection) => {
                        form.setValue("latitude", sel.lat);
                        form.setValue("longitude", sel.lng);
                        form.setValue("locationName", sel.locationName, { shouldValidate: true });
                        setIsRestrictedZone(sel.isRestricted);
                        setFilmingZone(sel.filmingZone);
                        setZoneError(false);
                      }}
                    />

                    {/* Selected location pill */}
                    {locationName && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="text-sm text-orange-800 font-medium truncate">{locationName}</span>
                      </div>
                    )}

                    {/* Hidden field for validation */}
                    <FormField
                      control={form.control}
                      name="locationName"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input readOnly {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Warnings */}
                    {isRestrictedZone && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Vị trí này nằm trong vùng cấm bay. Yêu cầu có thể bị từ chối.</span>
                      </div>
                    )}
                    {zoneError && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Vui lòng nhấp vào bản đồ để chọn vùng quay trước khi gửi.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="px-6 pb-6">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl font-semibold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 border-0 transition-all duration-200"
                    disabled={createRequest.isPending}
                  >
                    {createRequest.isPending ? (
                      <span className="flex items-center gap-2">
                        <LoaderCircle className="w-4 h-4 animate-spin" /> Đang gửi yêu cầu...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <PlaneTakeoff className="w-4 h-4" />
                        Gửi yêu cầu quay
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-xs text-slate-400 mt-3">
                    Sau khi gửi, bạn có thể theo dõi trạng thái tại tab <strong>Trạng thái</strong>.
                  </p>
                </div>
              </form>
            </Form>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* How it works */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Quy trình</h3>
              <div className="space-y-3">
                {[
                  { icon: User, label: "Điền thông tin & chọn vị trí", color: "bg-orange-100 text-orange-600" },
                  { icon: Clock, label: "Chờ admin xét duyệt", color: "bg-amber-100 text-amber-600" },
                  { icon: Plane, label: "Phi công thực hiện chuyến bay", color: "bg-purple-100 text-purple-600" },
                  { icon: CheckCircle2, label: "Nhận video hoàn thành", color: "bg-emerald-100 text-emerald-600" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${step.color} flex items-center justify-center shrink-0`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue preview */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Hàng chờ hiện tại</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{queue?.length ?? 0} yêu cầu</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 text-xs gap-1 hover:bg-orange-50 rounded-xl h-8 px-3"
                  onClick={() => setLocation("/queue")}
                >
                  Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {queue && queue.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {queue.slice(0, 5).map((entry, i) => {
                    const isFilming = entry.status === "filming";
                    const isCompleted = entry.status === "completed";
                    const isCancelled = entry.status === "cancelled";
                    const isRejected = entry.status === "rejected";
                    const isPending = entry.status === "pending";

                    const rankBg = isFilming
                      ? "bg-orange-500 text-white"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-600"
                      : isCancelled || isRejected
                      ? "bg-slate-100 text-slate-400"
                      : isPending
                      ? "bg-amber-100 text-amber-600"
                      : "bg-blue-100 text-blue-600";

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-3 px-5 py-3.5 ${
                          isFilming ? "bg-orange-50/60" : ""
                        } ${isCancelled || isRejected ? "opacity-60" : ""}`}
                      >
                        {/* Rank icon */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${rankBg}`}>
                          {isFilming ? (
                            <Plane className="w-3.5 h-3.5 animate-pulse" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : isCancelled ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : isRejected ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            i + 1
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-1">
                            {entry.locationName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <p className="text-[11px] text-slate-500 truncate">{entry.name}</p>
                          </div>
                          {entry.scheduledAt && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                              <p className="text-[11px] text-blue-500 font-medium">
                                {new Date(entry.scheduledAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0 mt-0.5">
                          {isFilming && (
                            <span className="inline-flex items-center gap-1 text-orange-600 text-[11px] font-bold">
                              <span className="ring-pulse w-1.5 h-1.5 rounded-full bg-orange-500" />
                              Đang quay
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[11px] text-emerald-600 font-semibold">Xong</span>
                          )}
                          {entry.status === "approved" && (
                            <span className="text-[11px] text-blue-500 font-semibold">Duyệt</span>
                          )}
                          {isPending && (
                            <span className="text-[11px] text-amber-500 font-semibold">Chờ</span>
                          )}
                          {isCancelled && (
                            <span className="text-[11px] text-slate-400 font-semibold">Hủy</span>
                          )}
                          {isRejected && (
                            <span className="text-[11px] text-red-400 font-semibold">Từ chối</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center px-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
                    <Plane className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Hàng chờ trống</p>
                  <p className="text-xs text-slate-400 mt-0.5">Hãy là người đầu tiên!</p>
                </div>
              )}

              {/* Footer */}
              {queue && queue.length > 5 && (
                <div
                  className="px-5 py-3 border-t border-slate-100 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setLocation("/queue")}
                >
                  <span className="text-xs text-orange-600 font-semibold">
                    + {queue.length - 5} yêu cầu khác
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replace dialog */}
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn đã có yêu cầu đang chờ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang có một yêu cầu quay flycam chưa hoàn thành. Nếu tiếp tục, yêu cầu cũ sẽ bị hủy và yêu cầu mới sẽ được gửi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={replacing} className="rounded-xl">Giữ yêu cầu cũ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReplace}
              disabled={replacing}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {replacing
                ? <span className="flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" /> Đang xử lý...</span>
                : "Hủy cũ, gửi mới"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
