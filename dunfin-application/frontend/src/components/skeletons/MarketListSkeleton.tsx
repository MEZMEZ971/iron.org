import { GlassSkeleton, GlassSkeletonLine } from "../ui/GlassSkeleton";

const ROW_COUNT = 10;

export function MarketListSkeleton() {
  return (
    <div className="df-table-shell glass-card overflow-hidden rounded-2xl">
      <div className="grid grid-cols-3 gap-2 border-b border-df bg-df-table-head px-3 py-2.5">
        <GlassSkeletonLine className="h-2.5 w-16" />
        <GlassSkeletonLine className="ms-auto h-2.5 w-14" />
        <GlassSkeletonLine className="ms-auto h-2.5 w-12" />
      </div>
      <ul className="divide-y divide-[var(--df-border)]">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <li key={i} className="grid grid-cols-3 items-center gap-2 px-3 py-3.5">
            <div className="space-y-2">
              <GlassSkeletonLine className="h-3.5 w-10" />
              <GlassSkeletonLine className="h-2 w-20" />
            </div>
            <GlassSkeletonLine className="ms-auto h-3.5 w-16" />
            <GlassSkeleton className="ms-auto h-6 w-[4.5rem] rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
