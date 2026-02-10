const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const apiDir = path.join(projectRoot, 'app', 'api');
const apiBackupDir = path.join(projectRoot, 'app', '_api_backup');
const middlewareFile = path.join(projectRoot, 'middleware.ts');
const middlewareBackupFile = path.join(projectRoot, '_middleware_backup.ts');

function renameIfExists(oldPath, newPath) {
    if (fs.existsSync(oldPath)) {
        console.log(`Moving ${oldPath} to ${newPath}`);
        fs.renameSync(oldPath, newPath);
        return true;
    }
    return false;
}

function restore(movedApi, movedMiddleware) {
    console.log('Restoring files...');
    if (movedApi) renameIfExists(apiBackupDir, apiDir);
    if (movedMiddleware) renameIfExists(middlewareBackupFile, middlewareFile);
}

try {
    console.log('Preparing for Mobile Build (Static Export)...');

    // 1. Hide API and Middleware
    const movedApi = renameIfExists(apiDir, apiBackupDir);
    const movedMiddleware = renameIfExists(middlewareFile, middlewareBackupFile);

    // 2. Run Build
    console.log('Running Next.js Build...');
    // We explicitly set the environment variable here for the child process
    execSync('npm run build', {
        stdio: 'inherit',
        cwd: projectRoot,
        env: { ...process.env, IS_CAPACITOR_BUILD: 'true' }
    });

    console.log('Build Success!');

    // 3. Sync Capacitor
    console.log('Syncing Capacitor...');
    execSync('npx cap sync', { stdio: 'inherit', cwd: projectRoot });

    // Restore
    restore(movedApi, movedMiddleware);
    console.log('Mobile Build Complete.');

} catch (error) {
    console.error('Build Failed:', error);
    // Ensure restoration happens even on failure
    restore(true, true);
    process.exit(1);
}
