import { cn } from '@/lib/utils';

interface GlassShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function GlassShimmer({ className, ...props }: GlassShimmerProps) {
  return (
    <div
      className={cn('rounded-xl glass-surface-subtle overflow-hidden relative', className)}
      {...props}
    >
      <div
        className="absolute inset-0 animate-shimmer rounded-xl"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}
