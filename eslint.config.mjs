import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Base recommended rules
  eslint.configs.recommended,

  // TypeScript strict type-checked rules
  ...tseslint.configs.strict,

  // TypeScript parser options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Custom rules
  {
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },

  // API routes: allow non-null assertions (user! is guaranteed by requiresAuth)
  {
    files: ['apps/web/app/api/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Prettier must be last to override conflicting rules
  prettierConfig,

  // Service worker globals
  {
    files: ['apps/web/public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        clients: 'readonly',
        caches: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Browser globals for widget embed scripts
  {
    files: ['apps/web/public/widget/**/*.js', 'apps/web/public/schedulebox-widget.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        customElements: 'readonly',
        HTMLElement: 'readonly',
        MutationObserver: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-this-alias': 'off',
    },
  },

  // Node.js globals for security config
  {
    files: ['security/**/*.mjs', 'security/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'docker/**',
      'k8s/**',
      '.planning/**',
      '.claude/**',
      '.storybook/**',
      'storybook-static/**',
      'load-tests/**',
      'helm/**',
      '_*.cjs',
      '_*.mjs',
      '_*.ps1',
      '_*.bat',
      '_*.js',
      'nul',
      '**/next-env.d.ts',
    ],
  },
);
