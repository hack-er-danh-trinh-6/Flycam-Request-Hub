import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Status from "@/pages/Status";
import Queue from "@/pages/Queue";
import Admin from "@/pages/Admin";
import MapView from "@/pages/MapView";
import Maintenance from "@/pages/Maintenance";
import { Navigation } from "@/components/Navigation";

const queryClient = new QueryClient();

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const res = await fetch("/api/admin/maintenance");
      return res.json() as Promise<{ maintenance: boolean }>;
    },
    refetchInterval: 10000,
  });

  const isAdmin = location === "/admin" || location.startsWith("/admin");
  if (data?.maintenance && !isAdmin) {
    return <Maintenance />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <MaintenanceGuard>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/status" component={Status} />
        <Route path="/queue" component={Queue} />
        <Route path="/admin" component={Admin} />
        <Route path="/map" component={MapView} />
        <Route component={NotFound} />
      </Switch>
    </MaintenanceGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
            <Navigation />
            <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden w-full">
              <Router />
            </main>
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
