// ESLint 9 flat config (`next lint` no longer exists in Next 16). Type safety is enforced by `tsc --noEmit`
// and `next build`; this catches React/Next pitfalls. Rules that flag existing, harmless patterns are warnings
// so the baseline is green and new code gets feedback without blocking.
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'node_modules/**', 'next-env.d.ts', 'public/**', '**/*.js', '**/*.mjs']),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',      // API payloads are loosely typed on purpose
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react/no-unescaped-entities': 'off',              // Portuguese copy uses plain quotes and apostrophes
      '@next/next/no-img-element': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler-oriented rules (new in eslint-plugin-react-hooks 6/7) flag many existing, working patterns
      // (setState in effects, components defined in render, impure calls). Warn so they get cleaned up gradually.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]);
