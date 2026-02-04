
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['popup.js'],
    bundle: true,
    outfile: 'popup.bundle.js',
    minify: true,
    sourcemap: false,
    target: ['chrome100'],
    define: {
        'process.env.NODE_ENV': '"production"'
    }
}).then(() => {
    console.log('Build complete: popup.bundle.js');
}).catch(() => process.exit(1));
