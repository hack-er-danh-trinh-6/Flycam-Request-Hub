import { useGetQueue, useGetQueueStats, useCreateRequest, getGetMyRequestQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPicker } from "@/components/MapPicker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plane, Activity, CheckCircle2, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  locationName: z.string().min(1, "Please select a location on the map."),
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
    createRequest.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Request submitted!",
            description: "Your flycam filming request has been recorded.",
          });
          queryClient.invalidateQueries({ queryKey: getGetMyRequestQueryKey() });
          setLocation("/status");
        },
        onError: (err) => {
          toast({
            title: "Failed to submit request",
            description: err.error || "An unexpected error occurred.",
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
              Capture the Sky.
            </h1>
            <p className="text-lg text-muted-foreground">
              Request professional drone footage for your favorite locations. Simply pick a spot on the map, and our pilots will handle the rest.
            </p>
          </div>

          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle>Submit a Request</CardTitle>
              <CardDescription>Tell us where you want to fly.</CardDescription>
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
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <Label>Filming Location</Label>
                      <MapPicker
                        onLocationSelect={(lat, lng, name) => {
                          form.setValue("latitude", lat);
                          form.setValue("longitude", lng);
                          form.setValue("locationName", name, { shouldValidate: true });
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="locationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input readOnly placeholder="Click on the map to select a location..." {...field} className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={createRequest.isPending}>
                    {createRequest.isPending ? "Submitting..." : "Submit Flight Request"}
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
                  <p className="text-sm font-medium text-muted-foreground">Active Flights</p>
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
                  <p className="text-sm font-medium text-muted-foreground">In Queue</p>
                  <p className="text-3xl font-bold">{queueStats?.pending || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Up Next</CardTitle>
              <CardDescription>Live look at the flight queue</CardDescription>
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
                          <p className="text-sm text-muted-foreground">Requested by {entry.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {entry.status === 'filming' ? (
                          <span className="flex items-center text-primary text-sm font-medium">
                            <Plane className="w-4 h-4 mr-1 animate-pulse" /> Filming Now
                          </span>
                        ) : entry.status === 'completed' ? (
                          <span className="flex items-center text-green-600 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Completed
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground font-medium">Up Next</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto opacity-20 mb-4" />
                  <p>The queue is empty. Be the first to request a flight!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
