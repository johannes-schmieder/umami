// Vercel CLI uploads omit Git metadata, so build-time formatting cannot use it.
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('biome.json', 'utf8'));
config.vcs = { ...config.vcs, enabled: false };
fs.writeFileSync('biome.json', JSON.stringify(config, null, 2) + '\n');
