import { useState, useEffect } from "react";
import {
  useAdminListRequests,
  useAdminApproveRequest,
  useAdminRejectRequest,
  useAdminScheduleRequest,
  useAdminCompleteRequest,
  useAdminSaveMapConfig,
  useGetMapConfig,
  getAdminListRequestsQueryKey,
  getGetQueueQueryKey,
  getGetQueueStatsQueryKey,
  getGetMapConfigQueryKey,
} from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { MapEditor, type MapEditorValue } from "@/components/MapEditor";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { MapPin, User, Mail, Clock, Check, X, Plane, Video, Lock, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const TOKEN_KEY = "flycam_admin_token";

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// ─── Login Gate ─────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Sai mật khẩu.");
        return;
      }

      const { token } = await res.json() as { token: string };
      storeToken(token);
      toast({ title: "Đăng nhập thành công" });
      onSuccess(token);
    } catch {
      setError("Không kết nối được máy chủ. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground">Nhập mật khẩu để tiếp tục</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Mật khẩu</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                data-testid="input-admin-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password}
              data-testid="button-admin-login"
            >
              {loading ? "Đang xác thực..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Map Config Tab ───────────────────────────────────────────────────────────

function MapConfigTab() {
  const { data: config, isLoading } = useGetMapConfig();
  const saveMapConfig = useAdminSaveMapConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editorValue, setEditorValue] = useState<MapEditorValue | null>(null);
  const [saving, setSaving] = useState(false);

  const initialValue: MapEditorValue | undefined = config
    ? {
        allowedZone: (config.allowedZone as object | null) ?? null,
        noFlyZones: (config.noFlyZones as object[]) ?? [],
      }
    : undefined;

  const handleSave = () => {
    if (!editorValue) {
      toast({ title: "Chưa có thay đổi nào để lưu", variant: "destructive" });
      return;
    }
    setSaving(true);
    saveMapConfig.mutate(
      {
        data: {
          allowedZone: editorValue.allowedZone as Record<string, unknown> | null | undefined,
          noFlyZones: editorValue.noFlyZones as Record<string, unknown>[],
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Đã lưu cấu hình bản đồ" });
          queryClient.invalidateQueries({ queryKey: getGetMapConfigQueryKey() });
        },
        onError: () => toast({ title: "Lưu thất bại", variant: "destructive" }),
        onSettled: () => setSaving(false),
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Đang tải cấu hình bản đồ...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vùng cấm bay</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vẽ các vùng cấm bay (màu đỏ) trên bản đồ. Người dùng sẽ được cảnh báo khi chọn vị trí trong vùng này.
          </p>
        </CardHeader>
        <CardContent>
          <MapEditor key={config?.updatedAt} initialValue={initialValue} onChange={setEditorValue} />
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving || !editorValue}>
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Admin Panel ────────────────────────────────────────────────────────

type StatusTab = "pending" | "approved" | "filming" | "completed" | "rejected" | "all";
type AdminSection = "requests" | "mapconfig";

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<AdminSection>("requests");
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading } = useAdminListRequests(
    activeTab !== "all" ? { status: activeTab } : {}
  );

  const approveMutation = useAdminApproveRequest();
  const rejectMutation = useAdminRejectRequest();
  const scheduleMutation = useAdminScheduleRequest();
  const completeMutation = useAdminCompleteRequest();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getAdminListRequestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetQueueStatsQueryKey() });
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Đã duyệt yêu cầu" }); invalidateQueries(); },
      onError: () => toast({ title: "Lỗi", variant: "destructive" }),
    });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Đã từ chối yêu cầu" }); invalidateQueries(); },
      onError: () => toast({ title: "Lỗi", variant: "destructive" }),
    });
  };

  const handleSchedule = (id: number, scheduledAt: string) => {
    scheduleMutation.mutate({ id, data: { scheduledAt } }, {
      onSuccess: () => { toast({ title: "Đã đặt lịch bay" }); invalidateQueries(); },
      onError: () => toast({ title: "Lỗi", variant: "destructive" }),
    });
  };

  const handleComplete = (id: number, videoUrl: string) => {
    completeMutation.mutate({ id, data: { videoUrl } }, {
      onSuccess: () => { toast({ title: "Đánh dấu hoàn thành" }); invalidateQueries(); },
      onError: () => toast({ title: "Lỗi", variant: "destructive" }),
    });
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Quản lý yêu cầu flycam và lịch bay.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} data-testid="button-admin-logout">
          <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
        </Button>
      </div>

      {/* Top-level section switcher */}
      <Tabs value={section} onValueChange={(v) => setSection(v as AdminSection)}>
        <TabsList className="mb-6">
          <TabsTrigger value="requests">Yêu cầu quay phim</TabsTrigger>
          <TabsTrigger value="mapconfig">Cấu hình bản đồ</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {/* Status filter sub-tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
            <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
              <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
              <TabsTrigger value="filming">Đang quay</TabsTrigger>
              <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
              <TabsTrigger value="rejected">Từ chối</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
              ) : !requests?.length ? (
                <Card className="py-12 text-center border-dashed">
                  <CardContent>
                    <p className="text-muted-foreground">Không có yêu cầu nào trong mục này.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {requests.map((req) => (
                    <Card key={req.id} className="flex flex-col" data-testid={`card-request-${req.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-4">
                          <CardTitle className="text-base line-clamp-2">{req.locationName}</CardTitle>
                          <StatusBadge status={req.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col space-y-4">
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <User className="w-4 h-4 mr-2 shrink-0" />
                            <span className="truncate">{req.name}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Mail className="w-4 h-4 mr-2 shrink-0" />
                            <span className="truncate">{req.email}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-2 shrink-0" />
                            {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                          </div>
                          {req.scheduledAt && (
                            <div className="flex items-center font-medium text-foreground">
                              <Clock className="w-4 h-4 mr-2 shrink-0" />
                              {format(new Date(req.scheduledAt), "dd/MM/yyyy HH:mm")}
                            </div>
                          )}
                          {req.videoUrl && (
                            <div className="flex items-center text-primary">
                              <Video className="w-4 h-4 mr-2 shrink-0" />
                              <a href={req.videoUrl} target="_blank" rel="noreferrer" className="underline truncate">
                                Xem video
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto pt-4 border-t flex flex-wrap gap-2">
                          {req.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => handleApprove(req.id)} className="flex-1" data-testid={`button-approve-${req.id}`}>
                                <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} className="flex-1" data-testid={`button-reject-${req.id}`}>
                                <X className="w-3.5 h-3.5 mr-1" /> Từ chối
                              </Button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <ScheduleDialog onSchedule={(date) => handleSchedule(req.id, date)} />
                          )}
                          {req.status === "filming" && (
                            <CompleteDialog onComplete={(url) => handleComplete(req.id, url)} />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="mapconfig">
          <MapConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Root Export ─────────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  useEffect(() => {
    setAuthTokenGetter(() => getStoredToken());
    return () => setAuthTokenGetter(null);
  }, []);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
  };

  if (!token) {
    return <AdminLogin onSuccess={handleSuccess} />;
  }

  return <AdminPanel onLogout={handleLogout} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    filming: "bg-purple-100 text-purple-800 border-purple-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<string, string> = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    filming: "Đang quay",
    completed: "Hoàn thành",
    rejected: "Từ chối",
  };
  return (
    <Badge variant="outline" className={`shrink-0 text-xs ${map[status] ?? ""}`}>
      {labels[status] ?? status}
    </Badge>
  );
}

function ScheduleDialog({ onSchedule }: { onSchedule: (date: string) => void }) {
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <Plane className="w-3.5 h-3.5 mr-1.5" /> Đặt lịch bay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đặt lịch bay</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Thời gian bay dự kiến</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!date}
            onClick={() => { onSchedule(new Date(date).toISOString()); setOpen(false); }}
          >
            Xác nhận lịch bay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({ onComplete }: { onComplete: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1.5" /> Hoàn thành & Gửi video
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hoàn thành yêu cầu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>URL Video</Label>
            <Input
              type="url"
              placeholder="https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!url}
            onClick={() => { onComplete(url); setOpen(false); }}
          >
            Lưu & Thông báo người dùng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
