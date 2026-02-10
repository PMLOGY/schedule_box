/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce scope from project segments + common scopes
    'scope-enum': [
      2,
      'always',
      [
        'database',
        'backend',
        'frontend',
        'devops',
        'docs',
        'shared',
        'events',
        'ui',
        'web',
        'deps',
      ],
    ],
    // Scope is optional (allow scopeless commits like "chore: update deps")
    'scope-empty': [0],
    // Subject max length
    'subject-max-length': [2, 'always', 100],
  },
};
