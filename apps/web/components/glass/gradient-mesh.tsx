import { cn } from '@/lib/utils';

export type GradientMeshPreset = 'dashboard' | 'marketing' | 'auth';

export interface GradientMeshProps {
  preset?: GradientMeshPreset;
  className?: string;
}

export function GradientMesh({ preset = 'dashboard', className }: GradientMeshProps) {
  return (
    <div className={cn('gradient-mesh', `gradient-mesh-${preset}`, className)} aria-hidden="true" />
  );
}
