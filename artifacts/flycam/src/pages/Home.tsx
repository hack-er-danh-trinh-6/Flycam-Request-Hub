import { useState } from "react";
import { useGetQueue, useGetQueueStats, useCreateRequest, getGetMyRequestQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPicker, type LocationSelection } from "@/components/MapPicker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plane, Activity, CheckCircle2, Clock, AlertTriangle, MapPin } from "lucide-react";
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      locationName: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!filmingZone) {
      setZoneError(true);
      return;
    }
    setZoneError(false);

    createRequest.mutate(
      { data: { ...data, filmingZone: filmingZone as Record<string, unknown> } },
      {
        onSuccess: () => {
          toast({
            title: "Đã gửi yêu cầu!",
            description: "Yêu cầu quay flycam của bạn đã được ghi nhận.",
          });
          queryClient.invalidateQueries({ queryKey: getGetMyRequestQueryKey() });
          setLocation("/status");
        },
        onError: (err) => {
          const apiErr = err as ApiError;

          if (apiErr.status === 409) {
            queryClient.invalidateQueries({ queryKey: getGetMyRequestQueryKey() });
            setLocation("/status");
            return;
          }

          const serverMsg =
            (apiErr.data as { error?: string } | null)?.error ??
            apiErr.message ??
            "Đã xảy ra lỗi. Vui lòng thử lại.";

          toast({
            title: "Không thể gửi yêu cầu",
            description: serverMsg,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-6xl">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-4">
              Ghi hình từ trên cao.
            </h1>
            <p className="text-lg text-muted-foreground">
              Yêu cầu dịch vụ quay flycam chuyên nghiệp tại địa điểm bạn mong muốn. Chọn khu vực trên bản đồ, đội ngũ của chúng tôi sẽ lo phần còn lại.
            </p>
          </div>

          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle>Gửi yêu cầu quay</CardTitle>
              <CardDescription>Cho chúng tôi biết bạn muốn quay ở đâu.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Họ và tên</FormLabel>
                          <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} />
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="example@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Khu vực quay</Label>
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
                        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>Vị trí này nằm trong vùng cấm bay (gần sân bay). Yêu cầu có thể bị từ chối.</span>
                        </div>
                      )}

                      {zoneError && (
                        <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
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
                                className="bg-muted text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={createRequest.isPending}
                  >
                    {createRequest.isPending ? "Đang gửi..." : "Gửi yêu cầu quay"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Queue & Stats */}
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Đang quay</p>
                  <p className="text-3xl font-bold">{queueStats?.filming || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-secondary/50">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-3 bg-secondary/50 rounded-full text-secondary-foreground">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Đang chờ</p>
                  <p className="text-3xl font-bold">{queueStats?.pending || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hàng chờ</CardTitle>
              <CardDescription>Danh sách yêu cầu đang chờ và đang thực hiện</CardDescription>
            </CardHeader>
            <CardContent>
              {queue && queue.length > 0 ? (
                <div className="space-y-4">
                  {queue.slice(0, 5).map((entry, i) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{entry.locationName}</p>
                          <p className="text-sm text-muted-foreground">Yêu cầu bởi {entry.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {entry.status === 'filming' ? (
                          <span className="flex items-center text-primary text-sm font-medium">
                            <Plane className="w-4 h-4 mr-1 animate-pulse" /> Đang quay
                          </span>
                        ) : entry.status === 'completed' ? (
                          <span className="flex items-center text-green-600 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground font-medium">Đang chờ</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto opacity-20 mb-4" />
                  <p>Hàng chờ đang trống. Hãy là người đầu tiên gửi yêu cầu!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
