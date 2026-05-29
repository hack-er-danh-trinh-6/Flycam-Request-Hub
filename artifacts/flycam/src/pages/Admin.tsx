import { useState } from "react";
import { 
  useAdminListRequests, 
  useAdminApproveRequest, 
  useAdminRejectRequest, 
  useAdminScheduleRequest, 
  useAdminCompleteRequest,
  getAdminListRequestsQueryKey,
  getGetQueueQueryKey,
  getGetQueueStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { MapPin, User, Mail, Clock, Check, X, Plane, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type StatusTab = 'pending' | 'approved' | 'filming' | 'completed' | 'rejected' | 'all';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading } = useAdminListRequests(
    activeTab !== 'all' ? { status: activeTab } : {}
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
      onSuccess: () => {
        toast({ title: "Request approved" });
        invalidateQueries();
      }
    });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Request rejected" });
        invalidateQueries();
      }
    });
  };

  const handleSchedule = (id: number, scheduledAt: string) => {
    scheduleMutation.mutate({ id, data: { scheduledAt } }, {
      onSuccess: () => {
        toast({ title: "Flight scheduled" });
        invalidateQueries();
      }
    });
  };

  const handleComplete = (id: number, videoUrl: string) => {
    completeMutation.mutate({ id, data: { videoUrl } }, {
      onSuccess: () => {
        toast({ title: "Request marked complete" });
        invalidateQueries();
      }
    });
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage flycam requests and schedule flights.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusTab)}>
        <TabsList className="mb-4 flex flex-wrap h-auto gap-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="filming">Filming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
        ) : requests?.length === 0 ? (
          <Card className="py-12 text-center border-dashed">
            <CardContent>
              <p className="text-muted-foreground">No requests found in this category.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests?.map((req) => (
              <Card key={req.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg line-clamp-2">{req.locationName}</CardTitle>
                    <Badge variant="outline" className="shrink-0 capitalize">{req.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <User className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{req.name}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{req.email}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 shrink-0" /> {req.latitude.toFixed(3)}, {req.longitude.toFixed(3)}
                    </div>
                    {req.scheduledAt && (
                      <div className="flex items-center font-medium">
                        <Clock className="w-4 h-4 mr-2 shrink-0" /> 
                        {format(new Date(req.scheduledAt), "MMM d, h:mm a")}
                      </div>
                    )}
                    {req.videoUrl && (
                      <div className="flex items-center text-primary">
                        <Video className="w-4 h-4 mr-2 shrink-0" /> 
                        <a href={req.videoUrl} target="_blank" rel="noreferrer" className="underline truncate">Video Link</a>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t flex flex-wrap gap-2">
                    {req.status === 'pending' && (
                      <>
                        <Button size="sm" variant="default" onClick={() => handleApprove(req.id)} className="flex-1">
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} className="flex-1">
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}

                    {req.status === 'approved' && (
                      <ScheduleDialog onSchedule={(date) => handleSchedule(req.id, date)} />
                    )}

                    {req.status === 'filming' && (
                      <CompleteDialog onComplete={(url) => handleComplete(req.id, url)} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Tabs>
    </div>
  );
}

function ScheduleDialog({ onSchedule }: { onSchedule: (date: string) => void }) {
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
          <Plane className="w-4 h-4 mr-2" /> Start Filming
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Flight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Scheduled Flight Time</Label>
            <Input 
              type="datetime-local" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
          <Button 
            className="w-full" 
            disabled={!date} 
            onClick={() => {
              onSchedule(new Date(date).toISOString());
              setOpen(false);
            }}
          >
            Confirm Schedule & Start Filming
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
          <Check className="w-4 h-4 mr-2" /> Complete & Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Video URL</Label>
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
            onClick={() => {
              onComplete(url);
              setOpen(false);
            }}
          >
            Save & Notify User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
