import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/shared/table-skeleton';

interface PageSkeletonProps {
  variant?: 'dashboard' | 'table' | 'cards' | 'form' | 'detail';
}

function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

function DashboardVariant() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );
}

function TableVariant() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}

function CardsVariant() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function FormVariant() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="space-y-6 max-w-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailVariant() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-[160px] rounded-xl" />
          <Skeleton className="h-[160px] rounded-xl" />
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = 'dashboard' }: PageSkeletonProps) {
  switch (variant) {
    case 'dashboard':
      return <DashboardVariant />;
    case 'table':
      return <TableVariant />;
    case 'cards':
      return <CardsVariant />;
    case 'form':
      return <FormVariant />;
    case 'detail':
      return <DetailVariant />;
    default:
      return <DashboardVariant />;
  }
}
