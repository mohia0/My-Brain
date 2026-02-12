# Chrome Extension Publishing Guide

Your Brainia extension is now ready for production!

## Files Packaged
We have created a `brainia-extension.zip` in the project root. This zip contains:
- `manifest.json` (Production config)
- `background.bundle.js` (Bundled logic)
- `popup.bundle.js` (Bundled UI logic)
- `popup.html` & `popup.css` (UI)
- `content.js` (Site detection)
- `Icon.png` (Extension icons)

## How to Publish to Chrome Web Store
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Click **+ New Item**.
3. Upload the `brainia-extension.zip` file.
4. Fill in the store listing details (Description, Screenshots, etc.).
5. Submit for review!

## How to Generate a .crx File (for Manual Distribution)
If you want a `.crx` file for sharing directly (not via Store):
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Pack extension**.
4. Set the **Extension root directory** to the `publish` folder created in this project.
5. Click **Pack extension**.
6. Chrome will generate a `.crx` file and a `.pem` (private key) in the parent directory.

## Maintenance
- To update the extension, run `npm run build` inside the `extension` folder.
- Bump the `version` in `extension/manifest.json` before uploading a new version to the Store.
