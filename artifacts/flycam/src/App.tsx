import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Status from "@/pages/Status";
import Queue from "@/pages/Queue";
import Admin from "@/pages/Admin";
import MapView from "@/pages/MapView";
import { Navigation } from "@/components/Navigation";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/status" component={Status} />
      <Route path="/queue" component={Queue} />
      <Route path="/admin" component={Admin} />
      <Route path="/map" component={MapView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
            <Navigation />
            {/* pb-20 on mobile clears the fixed bottom tab bar */}
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
