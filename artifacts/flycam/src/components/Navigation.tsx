import { Link, useLocation } from "wouter";
import { PlaneTakeoff, List, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Request Flight", icon: PlaneTakeoff },
    { href: "/status", label: "My Status", icon: Activity },
    { href: "/queue", label: "Public Queue", icon: List },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <PlaneTakeoff className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-primary">
            FlyCam
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
