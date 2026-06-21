"use client";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
  trackClassName?: string;
  progressClassName?: string;
}

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = true,
  labelClassName,
  trackClassName,
  progressClassName,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Determine color based on progress
  const getProgressColor = () => {
    if (progress >= 90) return "stroke-green-500";
    if (progress >= 70) return "stroke-primary";
    if (progress >= 50) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn("stroke-muted", trackClassName)}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-500 ease-out",
            getProgressColor(),
            progressClassName
          )}
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            "absolute text-xs font-semibold",
            labelClassName
          )}
        >
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  height?: number;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  className,
  showLabel = false,
  height = 8,
  animated = true,
}: ProgressBarProps) {
  // Determine color based on progress
  const getProgressColor = () => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-primary";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className="w-full bg-muted rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            getProgressColor(),
            animated && "animate-pulse-subtle"
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground mt-1">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
