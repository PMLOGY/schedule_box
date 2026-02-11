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
      '_fix_imports.cjs',
      '_fix_imports.ps1',
      '_test_*.ps1',
      '_test_*.cjs',
      '_test_*.mjs',
      '_test_*.bat',
      '_write_*.js',
      'nul',
    ],
  },
);
