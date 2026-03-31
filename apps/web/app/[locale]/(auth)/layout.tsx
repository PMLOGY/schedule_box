'use client';

import { motion } from 'motion/react';
import { GradientMesh } from '@/components/glass/gradient-mesh';
import { GlassPanel } from '@/components/glass/glass-panel';
import { SkipLink } from '@/components/accessibility/skip-link';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <SkipLink />
      <GradientMesh preset="auth" />
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <main id="main-content" tabIndex={-1} className="w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">ScheduleBox</h1>
            <p className="text-muted-foreground mt-2">AI-powered scheduling for SMBs</p>
          </div>

          <GlassPanel intensity="heavy" className="p-6 rounded-xl">
            {children}
          </GlassPanel>
        </motion.div>
      </main>
    </div>
  );
}
