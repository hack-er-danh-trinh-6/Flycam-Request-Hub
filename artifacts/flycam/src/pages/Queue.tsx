import { useGetQueue } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plane, CheckCircle2, Clock, MapPin, User, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Queue() {
  const { data: queue, isLoading } = useGetQueue();

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Public Flight Queue</h1>
        <p className="text-muted-foreground">Live leaderboard of upcoming and completed flights.</p>
      </div>

      <div className="space-y-4">
        {queue?.length === 0 ? (
          <Card className="py-12 border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Plane className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-semibold">Queue is empty</h3>
              <p className="text-muted-foreground">No flights are currently scheduled.</p>
            </CardContent>
          </Card>
        ) : (
          queue?.map((entry, index) => (
            <Card key={entry.id} className={`overflow-hidden transition-all duration-300 ${entry.status === 'filming' ? 'border-primary ring-1 ring-primary/20 shadow-md shadow-primary/10' : ''}`}>
              <div className="flex flex-col sm:flex-row">
                <div className={`p-4 flex items-center justify-center sm:w-20 ${entry.status === 'completed' ? 'bg-muted' : entry.status === 'filming' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  <span className="text-2xl font-bold opacity-80">#{index + 1}</span>
                </div>
                <div className="p-4 sm:p-6 flex-1 grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{entry.locationName}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="w-4 h-4 mr-2" /> {entry.name}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2" /> {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end justify-center space-y-3">
                    <div className="flex items-center gap-2">
                      {entry.status === 'filming' && (
                        <Badge className="bg-primary hover:bg-primary px-3 py-1">
                          <Plane className="w-3 h-3 mr-1 animate-pulse" /> Filming
                        </Badge>
                      )}
                      {entry.status === 'approved' && (
                        <Badge variant="secondary" className="px-3 py-1">
                          <Clock className="w-3 h-3 mr-1" /> Queued
                        </Badge>
                      )}
                      {entry.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none px-3 py-1">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                        </Badge>
                      )}
                    </div>
                    
                    {entry.scheduledAt && entry.status !== 'completed' && (
                      <p className="text-sm font-medium">
                        {format(new Date(entry.scheduledAt), "MMM d, h:mm a")}
                      </p>
                    )}

                    {entry.videoUrl && (
                      <Button variant="outline" size="sm" asChild className="mt-2">
                        <a href={entry.videoUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="w-4 h-4 mr-2" /> Watch Video
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
