import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const config: StorybookConfig = {
  stories: ['../apps/web/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (viteConfig) => {
    // Resolve @/* aliases to apps/web paths (mirrors tsconfig paths)
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias as Record<string, string>),
      '@/app': path.resolve(__dirname, '../apps/web/app'),
      '@/components': path.resolve(__dirname, '../apps/web/components'),
      '@/lib': path.resolve(__dirname, '../apps/web/lib'),
      '@/hooks': path.resolve(__dirname, '../apps/web/hooks'),
      '@/validations': path.resolve(__dirname, '../apps/web/validations'),
      '@/stores': path.resolve(__dirname, '../apps/web/stores'),
      '@': path.resolve(__dirname, '../apps/web'),
    };

    // Configure Tailwind CSS via PostCSS
    viteConfig.css = viteConfig.css ?? {};
    viteConfig.css.postcss = {
      plugins: [
        tailwindcss({
          config: path.resolve(__dirname, '../apps/web/tailwind.config.ts'),
        }),
        autoprefixer(),
      ],
    };

    return viteConfig;
  },
};

export default config;
