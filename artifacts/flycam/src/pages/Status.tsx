import { useGetMyRequest } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaneTakeoff, Clock, CheckCircle, XCircle, MapPin, Calendar, Video, Plane } from "lucide-react";
import { format } from "date-fns";
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
    pending: { label: "Pending Review", icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    approved: { label: "Approved & Queued", icon: CheckCircle, color: "bg-blue-100 text-blue-800 border-blue-200" },
    filming: { label: "Filming in Progress", icon: Plane, color: "bg-primary/20 text-primary border-primary/30" },
    completed: { label: "Completed", icon: Video, color: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800 border-red-200" },
  };

  const currentStatus = statusConfig[request.status];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Request Status</h1>
        <p className="text-muted-foreground">Track the progress of your flycam footage.</p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-1">{request.locationName}</CardTitle>
              <CardDescription>Submitted on {format(new Date(request.createdAt), "PPP")}</CardDescription>
            </div>
            <Badge className={`${currentStatus.color} px-3 py-1 text-sm flex items-center gap-2 border`}>
              <StatusIcon className="w-4 h-4" />
              {currentStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /> Coordinates
              </p>
              <p className="font-mono text-sm">
                {request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
              </p>
            </div>
            
            <div className="space-y-1 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" /> Scheduled Flight
              </p>
              <p className="font-medium">
                {request.scheduledAt ? format(new Date(request.scheduledAt), "PPP 'at' p") : "Not scheduled yet"}
              </p>
            </div>
          </div>

          {request.status === 'completed' && request.videoUrl && (
            <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your Footage is Ready!</h3>
                <p className="text-muted-foreground text-sm">The pilot has uploaded your requested aerial video.</p>
              </div>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href={request.videoUrl} target="_blank" rel="noopener noreferrer">
                  Watch Video
                </a>
              </Button>
            </div>
          )}

          {request.status === 'filming' && (
            <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 text-center space-y-4">
              <PlaneTakeoff className="w-12 h-12 text-primary mx-auto animate-pulse" />
              <div>
                <h3 className="font-semibold text-lg text-primary">Pilot is airborne!</h3>
                <p className="text-muted-foreground text-sm">We are currently capturing your location.</p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
