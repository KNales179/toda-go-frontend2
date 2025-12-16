// app/passenger/mapHtml.ts

export type PassengerMapHtmlParams = {
  initLat: number;
  initLng: number;
  iconJson: string;     
  iconDataJson: string;  
};

// homepassenger/subfile/mapHtml.ts
export function buildPassengerMapHtml({
  initLat,
  initLng,
  MAPTILER_KEY,
  iconDataJson,
  avatarUrl,
}: {
  initLat: number;
  initLng: number;
  MAPTILER_KEY: string;
  iconDataJson: string;   // already JSON.stringified
  avatarUrl?: string | null;
}) {
  return String.raw`
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
        .distance-label.leaflet-tooltip{
          background:rgba(0,0,0,.85);color:#fff;border:none;border-radius:12px;
          padding:4px 8px;box-shadow:0 1px 4px rgba(0,0,0,.3);
          font-size:12px;line-height:1;white-space:nowrap;
        }
        .distance-label.leaflet-tooltip:before{ display:none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
      <script>
        if (!window.L) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type:'error', msg:'Leaflet failed to load' }));
        }
        // --- Map init ---
        const map = L.map('map', {
          zoomControl: true,
          maxBounds: [[13.96,121.66],[13.88,121.58]],
          maxBoundsViscosity: 0.5,
          minZoom: 13,
          maxZoom: 19, 
          noWrap: true,
          tapTolerance: 60,
        }).setView([${initLat}, ${initLng}], 15);


        L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=7yQg8w68otDEssrPk9wU', {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors | © <a href="https://www.maptiler.com/">MapTiler</a>'
        }).addTo(map);

        // --- State ---
        let userMarker = null;       // blue marker for passenger
        let destMarker = null;       // green dot
        let driverMarker = null;     // car icon
        let destinationLocked = false;

        let routeLine = null;        // drawn polyline
        let distanceTooltip = null;  // route label (distance • time • fare)

        let poiLayer = L.layerGroup().addTo(map);
        let landmarkLayer = L.layerGroup().addTo(map);
        let todaLayer = L.layerGroup().addTo(map);
        let currentZoomLevel = map.getZoom();    // track last zoom to know in/out
        let userMarkerPlaced = false; // <— NEW
        let pickupMarker = null;

        let routePolylines = [];
        let routeHitPolylines = [];
        let routeVariantsMeta = [];
        let activeRouteIndex = null;

        function updateRouteLabelForIndex(idx) {
          if (!routeVariantsMeta || !routeVariantsMeta[idx]) {
            if (distanceTooltip) {
              map.removeLayer(distanceTooltip);
              distanceTooltip = null;
            }
            return;
          }

          const meta = routeVariantsMeta[idx];
          const midArr = meta.midLatLng;
          const label = [meta.distanceText, meta.durationText, meta.fareText]
            .filter(Boolean)
            .join(' • ');

          if (!label || !midArr) {
            if (distanceTooltip) {
              map.removeLayer(distanceTooltip);
              distanceTooltip = null;
            }
            return;
          }

          // Make sure Leaflet gets a real LatLng
          const mid = L.latLng(midArr[0], midArr[1]);

          if (!distanceTooltip) {
            distanceTooltip = L.tooltip({
              permanent: true,
              direction: 'top',
              offset: [0, -6],
              className: 'distance-label',
            });
          }

          distanceTooltip
            .setLatLng(mid)
            .setContent(label)
            .addTo(map);  
        }



        let tweenHandle = null;
        function tweenMarkerTo(lat, lng, durationMs = 300) {
          if (!userMarker) return upsertUserMarker(lat, lng);
          if (tweenHandle) cancelAnimationFrame(tweenHandle);

          const start = userMarker.getLatLng();
          const end = L.latLng(lat, lng);
          const t0 = performance.now();

          const step = (t) => {
            const p = Math.min(1, (t - t0) / durationMs);
            const latI = start.lat + (end.lat - start.lat) * p;
            const lngI = start.lng + (end.lng - start.lng) * p;
            userMarker.setLatLng([latI, lngI]);
            if (p < 1) tweenHandle = requestAnimationFrame(step);
          };
          tweenHandle = requestAnimationFrame(step);
        }

        function upsertUserMarker(lat, lng){
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          if (!userMarker){
            userMarker = L.marker([lat,lng], { icon: userIcon, zIndexOffset: 1000 })
              .addTo(map)
              .bindTooltip({ permanent:true, direction:"top" });
          } else {
            userMarker.setLatLng([lat,lng]);
          }
          userMarkerPlaced = true; 
        }

        function clearRoutePolylines() {
          routePolylines.forEach(p => map.removeLayer(p));
          routeHitPolylines.forEach(p => map.removeLayer(p));
          routePolylines = [];
          routeHitPolylines = [];
          if (distanceTooltip) {
            map.removeLayer(distanceTooltip);
            distanceTooltip = null;
          }
        }


        function drawRouteVariants(routes) {
        clearRoutePolylines();
        routeVariantsMeta = [];
        activeRouteIndex = null;

        if (!Array.isArray(routes) || !routes.length) return;

        routes.forEach((r, idx) => {
          if (!Array.isArray(r.coords) || !r.coords.length) return;

          const latlngs = r.coords.map(function (pair) {
            return [pair[0], pair[1]];
          });

          const isMain = idx === 0;
          const poly = L.polyline(latlngs, {
            color: isMain ? "#007bff" : "#808080",
            weight: isMain ? 6 : 4,
            opacity: isMain ? 0.9 : 0.6,
          }).addTo(map);

          routePolylines.push(poly);

          // 🔹 Fallbacks if RN didn't provide texts
          const distM = r && r.summary && typeof r.summary.distance === "number"
            ? r.summary.distance
            : 0;
          const durS = r && r.summary && typeof r.summary.duration === "number"
            ? r.summary.duration
            : 0;

          const distanceKm   = distM / 1000;
          const fallbackDist = distanceKm.toFixed(2) + " km";

          const mins = Math.round(durS / 60);
          const fallbackDur =
            mins >= 60
              ? Math.floor(mins / 60) + "h " + (mins % 60) + " min"
              : mins + " min";

          const distanceText = r.distanceText || fallbackDist;
          const durationText = r.durationText || fallbackDur;
          const fareText     = r.fareText || ""; // optional


          const midIndex  = Math.floor(latlngs.length / 2);
          const midLatLng = latlngs[midIndex];

          routeVariantsMeta[idx] = {
            midLatLng,
            distanceText,
            durationText,
            fareText,
          };

          const hit = L.polyline(latlngs, {
            color: "#000000",
            weight: 60,
            opacity: 0,
            interactive: true,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);

          hit.on("click", function (e) {
            L.DomEvent.stop(e);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "routeChosen", index: idx })
              );
            }
          });

          routeHitPolylines.push(hit);
        });

        selectedRouteIdx = 0;
        highlightRouteIndex(0);
      }


        function highlightRouteIndex(idx) {
          selectedRouteIdx = idx;
          routePolylines.forEach(function(poly, i) {
            const isMain = i === idx;
            poly.setStyle({
              color: isMain ? "#007bff" : "#808080",
              weight: isMain ? 6 : 4,
              opacity: isMain ? 0.9 : 0.6,
            });
          });
          updateRouteLabelForIndex(idx);
        }


        function bboxContains(b, lat, lng) {
          return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
        }

        const poiMarkers = new Map();        // id -> L.Marker
        const iconCache  = {};               // category -> L.Icon
        let poiBatchHandle = null;           // cancel previous batch

        function getPoiIcon(cat, poiIcons) {
          if (iconCache[cat]) return iconCache[cat];

          const url = (poiIcons[cat] && poiIcons[cat].includes('base64,'))
            ? poiIcons[cat]
            : 'https://cdn-icons-png.flaticon.com/512/854/854878.png'; // fallback

          iconCache[cat] = L.icon({
            iconUrl: url,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          });
          return iconCache[cat];
        }

        function addOrUpdatePOIMarker(it, poiIcons) {
          const existing = poiMarkers.get(it.id);
          if (existing) {
            // update position if it changed
            const curr = existing.getLatLng();
            if (curr.lat !== it.lat || curr.lng !== it.lng) {
              existing.setLatLng([it.lat, it.lng]);
            }
            return;
          }
          const icon = getPoiIcon(it.category, poiIcons); // your cached icon getter
          const marker = L.marker([it.lat, it.lng], { icon });

          // build popup with "Set Destination"
          const container = document.createElement('div');
          const title = document.createElement('b');
          title.textContent = it.name || it.category || 'POI';
          container.appendChild(title);
          container.appendChild(document.createElement('br'));
          const btn = document.createElement('button');
          btn.textContent = 'Set Destination';
          btn.style.marginTop = '6px';
          btn.onclick = function () {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'setDestinationFromPOI',
              lat: it.lat, lng: it.lng, label: it.name || it.category || 'POI'
            }));
          };
          container.appendChild(btn);
          marker.bindPopup(container);

          marker.addTo(poiLayer);
          poiMarkers.set(it.id, marker);
        }
        
        function bboxContains(b, lat, lng) {
          return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
        }

        // --- Icons ---
        const userIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
          iconSize: [30, 30],
          iconAnchor: [15, 30], // bottom center
        });

        const pickupIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
          iconSize: [30,30],
          iconAnchor: [15,30],
        });


        const destIcon = L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const carIcon = L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        function setDestination(lat, lng){
          if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
          destMarker = L.marker([lat,lng], { icon: destIcon })
            .addTo(map)
            .bindTooltip("Destination", { permanent:true, direction:"top" });
        }

        function setPickup(lat, lng){
          if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
          pickupMarker = L.marker([lat,lng], { icon: pickupIcon })
            .addTo(map)
            .bindTooltip({ permanent:true, direction:"top" });
        }


        function setDriver(lat, lng){
          if (driverMarker) { map.removeLayer(driverMarker); driverMarker = null; }
          if (Number.isFinite(lat) && Number.isFinite(lng)){
            driverMarker = L.marker([lat,lng], { icon: carIcon })
              .addTo(map)
              .bindTooltip("🚕 Driver", { permanent:true, direction:"top" })
              .setZIndexOffset(1100);
          }
        }

        function clearRoute(){
          if (routeLine){ map.removeLayer(routeLine); routeLine = null; }
          if (distanceTooltip){ map.removeLayer(distanceTooltip); distanceTooltip = null; }
        }

        // --- Pick destination by tapping map (when not locked by active driver) ---
        map.on('click', function(e){
          if (destinationLocked) return;
          const { lat, lng } = e.latlng;
          setDestination(lat, lng);
          window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
        });

        (function sendInitialBBox(){
          const b = map.getBounds();
          const c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bbox',
            bbox: {
              minLng: b.getWest(), minLat: b.getSouth(),
              maxLng: b.getEast(), maxLat: b.getNorth()
            },
            zoom: map.getZoom(),
            center: { lat: c.lat, lng: c.lng }
          }));
        })();

        map.on('moveend', function () {
          const b = map.getBounds();
          const c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'bbox',
            bbox: {
              minLng: b.getWest(), minLat: b.getSouth(),
              maxLng: b.getEast(), maxLat: b.getNorth()
            },
            zoom: map.getZoom(),
            center: { lat: c.lat, lng: c.lng }
          }));
        });


        // --- Message bridge ---
        document.addEventListener('message', function(event){
          let msg = {};
          try { msg = JSON.parse(event.data || '{}'); } catch(e){ return; }

          if (msg.type === 'ensureUserMarker') {
            const lat = Number(msg.latitude);
            const lng = Number(msg.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              upsertUserMarker(lat, lng);
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'userMarkerEnsured',
              placed: !!userMarker,
            }));
            return;
          }

          // Live passenger location (blue marker only)
          if (msg.type === 'updateUserLoc'){
            const lat = Number(msg.latitude), lng = Number(msg.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) tweenMarkerTo(lat, lng, 300);
            return;
          }

          if (msg.type === 'setPickup') {
            const lat = Number(msg.latitude), lng = Number(msg.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) setPickup(lat, lng);
            return;
          }
          if (msg.type === 'clearPickup') {
            if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
            return;
          }


          // Keep route line's head glued to the moving CL marker
          if (msg.type === 'nudgeRouteStart') {
            const lat = Number(msg.latitude), lng = Number(msg.longitude);

            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'dbg',
              tag: 'nudgeRouteStart',
              note: 'received nudge'
            }));

            if (!routeLine || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

            let pts = routeLine.getLatLngs();
            if (!Array.isArray(pts) || !pts.length) return;
            if (Array.isArray(pts[0]) && pts[0].length) { pts = pts[0]; }

            pts[0] = L.latLng(lat, lng);
            routeLine.setLatLngs(pts);

            if (pts.length > 1) {
              const p1 = pts[0], p2 = pts[1];
              const mid = L.latLng(
                p1.lat + (p2.lat - p1.lat) * 0.15,
                p1.lng + (p2.lng - p1.lng) * 0.15
              );
              routeLine.setLatLngs([p1, mid, ...pts.slice(1)]);
            }

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'nudgeAck', ok: true }));
            return;
          }


            
          // Heading intentionally ignored (no cone)
          if (msg.type === 'updateHeading'){ return; }

          // Draw route with label (distance • duration • fare)
          if (msg.type === 'drawRoute' && Array.isArray(msg.route) && msg.route.length) {
            clearRoute();
            routeLine = L.polyline(msg.route, { weight:4, color:'#1a73e8' }).addTo(map);

            if (msg.reframe) {
              map.fitBounds(routeLine.getBounds(), { padding:[50,50] });
            }

            const mid = msg.route[Math.floor(msg.route.length/2)];
            const label = [msg.distanceText, msg.durationText, msg.fareText]
              .filter(Boolean).join(' • ');
            distanceTooltip = L.tooltip({
              permanent:true, direction:'top', offset:[0,-6], className:'distance-label'
            }).setContent(label || '').setLatLng(mid).addTo(map);
            return;
          }


          // Clear route
          if (msg.type === 'clearRoute'){
            // existing single main route cleanup
            clearRoute();

            // 🔧 also clear any multi-variant polylines if present
            if (typeof clearRoutePolylines === 'function') {
              clearRoutePolylines();
            }
            return;
          }

          if (msg.type === "setRoutes") {
            if (Array.isArray(msg.routes) && typeof drawRouteVariants === "function") {
              drawRouteVariants(msg.routes);
            }
            return;
          }

          if (msg.type === "clearRoutes") {
            if (typeof clearRoutePolylines === "function") {
              clearRoutePolylines();
            }
            return;
          }

          if (msg.type === "selectRouteIndex") {
            if (typeof msg.index === "number" && typeof highlightRouteIndex === "function") {
              highlightRouteIndex(msg.index);
            }
            return;
          }

          // Driver + Destination markers
          if (msg.type === 'setMarkers'){
            destinationLocked = !!msg.driver;

            // destination
            if (msg.destination && Number.isFinite(msg.destination.latitude) && Number.isFinite(msg.destination.longitude)){
              setDestination(msg.destination.latitude, msg.destination.longitude);
            } else if (destMarker){
              map.removeLayer(destMarker); destMarker = null;
            }

            if (msg.pickup && Number.isFinite(msg.pickup.latitude) && Number.isFinite(msg.pickup.longitude)){
              setPickup(msg.pickup.latitude, msg.pickup.longitude);
            } else if (pickupMarker){
              map.removeLayer(pickupMarker); pickupMarker = null;
            }

            // driver
            if (msg.driver && Number.isFinite(msg.driver.latitude) && Number.isFinite(msg.driver.longitude)){
              setDriver(msg.driver.latitude, msg.driver.longitude);
            } else if (driverMarker){
              map.removeLayer(driverMarker); driverMarker = null;
            }

            return;
          }

          if (msg.type === 'requestBbox') {
            const b = map.getBounds();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'bbox',
              bbox: {
                minLng: b.getWest(),
                minLat: b.getSouth(),
                maxLng: b.getEast(),
                maxLat: b.getNorth()
              },
              zoom: map.getZoom()
            }));
            return;
          }

          if (msg.type === 'setPOIs' && Array.isArray(msg.items)) {
            if (poiBatchHandle) {
              cancelAnimationFrame(poiBatchHandle);
              poiBatchHandle = null;
            }

            const z = Number(msg.zoom) || currentZoomLevel;
            const b = msg.bbox || null;

            // Collect desired items from payload
            const desired = new Map();
            for (const it of msg.items) {
              if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
              desired.set(it.id, it);
            }
            const desiredIds = new Set(desired.keys());

            // Decide strategy based on zoom direction
            if (z > currentZoomLevel) {
              // ---- ZOOM IN: accumulate (add new), but prune anything far outside screen
              if (b) {
                for (const [id, marker] of poiMarkers) {
                  const p = marker.getLatLng();
                  if (!bboxContains(b, p.lat, p.lng)) {
                    poiLayer.removeLayer(marker);
                    poiMarkers.delete(id);
                  }
                }
              }
            } else if (z < currentZoomLevel) {
              // ---- ZOOM OUT: shrink to what backend sent
              for (const [id, marker] of poiMarkers) {
                const keep = desiredIds.has(id);
                const p = marker.getLatLng();
                const onScreen = !b || bboxContains(b, p.lat, p.lng);
                if (!keep || !onScreen) {
                  poiLayer.removeLayer(marker);
                  poiMarkers.delete(id);
                }
              }
            } else {
              // ---- SAME ZOOM (pan): replace by diff within current screen
              for (const [id, marker] of poiMarkers) {
                const p = marker.getLatLng();
                const drop = !desiredIds.has(id) || (b && !bboxContains(b, p.lat, p.lng));
                if (drop) {
                  poiLayer.removeLayer(marker);
                  poiMarkers.delete(id);
                }
              }
            }

            // Build list of new ones to add
            const toAdd = [];
            for (const [id, it] of desired) {
              if (!poiMarkers.has(id)) toAdd.push(it);
            }

            // ✅ UPDATED PART: adaptive batching for smoother render
            const total = toAdd.length;
            const BATCH =
              total > 300 ? 80 :
              total > 150 ? 50 :
              total > 60  ? 35 :
              25; // small = faster draw
            const DELAY = total > 150 ? 20 : 10;

            const poiIcons = ${iconDataJson};

            let i = 0;
            const addBatch = () => {
              const end = Math.min(i + BATCH, total);
              for (; i < end; i++) {
                const it = toAdd[i];
                const icon = getPoiIcon(it.category, poiIcons);
                const marker = L.marker([it.lat, it.lng], { icon, opacity: 0 }); // start transparent

                const container = document.createElement('div');
                const title = document.createElement('b');
                title.textContent = it.name || it.category || 'POI';
                container.appendChild(title);
                container.appendChild(document.createElement('br'));

                const btn = document.createElement('button');
                btn.textContent = 'Set Destination';
                btn.style.marginTop = '6px';
                btn.onclick = function () {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'setDestinationFromPOI',
                    lat: it.lat, lng: it.lng, label: it.name || it.category || 'POI'
                  }));
                };
                container.appendChild(btn);

                marker.bindPopup(container);
                marker.addTo(poiLayer);
                poiMarkers.set(it.id, marker);

                // 🔥 Fade-in animation
                let op = 0;
                const fade = () => {
                  op += 0.15;
                  if (op <= 1) {
                    marker.setOpacity(op);
                    requestAnimationFrame(fade);
                  } else {
                    marker.setOpacity(1);
                  }
                };
                requestAnimationFrame(fade);
              }

              if (i < total) {
                poiBatchHandle = requestAnimationFrame(() => setTimeout(addBatch, DELAY));
              } else {
                poiBatchHandle = null;
              }
            };


            addBatch();

            currentZoomLevel = z;
            return;
          }





          // Render Landmarks (pin markers)
          if (msg.type === 'setLandmarks' && Array.isArray(msg.items)) {
            landmarkLayer.clearLayers();
            msg.items.forEach(it => {
              if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) return;
              L.marker([it.lat, it.lng])
                .bindTooltip(it.name || 'Landmark', { direction: 'top' })
                .addTo(landmarkLayer);
            });
            return;
          }
          if (msg.type === 'clearLandmarks') {
            landmarkLayer.clearLayers();
            return;
          }

          // Render TODA tags (no zones, just labels)
          if (msg.type === 'setTodas' && Array.isArray(msg.items)) {
            todaLayer.clearLayers();

            msg.items.forEach(function (it) {
              if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) return;

              const marker = L.marker([it.lat, it.lng]).addTo(todaLayer);

              // Normalize destinations (array of strings)
              const dests = Array.isArray(it.destinations) ? it.destinations : [];
              const lines = dests
                .map(function (d) {
                  if (!d) return "";
                  if (typeof d === "string") return d;
                  if (typeof d === "object" && d.name) return d.name;
                  return "";
                })
                .filter(Boolean);

              const hasDest = lines.length > 0;
              const html =
                '<div>' +
                  '<strong>' + (it.name || 'TODA Terminal') + '</strong><br/>' +
                  '<span>Serves:</span><br/>' +
                  (hasDest
                    ? '<ul style="padding-left:16px;margin:4px 0;">' +
                        lines.map(function (txt) {
                          return '<li>' + txt + '</li>';
                        }).join('') +
                      '</ul>'
                    : '<em>No destinations configured</em>'
                  ) +
                '</div>';

              marker.bindPopup(html);
            });

            return;
          }


          if (msg.type === 'clearTodas') {
            todaLayer.clearLayers();
            return;
          }
        });
      </script>
    </body>
  </html>
  `;
}