
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['popup.js', 'background.js'],
    bundle: true,
    outdir: '.',
    entryNames: '[name].bundle',
    minify: true,
    sourcemap: true,
    target: ['chrome100'],
    platform: 'browser',
    define: {
        'process.env.NODE_ENV': '"production"'
    }
}).then(() => {
    console.log('Build complete: popup.bundle.js and background.bundle.js');
}).catch(() => process.exit(1));
