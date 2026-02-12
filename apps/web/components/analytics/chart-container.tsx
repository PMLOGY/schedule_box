/**
 * Accessible Chart Container
 * Wrapper for Recharts with WCAG 2.1 AA compliance
 */

import { type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartContainerProps {
  children: ReactNode;
  title: string;
  description: string;
  id: string;
}

export function ChartContainer({ children, title, description, id }: ChartContainerProps) {
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  return (
    <figure role="img" aria-labelledby={titleId} aria-describedby={descId}>
      {/* Screen reader only title and description */}
      <div id={titleId} className="sr-only">
        {title}
      </div>
      <div id={descId} className="sr-only">
        {description}
      </div>

      {/* Visible caption */}
      <figcaption className="text-sm font-medium mb-4">{title}</figcaption>

      {/* Chart with responsive container */}
      <ResponsiveContainer width="100%" height={350}>
        {children}
      </ResponsiveContainer>
    </figure>
  );
}
