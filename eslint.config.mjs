import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '.worktrees/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default eslintConfig;
