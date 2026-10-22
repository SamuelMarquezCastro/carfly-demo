# CARFLY — De stad krijgt een tweede verdieping

A small Vite + JavaScript flying-car simulator. Three.js renders a silver concept vehicle, smooth flight and a chase camera. CesiumJS streams Google's Photorealistic 3D Tiles when configured. No backend, React, database, account or Cesium ion token is needed.

## Start locally

Use Node.js 22.12+ (tested with Node 24.21).

```sh
npm install
cp .env.example .env
npm run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173. **Leave the keys empty to fly immediately in the fallback demo.** The fallback is a fictional, Belgian-inspired concept city, not a geographic reconstruction of Mechelen or Google Maps data. Its buildings, river and tower are procedural placeholders, clearly labelled in the interface.

```sh
npm test
npm run build
npm run preview
```

`npm test` checks acceleration, damping, turning, altitude limits and movement across frame rates. `npm run build` creates the static site in `dist/`, including Cesium workers, widgets and assets. Serve that entire directory over HTTP(S); do not open `index.html` using `file://`. This prototype expects to be hosted at the domain root.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Keep the root directory at the repository root. `vercel.json` configures Vite, `npm ci`, `npm run build`, and output directory `dist`.
3. Choose Node.js **24.x** in the project settings.
4. For the working concept-city fallback, no environment variables are needed. Click **Deploy**.
5. For real Google tiles, add `VITE_GOOGLE_MAPS_API_KEY` in Vercel's project environment variables. Optionally add `VITE_GOOGLE_GEOCODING_API_KEY` for city search. Add your actual Vercel domain to each key's allowed website referrers, e.g. `https://your-project.vercel.app/*`.
6. Redeploy after changing environment variables; Vite embeds these values during the build. Keep `.env` out of GitHub.

Cesium's assets are copied into `dist/cesium` by the build, so Vercel serves the workers and textures with the rest of the static site. No serverless functions or paid database are required. See [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build).

## Google setup

1. Create a Google Cloud project with billing enabled.
2. Enable **Map Tiles API** for Photorealistic 3D Tiles.
3. Create a browser API key. In `.env`, set `VITE_GOOGLE_MAPS_API_KEY` to that key.
4. Under application restrictions, select **Websites / HTTP referrers**. Allow `http://127.0.0.1:5173/*`, `http://localhost:5173/*`, and your actual deployed HTTPS domain. Add the preview origin/port if needed. Restrict the key's APIs to **Map Tiles API**.
5. For arbitrary city-name search, enable **Maps JavaScript API** and **Geocoding API**, create a browser-restricted key for those APIs, and set `VITE_GOOGLE_GEOCODING_API_KEY`. The app uses Google's browser Geocoder through the Maps JavaScript SDK, rather than calling a server-oriented REST endpoint with an unrestricted key.
6. Restart Vite after editing `.env`. Production environment variables are baked in at build time, so rebuild after changes.

Without a geocoding key, built-in launch coordinates are available for **Mechelen, Antwerp/Antwerpen, Brussels/Brussel and Ghent/Gent**. Other city names show an actionable error. With a geocoding key, the address is sent to Google; if lookup fails for a built-in city, those launch coordinates are used. City selection in fallback mode changes the label, not the fictional scenery.

Vite's `VITE_*` variables are **browser-visible**, including in built assets and network requests. `.env` keeps keys out of source control; it cannot make client-side keys secret. Keep domain and API restrictions in place. Never put an unrestricted server key here. Configure quotas and billing alerts in your Google project.

Google's data availability and account eligibility vary by region. In particular, Google's documentation describes changes affecting EEA billing accounts from July 2025. A Belgian account or Mechelen query does not guarantee access or photorealistic building coverage. See [Google's current 3D Tiles documentation](https://developers.google.com/maps/documentation/tile/3d-tiles) and [EEA changes](https://developers.google.com/maps/comms/eea/faq).

## Controls

| Input | Action |
| --- | --- |
| W / S | Accelerate forward / backward |
| A / D | Turn left / right |
| Space / Shift | Ascend / descend |
| Mouse drag | Orbit the third-person camera |
| R or Reset vlucht | Reset position, heading and speed |
| E (hold with W) | Boost up to about 259 km/h |
| X | Brake to a hover |
| P | Pause / resume the flight |
| C | Recenter the chase camera |
| Andere stad | Return to city selection |

Touch devices get on-screen flight buttons, including boost. The game pauses when the window loses focus or the tab is hidden; press P or choose Verder vliegen to resume. Cruise speed is capped at 46 m/s (about 166 km/h), boost at 72 m/s, and reverse at 18 m/s. The car damps toward a hover when input stops. Altitude is limited to 120–900 metres above the launch reference. The default launch is 155 metres above that reference. **This is not an accurate above-ground altitude readout or a collision system.** Taller buildings and hills can still intersect the flight path; climb or reset when needed.

### Optional City Run

The concept city has a seven-checkpoint route. Fly through the bright blue ring; the route panel shows the next ring's distance, target altitude, relative turn direction, elapsed flight time and progress. The timer begins when you move, stops while paused, and freezes on completion. R resets the route and the vehicle. Checkpoint detection checks the swept flight segment so high-speed crossings count. You can ignore the route and fly freely. These fictional rings are hidden in Google mode and are not presented as a real-world route.

## Rendering and coordinate integration

The fallback scene and car share one Three.js renderer. In Google mode, Cesium renders the real city into a separate canvas below the transparent Three.js canvas. Both render in the same animation loop. The Three.js chase camera is the authority; its position, direction, up vector, vertical field of view, aspect ratio and clipping distances are synchronized to Cesium every frame using public APIs.

Flight coordinates use metres in a local east/up/south frame. A Cesium east/north/up transform at the chosen longitude/latitude converts `(x, y, z)` into `(east=x, north=-z, up=y)` and then Earth-fixed coordinates. This keeps Three.js coordinates small and avoids precision jitter. A single public `sampleHeightMostDetailed` query adjusts the launch reference to the streamed surface if supported. Until it resolves, known cities use approximate reference heights; other cities use the ellipsoid. No Google building meshes are extracted, retained, or used for collisions.

Tiles load with Cesium's `createGooglePhotorealistic3DTileset`, directly using the Google key. `showCreditsOnScreen` is enabled and Cesium's attribution UI is preserved. Google's logo and data-provider credits must remain visible when hosting or editing the interface. See [Cesium's integration guidance](https://cesium.com/blog/2017/10/23/integrating-cesium-with-threejs/) and [Google's renderer guidance](https://developers.google.com/maps/documentation/tile/use-renderer).

## Failures and coverage

- No tile key: automatic fallback, no Google requests for map tiles.
- Invalid city / geocoder failure: explains the error on the welcome screen; built-in city coordinates remain usable.
- Root tileset rejection or 20-second request timeout: automatic fallback.
- No visible tiles within 30 seconds, repeated tile errors, or rendering failure: automatic fallback.
- Sparse or flat data: **Conceptstad** switches to the fictional scene at any time. A visible tile does not prove detailed 3D building coverage; the app does not claim to validate such coverage.
- WebGL unavailable: explicit browser/hardware-acceleration message.

The Google path needs working credentials, billing, domain restrictions, network access and actual data coverage. It cannot be verified live without those credentials. The no-key simulator is fully usable on its own. Fonts use Google Fonts when reachable and local sans-serif fallbacks otherwise.

## Files

- `src/main.js`: UI, inputs, animation and chase camera.
- `src/flight.js`: deterministic flight dynamics.
- `src/challenge.js`: fictional route and swept checkpoint detection.
- `src/scene.js`: low-poly car and fictional fallback environment.
- `src/maps.js`: Google Geocoder, Cesium tiles and coordinate/camera synchronization.
- `vite.config.js`: Cesium worker/static asset serving and production copying.

Dependencies are pinned and `package-lock.json` is included for reproducible installation (`npm ci`).
