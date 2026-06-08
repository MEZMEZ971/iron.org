import { GlassSkeleton, GlassSkeletonLine } from "../ui/GlassSkeleton";

function MetricSkeleton({ className = "" }: { className?: string }) {
  return (
    <GlassSkeleton className={`px-3 py-3 ${className}`}>
      <GlassSkeletonLine className="h-2 w-20" />
      <GlassSkeletonLine className="mt-2 h-4 w-24" />
    </GlassSkeleton>
  );
}

function GenRowSkeleton() {
  return (
    <GlassSkeleton className="px-4 py-3">
      <GlassSkeletonLine className="h-3.5 w-28" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <GlassSkeletonLine className="h-4 w-32" />
        <GlassSkeletonLine className="ms-auto h-4 w-12" />
      </div>
    </GlassSkeleton>
  );
}

function TableSkeleton({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <div className="df-table-shell overflow-hidden rounded-2xl">
      <div className="border-b border-df px-3 py-3">
        <div className="grid gap-2" style={gridStyle}>
          {Array.from({ length: cols }, (_, i) => (
            <GlassSkeletonLine key={i} className="h-2.5 w-full max-w-[5rem]" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--df-border)]">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid gap-2 px-3 py-3.5" style={gridStyle}>
            {Array.from({ length: cols }, (_, j) => (
              <GlassSkeletonLine
                key={j}
                className={`h-3 w-full max-w-[6rem] ${j === cols - 1 ? "ms-auto" : j === 1 && cols > 2 ? "justify-self-center" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading team data">
      <div className="grid grid-cols-2 gap-2">
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>

      <div className="space-y-2">
        <GlassSkeletonLine className="h-4 w-40" />
        <GenRowSkeleton />
        <GenRowSkeleton />
        <GenRowSkeleton />
      </div>

      <GlassSkeleton className="h-11 w-full rounded-xl p-1">
        <div className="flex h-full gap-1">
          <GlassSkeleton className="flex-1 rounded-lg opacity-80" />
          <GlassSkeleton className="flex-1 rounded-lg opacity-60" />
          <GlassSkeleton className="flex-1 rounded-lg opacity-60" />
        </div>
      </GlassSkeleton>

      <TableSkeleton rows={6} cols={3} />

      <div className="space-y-3">
        <GlassSkeletonLine className="h-4 w-36" />
        <TableSkeleton rows={4} cols={4} />
      </div>
    </div>
  );
}
