"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { listItem } from "./motion";

type ChipVariant = "ruby" | "oxygen" | "mist" | "dark";

interface StatCardProps {
  icon: LucideIcon;
  chip?: ChipVariant;
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function StatCard({
  icon: Icon,
  chip = "ruby",
  label,
  value,
  children,
  className,
}: StatCardProps) {
  return (
    <motion.div
      variants={listItem}
      className={cn("dash-card dash-card-interactive p-5", className)}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            `chip-${chip}`
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          {value !== undefined && (
            <p className="text-2xl font-outfit font-bold text-text-dark leading-tight">
              {value}
            </p>
          )}
          {children}
          <p className="text-sm text-text-dark/60 truncate">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
