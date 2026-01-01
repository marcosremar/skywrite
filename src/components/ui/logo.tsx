"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 40, text: "text-2xl" },
  xl: { icon: 48, text: "text-3xl" },
};

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Logo Icon - Feather pen with cloud */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Cloud base */}
        <path
          d="M12 32C8.68629 32 6 29.3137 6 26C6 23.2076 7.91896 20.8648 10.5 20.1707C10.1772 19.5086 10 18.7727 10 18C10 15.2386 12.2386 13 15 13C15.7727 13 16.5086 13.1772 17.1707 13.5C17.8648 10.919 20.2076 9 23 9C24.5 9 25.87 9.55 26.97 10.44"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="opacity-60"
        />
        <path
          d="M32 28C35.3137 28 38 25.3137 38 22C38 19.2076 36.081 16.8648 33.5 16.1707C33.8228 15.5086 34 14.7727 34 14C34 11.2386 31.7614 9 29 9"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="opacity-40"
        />

        {/* Feather pen */}
        <path
          d="M38 10L20 28L16 32L18 34L22 30L40 12C41.1046 10.8954 41.1046 9.10457 40 8C38.8954 6.89543 37.1046 6.89543 36 8L38 10Z"
          fill="var(--primary)"
          className="opacity-90"
        />
        <path
          d="M20 28L16 32L18 34L22 30"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pen tip */}
        <path
          d="M16 32L14 38L18 34"
          fill="var(--primary)"
        />

        {/* Writing line */}
        <path
          d="M14 40H28"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          className="opacity-50"
        />
      </svg>

      {showText && (
        <span className={cn("font-semibold tracking-tight", text)}>
          <span className="text-foreground">Sky</span>
          <span className="text-primary">Write</span>
        </span>
      )}
    </div>
  );
}

export function LogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cloud base */}
      <path
        d="M12 32C8.68629 32 6 29.3137 6 26C6 23.2076 7.91896 20.8648 10.5 20.1707C10.1772 19.5086 10 18.7727 10 18C10 15.2386 12.2386 13 15 13C15.7727 13 16.5086 13.1772 17.1707 13.5C17.8648 10.919 20.2076 9 23 9C24.5 9 25.87 9.55 26.97 10.44"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-60"
      />
      <path
        d="M32 28C35.3137 28 38 25.3137 38 22C38 19.2076 36.081 16.8648 33.5 16.1707C33.8228 15.5086 34 14.7727 34 14C34 11.2386 31.7614 9 29 9"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="opacity-40"
      />

      {/* Feather pen */}
      <path
        d="M38 10L20 28L16 32L18 34L22 30L40 12C41.1046 10.8954 41.1046 9.10457 40 8C38.8954 6.89543 37.1046 6.89543 36 8L38 10Z"
        fill="var(--primary)"
        className="opacity-90"
      />
      <path
        d="M20 28L16 32L18 34L22 30"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pen tip */}
      <path
        d="M16 32L14 38L18 34"
        fill="var(--primary)"
      />

      {/* Writing line */}
      <path
        d="M14 40H28"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-50"
      />
    </svg>
  );
}
