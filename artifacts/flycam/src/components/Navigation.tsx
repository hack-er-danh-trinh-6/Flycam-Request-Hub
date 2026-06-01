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
    zaloSvg: true,
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
                    {"zaloSvg" in c && c.zaloSvg ? (
                      <svg viewBox="0 0 64 64" className="w-4 h-4" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5 42.2c.6-1.4 1-2.9 1-4.5 0-2.2-.6-4.3-1.7-6.1C7.6 28 6.5 24 6.5 19.7 6.5 9.4 18.1 1 32 1s25.5 8.4 25.5 18.7c0 10.3-11.4 18.7-25.5 18.7-2.2 0-4.4-.3-6.4-.8l-.5-.1-.5.2-8.7 3.8 1.3-3.8.3-.5z"/>
                        <path d="M21.3 24.6h10.3l-10.6 11h12.4v2.2H20.8v-1.8l10.5-11H21.3v-2.4zM37 24.4c1.3 0 2.3.4 3 1.3.7.8 1 2 1 3.5v8.6h-2.3v-8.3c0-.9-.2-1.6-.6-2.1-.4-.5-1-.7-1.7-.7-.9 0-1.6.3-2.1 1-.5.6-.8 1.6-.8 2.8v7.3H32v-13h2.2v1.5c.7-1.3 1.6-1.9 2.8-1.9z" fill="#0068FF"/>
                      </svg>
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
