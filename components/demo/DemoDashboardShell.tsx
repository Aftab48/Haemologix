"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building, Heart, Shield, ShieldCheck } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DemoNavItem = {
  value: string;
  label: string;
  short: string;
  Icon: LucideIcon;
  badge?: number;
};

type Props = {
  variant: "donor" | "hospital" | "admin";
  accountName: string;
  activeTab: string;
  navItems: DemoNavItem[];
  onTabChange: (value: string) => void;
  heading: string;
  description: string;
  topActions?: ReactNode;
  children: ReactNode;
};

export default function DemoDashboardShell(props: Props) {
  const isAdmin = props.variant === "admin";
  const Icon = props.variant === "donor" ? Heart : props.variant === "hospital" ? Building : Shield;
  const dashboardName = props.variant === "donor" ? "Donor Dashboard" : props.variant === "hospital" ? "Hospital Dashboard" : "Admin Dashboard";

  const content = (
    <div className={cn("flex min-h-screen", isAdmin && "relative z-10")}>
      <aside className={cn(
        "w-64 shrink-0 hidden md:flex flex-col sticky top-0 h-screen z-20",
        "glass-morphism border-r border-white/10 overflow-hidden"
      )}>
        <div className="p-5 border-b border-white/10">
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", isAdmin ? "bg-purple-600" : "bg-red-800")}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-outfit font-bold text-white text-sm truncate">{dashboardName}</p>
                <p className="text-xs text-white/50 truncate">{props.accountName}</p>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto dash-scroll">
          {props.navItems.map(({ value, label, Icon: NavIcon, badge }) => (
            <button
              key={value}
              onClick={() => props.onTabChange(value)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left",
                props.activeTab === value ? "bg-yellow-600 text-white shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <NavIcon className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{label}</span>
              {badge !== undefined && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md chip-ruby">{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white/10 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">Demo account</p>
            <p className="text-[11px] text-white/50 truncate">Synthetic data only</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden glass-morphism border-b border-white/10 p-3 flex overflow-x-auto gap-1 shrink-0 dash-scroll">
          {props.navItems.map(({ value, short, Icon: NavIcon }) => (
            <button
              key={value}
              onClick={() => props.onTabChange(value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 font-medium",
                props.activeTab === value ? "bg-yellow-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <NavIcon className="w-3 h-3" />{short}
            </button>
          ))}
        </div>

        <div className="glass-morphism border-b border-white/10 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div>
            <div className="md:hidden flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isAdmin ? "bg-purple-600" : "bg-red-800")}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-outfit font-semibold text-sm">{dashboardName}</span>
            </div>
            <div className="hidden md:block">
              <h1 className="font-outfit font-bold text-white text-lg">{props.heading}</h1>
              <p className="text-xs text-white/70">{props.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="hidden sm:inline-flex bg-emerald-600 text-white"><ShieldCheck className="mr-1 h-3 w-3" /> Isolated demo</Badge>
            {props.topActions}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 dash-scroll">{props.children}</div>
      </div>
    </div>
  );

  return <GradientBackground className="flex flex-col min-h-screen demo-dashboard-glass">{content}</GradientBackground>;
}
