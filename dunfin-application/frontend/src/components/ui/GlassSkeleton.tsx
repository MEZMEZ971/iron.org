import type { CSSProperties, ReactNode } from "react";

interface GlassSkeletonProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Shimmering glass wireframe block — pairs with `animate-pulse` for depth */
export function GlassSkeleton({ className = "", style, children }: GlassSkeletonProps) {
  return (
    <div
      className={`glass-skeleton animate-pulse rounded-xl ${className}`}
      style={style}
      aria-hidden
    >
      {children}
    </div>
  );
}

interface GlassSkeletonLineProps {
  className?: string;
}

export function GlassSkeletonLine({ className = "" }: GlassSkeletonLineProps) {
  return <GlassSkeleton className={`h-3 ${className}`} />;
}
