import { Skeleton } from '@/components/ui/skeleton';

export function PasswordCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 pb-2">
        <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>

      {/* Password Field */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="flex-1 h-8 rounded-lg" />
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border">
        <Skeleton className="w-7 h-7 rounded-md" />
        <div className="flex gap-1">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function CryptoCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 pb-2">
        <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>

      {/* Address Field */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="flex-1 h-8 rounded-lg" />
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border">
        <Skeleton className="w-7 h-7 rounded-md" />
        <div className="flex gap-1">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}
