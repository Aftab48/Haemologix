import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle, Ban } from "lucide-react";

type VerificationStatus = 
  | "PENDING" 
  | "AUTO_REJECTED" 
  | "MATCHED_FOR_ADMIN" 
  | "ADMIN_REJECTED" 
  | "APPROVED";

interface VerificationBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export function VerificationBadge({ status, className = "" }: VerificationBadgeProps) {
  const statusConfig = {
    PENDING: {
      label: "Pending Verification",
      color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      icon: Clock,
    },
    AUTO_REJECTED: {
      label: "Auto-Rejected",
      color: "bg-red-500/20 text-red-300 border-red-500/30",
      icon: XCircle,
    },
    MATCHED_FOR_ADMIN: {
      label: "Verified - Admin Review",
      color: "bg-green-500/20 text-green-300 border-green-500/30",
      icon: CheckCircle,
    },
    ADMIN_REJECTED: {
      label: "Rejected by Admin",
      color: "bg-red-500/20 text-red-300 border-red-500/30",
      icon: Ban,
    },
    APPROVED: {
      label: "Approved",
      color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      icon: CheckCircle,
    },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border flex items-center gap-2 ${className}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </Badge>
  );
}

interface SuspensionBadgeProps {
  suspendedUntil: Date | null;
  className?: string;
}

export function SuspensionBadge({ suspendedUntil, className = "" }: SuspensionBadgeProps) {
  if (!suspendedUntil || new Date() >= new Date(suspendedUntil)) {
    return null;
  }

  const daysRemaining = Math.ceil(
    (new Date(suspendedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Badge className={`bg-black/20 text-white border-black/30 border flex items-center gap-2 ${className}`}>
      <Ban className="w-4 h-4" />
      Suspended ({daysRemaining}d remaining)
    </Badge>
  );
}

interface AttemptsBadgeProps {
  attempts: number;
  maxAttempts?: number;
  className?: string;
}

export function AttemptsBadge({ attempts, maxAttempts = 3, className = "" }: AttemptsBadgeProps) {
  const color = 
    attempts === 0 
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : attempts < maxAttempts
      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      : "bg-red-500/20 text-red-300 border-red-500/30";

  return (
    <Badge className={`${color} border ${className}`}>
      {attempts}/{maxAttempts} Verification Attempts
    </Badge>
  );
}

