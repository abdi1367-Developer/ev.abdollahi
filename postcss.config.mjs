/** @type {import('postcss-load-config').Config} */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// مسیر صریح کانفیگ Tailwind تا مستقل از cwd فرآیند Next پیدا شود.
const root = dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    tailwindcss: { config: join(root, 'tailwind.config.ts') },
    autoprefixer: {},
  },
};

export default config;
