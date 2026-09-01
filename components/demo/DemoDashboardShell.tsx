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
      <aside className="w-64 shrink-0 hidden md:flex flex-col dash-sidebar sticky top-0 h-screen z-20 overflow-hidden">
        <div className="p-5 border-b border-text-dark/10">
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 bg-primary">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-outfit font-bold text-text-dark text-sm truncate">{dashboardName}</p>
                <p className="text-xs text-muted-foreground truncate">{props.accountName}</p>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto dash-scroll">
          {props.navItems.map(({ value, label, Icon: NavIcon, badge }) => (
            <button
              key={value}
              onClick={() => props.onTabChange(value)}
              className="dash-nav-item w-full text-sm text-left"
              data-active={props.activeTab === value}
            >
              <NavIcon className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{label}</span>
              {badge !== undefined && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md chip-ruby">{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-text-dark/10 flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm flex items-center justify-center chip-mist">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-dark truncate">Demo account</p>
            <p className="text-[11px] text-muted-foreground truncate">Synthetic data only</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden dash-topbar p-3 flex overflow-x-auto gap-1 shrink-0 dash-scroll">
          {props.navItems.map(({ value, short, Icon: NavIcon }) => (
            <button
              key={value}
              onClick={() => props.onTabChange(value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 font-medium",
                props.activeTab === value ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent/40 hover:text-text-dark"
              )}
            >
              <NavIcon className="w-3 h-3" />{short}
            </button>
          ))}
        </div>

        <div className="dash-topbar px-4 md:px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div>
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-primary">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-text-dark font-outfit font-semibold text-sm">{dashboardName}</span>
            </div>
            <div className="hidden md:block">
              <h1 className="font-outfit font-bold text-text-dark text-lg">{props.heading}</h1>
              <p className="text-xs text-muted-foreground">{props.description}</p>
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

  return <GradientBackground className="dashboard-surface flex flex-col min-h-screen">{content}</GradientBackground>;
}
