import { Link, useLocation } from "wouter";
import { PlaneTakeoff, Activity, List, Map } from "lucide-react";
import { FaTiktok, FaPhone, FaEnvelope } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import logoImg from "/logo2.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/",        label: "Yêu cầu quay", icon: PlaneTakeoff },
  { href: "/status",  label: "Trạng thái",    icon: Activity },
  { href: "/queue",   label: "Hàng chờ",      icon: List },
  { href: "/map",     label: "Bản đồ",        icon: Map },
];

const contacts = [
  {
    label: "TikTok @trinz_fly",
    href: "https://tiktok.com/@trinz_fly",
    icon: FaTiktok,
    bg: "bg-black",
    text: "text-white",
  },
  {
    label: "Zalo: 0786 831 513",
    href: "https://zalo.me/0786831513",
    icon: null,
    zaloText: true,
    bg: "bg-[#0068FF]",
    text: "text-white",
  },
  {
    label: "Gọi: 079 9960 552",
    href: "tel:0799960552",
    icon: FaPhone,
    bg: "bg-emerald-500",
    text: "text-white",
  },
  {
    label: "Email: trinz.ofc@gmail.com",
    href: "mailto:trinz.ofc@gmail.com",
    icon: FaEnvelope,
    bg: "bg-orange-500",
    text: "text-white",
  },
];

export function Navigation() {
  const [location] = useLocation();

  return (
    <>
      {/* Desktop top nav */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-2">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img src={logoImg} alt="FlyCam Logo" className="h-10 w-auto object-contain" />
          </Link>

          {/* Nav links — desktop only */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-orange-50 text-orange-700"
                      : "text-slate-500 hover:text-orange-700 hover:bg-orange-50/70"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-orange-500" : "text-slate-400")} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Contact icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Divider — desktop only */}
            <div className="hidden md:block w-px h-5 bg-slate-200 mr-0.5" />

            {contacts.map((c) => (
              <Tooltip key={c.href}>
                <TooltipTrigger asChild>
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-xl shadow-sm transition-all duration-150 hover:scale-110 hover:shadow-md",
                      c.bg, c.text
                    )}
                  >
                    {"zaloText" in c && c.zaloText ? (
                      <span className="text-[13px] font-black leading-none">Z</span>
                    ) : (
                      c.icon && <c.icon className="w-3.5 h-3.5" />
                    )}
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {c.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
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
                  active ? "text-orange-600" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-6 rounded-full transition-all",
                  active ? "bg-orange-100" : ""
                )}>
                  <Icon className={cn("h-[18px] w-[18px]", active ? "text-orange-600" : "text-slate-400")} />
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
