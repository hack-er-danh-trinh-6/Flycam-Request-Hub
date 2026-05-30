import { Link, useLocation } from "wouter";
import { PlaneTakeoff, Activity, List } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",       label: "Yêu cầu quay", shortLabel: "Yêu cầu", icon: PlaneTakeoff },
  { href: "/status", label: "Trạng thái",    shortLabel: "Trạng thái", icon: Activity },
  { href: "/queue",  label: "Hàng chờ",      shortLabel: "Hàng chờ",  icon: List },
];

export function Navigation() {
  const [location] = useLocation();

  return (
    <>
      {/* ── Desktop / top nav ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-md shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-200">
              <PlaneTakeoff className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
              FlyCam
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-sky-50 text-sky-700 shadow-inner"
                      : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/70"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-sky-600" : "text-slate-400")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Active accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      </nav>

      {/* ── Mobile bottom tab bar ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch">
          {navItems.map(({ href, shortLabel, icon: Icon }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-sky-600" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-6 rounded-full transition-all",
                  isActive ? "bg-sky-100" : ""
                )}>
                  <Icon className={cn("h-5 w-5", isActive ? "text-sky-600" : "text-slate-400")} />
                </div>
                <span>{shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
