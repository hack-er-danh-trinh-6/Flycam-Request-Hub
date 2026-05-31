import { Link, useLocation } from "wouter";
import { PlaneTakeoff, Activity, List } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",       label: "Yêu cầu quay",  icon: PlaneTakeoff },
  { href: "/status", label: "Trạng thái",     icon: Activity },
  { href: "/queue",  label: "Hàng chờ",       icon: List },
];

export function Navigation() {
  const [location] = useLocation();

  return (
    <>
      {/* Desktop top nav */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-md shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-200">
              <PlaneTakeoff className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
              FlyCam
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-500 hover:text-sky-700 hover:bg-sky-50/70"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-sky-500" : "text-slate-400")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)]">
        <div className="flex items-stretch">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                  active ? "text-sky-600" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-6 rounded-full transition-all",
                  active ? "bg-sky-100" : ""
                )}>
                  <Icon className={cn("h-[18px] w-[18px]", active ? "text-sky-600" : "text-slate-400")} />
                </div>
                <span className="mt-0.5">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
