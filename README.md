# Billy 2.0

Bill tracker that always keeps the next bill due at the top.

## Put it on GitHub Pages
1. Create a new public repo on GitHub (for example `billy`).
2. Upload **everything in this folder** to the repo root, keeping the `icons` folder:
   - index.html
   - styles.css
   - app.js
   - sw.js
   - manifest.webmanifest
   - icons/ (icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png, favicon.png)
3. Go to **Settings > Pages**, set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, then Save.
4. After a minute, open `https://YOUR-USERNAME.github.io/billy/`.

## Install on iPhone
Open the link in **Safari**, tap **Share**, then **Add to Home Screen**. Billy opens full screen like a real app and works offline.

## Updating later
After you change any file, open `sw.js` and bump the version (`billy-v2.0.0` to `billy-v2.0.1`) so phones load the new version.

## Your data
Bills are saved on each device. Use **Settings > Export backup** and **Import backup** to move them between your phone and PC. Bills from Billy v1 carry over automatically on the same device and browser.
