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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Plane, Activity, CheckCircle2, Clock, AlertTriangle, MapPin,
  LoaderCircle, PlaneTakeoff, Sparkles, ChevronRight, User,
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
          const serverMsg = (apiErr.data as { error?: string } | null)?.error ?? apiErr.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.";
          toast({ title: "Không thể gửi yêu cầu", description: serverMsg, variant: "destructive" });
        },
      }
    );
  };

  const onSubmit = (data: FormValues) => {
    if (!filmingZone) { setZoneError(true); return; }
    setZoneError(false);
    submitRequest(data);
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

  return (
    <div>
      {/* ── Hero banner ──────────────────────────────────────────── */}
      <div className="hero-gradient hero-shimmer relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 py-10 md:py-14 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs font-medium text-sky-200">
                <Sparkles className="w-3.5 h-3.5" />
                Dịch vụ quay flycam chuyên nghiệp
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
                Ghi hình từ trên cao.<br />
                <span className="text-sky-300">Đơn giản. Nhanh chóng.</span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Chọn khu vực trên bản đồ, điền thông tin — đội phi công của chúng tôi sẽ lo phần còn lại.
              </p>
            </div>

            {/* Live stats in hero */}
            <div className="flex gap-3 md:flex-col md:items-end">
              <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <div className="p-2 bg-sky-400/20 rounded-xl">
                  <Activity className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{queueStats?.filming ?? 0}</p>
                  <p className="text-xs text-slate-400">Đang quay</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <div className="p-2 bg-amber-400/20 rounded-xl">
                  <Clock className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{queueStats?.pending ?? 0}</p>
                  <p className="text-xs text-slate-400">Đang chờ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* ── Form card ──────────────────────────────────────────── */}
          <Card className="card-float border-0 shadow-xl rounded-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
            <CardHeader className="pb-4 pt-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 rounded-xl border border-sky-100">
                  <PlaneTakeoff className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Gửi yêu cầu quay</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Cho chúng tôi biết bạn muốn quay ở đâu.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Họ và tên
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} className="rounded-xl" />
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
                          <FormLabel className="text-xs font-semibold text-slate-600">Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="example@email.com" {...field} className="rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" /> Khu vực quay
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

                    {isRestrictedZone && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Vị trí này nằm trong vùng cấm bay. Yêu cầu có thể bị từ chối.</span>
                      </div>
                    )}
                    {zoneError && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Vui lòng nhấp vào bản đồ để chọn vùng quay trước khi gửi.</span>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="locationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              readOnly
                              placeholder="Nhấp vào bản đồ để chọn vị trí..."
                              {...field}
                              className="bg-slate-50 text-sm rounded-xl text-slate-600 cursor-default"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl font-semibold text-base bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 border-0 gap-2"
                    disabled={createRequest.isPending}
                  >
                    {createRequest.isPending ? (
                      <><LoaderCircle className="w-4 h-4 animate-spin" /> Đang gửi...</>
                    ) : (
                      <><PlaneTakeoff className="w-4 h-4" /> Gửi yêu cầu quay <ChevronRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* ── Queue sidebar ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Hàng chờ</h2>
                <p className="text-xs text-slate-500">Yêu cầu đang chờ và thực hiện</p>
              </div>
              <Button variant="ghost" size="sm" className="text-sky-600 text-xs gap-1" onClick={() => setLocation("/queue")}>
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {queue && queue.length > 0 ? (
              <div className="space-y-2.5">
                {queue.slice(0, 5).map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border bg-white card-float ${
                      entry.status === "filming" ? "border-sky-200 bg-sky-50/50" : "border-slate-200"
                    }`}
                  >
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm shrink-0 ${
                      entry.status === "filming"
                        ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {entry.status === "filming" ? <Plane className="w-4 h-4 animate-pulse" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{entry.locationName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Yêu cầu bởi {entry.name}</p>
                    </div>
                    <div className="shrink-0">
                      {entry.status === "filming" ? (
                        <span className="flex items-center text-sky-600 text-xs font-semibold gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                          Đang quay
                        </span>
                      ) : entry.status === "completed" ? (
                        <span className="flex items-center text-emerald-600 text-xs font-medium gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xong
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Chờ</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Plane className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-medium text-slate-600 text-sm">Hàng chờ đang trống</p>
                <p className="text-xs text-slate-400 mt-1">Hãy là người đầu tiên gửi yêu cầu!</p>
              </div>
            )}
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
              {replacing ? (
                <span className="flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" /> Đang xử lý...</span>
              ) : "Hủy cũ, gửi mới"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
