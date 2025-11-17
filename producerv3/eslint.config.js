import eslintPluginAstro from 'eslint-config-astro';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.{ts,tsx,astro}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
);

