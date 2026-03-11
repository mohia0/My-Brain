const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const apiPath = path.join(__dirname, '..', 'app', 'api');
const backupPath = path.join(__dirname, '..', 'app', '_api_backup');

console.log('--- MOBILE BUILD SCRIPT ---');
let apiMoved = false;

try {
  // Move api to _api_backup if api exists
  if (fs.existsSync(apiPath)) {
    console.log('Moving app/api to app/_api_backup to prevent Next.js static export errors...');
    try {
        fs.renameSync(apiPath, backupPath);
        apiMoved = true;
    } catch (renameErr) {
        if (renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') {
            console.error('\n❌ ERROR: Cannot rename app/api folder because it is locked by another process.');
            console.error('💡 HINT: Please stop any running "next dev" (npm run dev) servers before running this mobile build script.\n');
        }
        throw renameErr;
    }
  }
} catch (e) {
  console.error('Failed to move app/api:', e);
  process.exit(1);
}

// Run the Next.js build
console.log('Starting Next.js build for Capacitor...');
const result = spawnSync('next', ['build'], {
  stdio: 'inherit',
  env: { ...process.env, IS_CAPACITOR_BUILD: 'true' },
  shell: true
});

try {
  // Restore api folder
  if (apiMoved || fs.existsSync(backupPath)) {
    console.log('Restoring app/_api_backup to app/api...');
    if (fs.existsSync(apiPath)) {
        // Just in case it was recreated, remove it
        fs.rmSync(apiPath, { recursive: true, force: true });
    }
    fs.renameSync(backupPath, apiPath);
  }
} catch (e) {
  console.error('Failed to restore app/api:', e);
}

if (result.error) {
    console.error('Build process failed to start:', result.error);
    process.exit(1);
}

if (result.status !== 0) {
    console.log(`Build process exited with code ${result.status}`);
    process.exit(result.status || 1);
}

console.log('Mobile build completed successfully.');
