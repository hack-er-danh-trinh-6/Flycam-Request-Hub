import { useGetMyRequest } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaneTakeoff, Clock, CheckCircle, XCircle, MapPin, Calendar, Video, Plane } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Status() {
  const [, setLocation] = useLocation();
  const { data: request, isLoading, isError } = useGetMyRequest({
    query: {
      queryKey: ["getMyRequest"],
      retry: 1,
    }
  });

  useEffect(() => {
    if (isError) {
      setLocation("/");
    }
  }, [isError, setLocation]);

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const statusConfig = {
    pending:   { label: "Chờ duyệt",    icon: Clock,        color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    approved:  { label: "Đã duyệt & Xếp hàng", icon: CheckCircle, color: "bg-blue-100 text-blue-800 border-blue-200" },
    filming:   { label: "Đang quay",    icon: Plane,        color: "bg-primary/20 text-primary border-primary/30" },
    completed: { label: "Hoàn thành",   icon: Video,        color: "bg-green-100 text-green-800 border-green-200" },
    rejected:  { label: "Từ chối",      icon: XCircle,      color: "bg-red-100 text-red-800 border-red-200" },
    cancelled: { label: "Đã hủy",       icon: XCircle,      color: "bg-orange-100 text-orange-800 border-orange-200" },
  };

  const currentStatus = statusConfig[request.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Trạng thái yêu cầu</h1>
        <p className="text-muted-foreground">Theo dõi tiến trình yêu cầu quay flycam của bạn.</p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <CardTitle className="text-2xl mb-1">{request.locationName}</CardTitle>
              <CardDescription>
                Gửi lúc {format(new Date(request.createdAt), "dd/MM/yyyy", { locale: vi })}
              </CardDescription>
            </div>
            <Badge className={`${currentStatus.color} px-3 py-1 text-sm flex items-center gap-2 border shrink-0`}>
              <StatusIcon className="w-4 h-4" />
              {currentStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /> Tọa độ
              </p>
              <p className="font-mono text-sm">
                {request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
              </p>
            </div>

            <div className="space-y-1 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" /> Lịch bay dự kiến
              </p>
              <p className="font-medium">
                {request.scheduledAt
                  ? format(new Date(request.scheduledAt), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })
                  : "Chưa có lịch"}
              </p>
            </div>
          </div>

          {/* Pending: waiting */}
          {request.status === "pending" && (
            <div className="p-6 rounded-lg bg-yellow-50 border border-yellow-200 text-center space-y-3">
              <Clock className="w-10 h-10 text-yellow-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Đang chờ duyệt</h3>
                <p className="text-muted-foreground text-sm">Yêu cầu của bạn đang được xem xét. Chúng tôi sẽ phản hồi sớm nhất có thể.</p>
              </div>
            </div>
          )}

          {/* Approved: queued */}
          {request.status === "approved" && (
            <div className="p-6 rounded-lg bg-blue-50 border border-blue-200 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-blue-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Yêu cầu đã được chấp thuận!</h3>
                <p className="text-muted-foreground text-sm">
                  Yêu cầu của bạn đã được xếp vào hàng chờ.
                  {request.queuePosition ? ` Vị trí hàng chờ: #${request.queuePosition}.` : ""} Chúng tôi sẽ liên hệ khi có lịch bay cụ thể.
                </p>
              </div>
            </div>
          )}

          {/* Filming: in progress */}
          {request.status === "filming" && (
            <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 text-center space-y-4">
              <PlaneTakeoff className="w-12 h-12 text-primary mx-auto animate-pulse" />
              <div>
                <h3 className="font-semibold text-lg text-primary">Đang thực hiện quay!</h3>
                <p className="text-muted-foreground text-sm">Đội bay đang ghi hình khu vực của bạn. Video sẽ sớm được gửi đến.</p>
              </div>
            </div>
          )}

          {/* Rejected */}
          {request.status === "rejected" && (
            <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-center space-y-3">
              <XCircle className="w-10 h-10 text-red-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Yêu cầu bị từ chối</h3>
                <p className="text-muted-foreground text-sm">Rất tiếc, yêu cầu của bạn không được chấp thuận. Bạn có thể gửi yêu cầu mới.</p>
              </div>
              <Button variant="outline" onClick={() => setLocation("/")}>Gửi yêu cầu mới</Button>
            </div>
          )}

          {/* Cancelled */}
          {request.status === "cancelled" && (
            <div className="p-6 rounded-lg bg-orange-50 border border-orange-200 text-center space-y-3">
              <XCircle className="w-10 h-10 text-orange-500 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Chuyến quay đã bị hủy</h3>
                {(request as { cancellationReason?: string | null }).cancellationReason && (
                  <div className="mt-2 px-4 py-2 bg-orange-100 rounded-md text-sm text-orange-800 font-medium">
                    Lý do: {(request as { cancellationReason?: string | null }).cancellationReason}
                  </div>
                )}
                <p className="text-muted-foreground text-sm mt-2">Bạn có thể gửi yêu cầu quay mới bất cứ lúc nào.</p>
              </div>
              <Button variant="outline" onClick={() => setLocation("/")}>Gửi yêu cầu mới</Button>
            </div>
          )}

          {/* Completed: video ready */}
          {request.status === "completed" && request.videoUrl && (
            <div className="p-6 rounded-lg bg-green-50 border border-green-200 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-green-100 rounded-full">
                <Video className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Video của bạn đã sẵn sàng!</h3>
                <p className="text-muted-foreground text-sm">Đội bay đã hoàn thành và tải lên video flycam theo yêu cầu.</p>
              </div>
              <Button asChild size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                <a href={request.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Video className="w-4 h-4 mr-2" /> Xem video ngay
                </a>
              </Button>
            </div>
          )}

          {request.status === "completed" && !request.videoUrl && (
            <div className="p-6 rounded-lg bg-green-50 border border-green-200 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Hoàn thành</h3>
                <p className="text-muted-foreground text-sm">Yêu cầu đã được hoàn thành.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
