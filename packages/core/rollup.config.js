import { defineConfig } from 'rollup';

import { buildConfig } from '../../scripts/build.config.mjs';

const configs = buildConfig({ packageName: '@ras-cli/core' });

export default defineConfig(configs);
