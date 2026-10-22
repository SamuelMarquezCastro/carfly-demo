const locations = {
  mechelen: { lat: 51.0259, lng: 4.4775, name: 'Mechelen, Belgium', ground: 12 },
  antwerp: { lat: 51.2211, lng: 4.3997, name: 'Antwerp, Belgium', ground: 15 },
  antwerpen: { lat: 51.2211, lng: 4.3997, name: 'Antwerpen, Belgium', ground: 15 },
  brussels: { lat: 50.8467, lng: 4.3525, name: 'Brussels, Belgium', ground: 50 },
  brussel: { lat: 50.8467, lng: 4.3525, name: 'Brussel, Belgium', ground: 50 },
  ghent: { lat: 51.0543, lng: 3.7244, name: 'Ghent, Belgium', ground: 10 },
  gent: { lat: 51.0543, lng: 3.7244, name: 'Gent, Belgium', ground: 10 },
};
let geocoderPromise;
function geocoder(key) {
  if (!geocoderPromise) geocoderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = '__carflyMapsReady';
    window[callback] = async () => {
      try { const { Geocoder } = await google.maps.importLibrary('geocoding'); resolve(new Geocoder()); }
      catch { reject(new Error('Google Geocoding kon niet starten. Controleer de API-instellingen.')); }
      delete window[callback];
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=${callback}&v=weekly`;
    script.onerror = () => reject(new Error('Google Geocoding is niet bereikbaar.'));
    document.head.append(script);
  });
  return geocoderPromise;
}
export async function locateCity(query) {
  const known = locations[query.trim().toLowerCase().split(',')[0].trim()];
  const key = import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY?.trim();
  if (!key) {
    if (known) return known;
    throw new Error('Zonder geocoding-sleutel kun je Mechelen, Antwerpen, Brussel of Gent kiezen.');
  }
  try {
    const client = await geocoder(key);
    const { results } = await client.geocode({ address: query });
    if (!results.length) throw new Error();
    const result = results[0];
    return { lat: result.geometry.location.lat(), lng: result.geometry.location.lng(), name: result.formatted_address, ground: known?.ground ?? 0 };
  } catch {
    if (known) return known;
    throw new Error('Stad niet gevonden of Geocoding geweigerd. Controleer de naam en je API-instellingen.');
  }
}

export async function loadRealCity(container, location, key, onFailure, onReady) {
  const C = await import('cesium');
  const viewer = new C.Viewer(container, {
    baseLayer: false, globe: false, animation: false, timeline: false,
    baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, fullscreenButton: false, selectionIndicator: false,
    infoBox: false, useDefaultRenderLoop: false, skyBox: false,
  });
  let destroyed = false, timer, removeVisible, removeError;
  const cleanup = () => {
    if (destroyed) return;
    destroyed = true; clearTimeout(timer); removeVisible?.(); removeError?.();
    if (!viewer.isDestroyed()) viewer.destroy();
  };
  try {
    viewer.scene.screenSpaceCameraController.enableInputs = false;
    viewer.scene.backgroundColor = C.Color.fromCssColorString('#b5cbd5');
    viewer.scene.fog.enabled = false;
    viewer.resolutionScale = Math.min(devicePixelRatio, 1.5);
    // Public Cesium API, direct Google key: no Cesium ion token required.
    let requestTimer;
    let tileset;
    try {
      const request = C.createGooglePhotorealistic3DTileset({ key, onlyUsingWithGoogleGeocoder: true }, { showCreditsOnScreen: true, enableCollision: false, cacheBytes: 256 * 1024 * 1024, maximumCacheOverflowBytes: 128 * 1024 * 1024 });
      // Dispose a response that arrives after the deadline rather than leaking GPU resources.
      request.then(result => { if (destroyed) result.destroy(); }, () => {});
      tileset = await Promise.race([request, new Promise((_,reject)=>{
        requestTimer = setTimeout(()=>reject(new Error('Tile request timeout')),20000);
      })]);
    } finally { clearTimeout(requestTimer); }
    if (destroyed) return;
    viewer.scene.primitives.add(tileset);
    tileset.maximumScreenSpaceError = 12;
    let seen = false;
    timer = setTimeout(() => { if (!seen) onFailure('Geen 3D-tiles ontvangen. Mogelijk geen dekking of toegang.'); }, 30000);
    removeVisible = tileset.tileVisible.addEventListener(() => {
      if (!seen) { seen = true; clearTimeout(timer); onReady(); }
    });
    let failures = 0;
    removeError = tileset.tileFailed.addEventListener(() => {
      if (++failures >= 6) onFailure('Google-tiles laden niet betrouwbaar. Controleer toegang, quota en dekking.');
    });
    viewer.scene.renderError.addEventListener(() => onFailure('De 3D-kaart kon niet worden gerenderd.'));
    let origin = C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(location.lng, location.lat, location.ground));
    // One public height query establishes a safe launch reference, including in hilly cities.
    // No building meshes are read or extracted and this is not a collision system.
    if (viewer.scene.sampleHeightSupported) {
      viewer.scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(location.lng, location.lat)])
        .then(([point]) => {
          if (!destroyed && Number.isFinite(point.height)) {
            origin = C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(location.lng,location.lat,point.height));
          }
        }).catch(()=>{});
    }
    const localPoint = new C.Cartesian3(), worldPoint = new C.Cartesian3();
    function convert(v, direction = false) {
      localPoint.x = v.x; localPoint.y = -v.z; localPoint.z = v.y;
      (direction ? C.Matrix4.multiplyByPointAsVector : C.Matrix4.multiplyByPoint)(origin, localPoint, worldPoint);
      return C.Cartesian3.clone(worldPoint);
    }
    return {
      destroy: cleanup,
      render(camera) {
        if (destroyed) return;
        viewer.resize();
        const direction = camera.getWorldDirection(camera.userData.direction);
        const up = camera.userData.up.set(0,1,0).applyQuaternion(camera.quaternion);
        viewer.camera.setView({ destination: convert(camera.position), orientation: { direction: convert(direction, true), up: convert(up, true) } });
        const fovy = camera.fov * Math.PI / 180;
        viewer.camera.frustum.aspectRatio = camera.aspect;
        viewer.camera.frustum.fov = camera.aspect > 1 ? 2 * Math.atan(Math.tan(fovy / 2) * camera.aspect) : fovy;
        viewer.camera.frustum.near = camera.near;
        viewer.camera.frustum.far = camera.far;
        viewer.render();
      },
    };
  } catch {
    cleanup();
    throw new Error('Google 3D is niet beschikbaar. Controleer Map Tiles API, facturering en domeinrestricties.');
  }
}
