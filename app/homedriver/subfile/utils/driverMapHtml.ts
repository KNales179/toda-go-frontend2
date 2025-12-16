// homedriver/subfile/driverMapHtml.ts

export function buildDriverMapHtml(initialLat: number, initialLng: number) {
  return String.raw`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
          <style> html, body, #map { height: 100%; margin: 0, padding: 0; } </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
          <script>
            let pickupMarker = null;
            let destinationMarker = null;
            let driverMarker = null;
            let routeLine = null;
            let midTooltipMarker = null;
            let waitingLayer = null;
            let driverTweenHandle = null;
            let tweenHandle = null;
            let todaLayer = null; 


            let __dbgDiv = null;
            function __ensureDbg(){
              if (__dbgDiv) return __dbgDiv;
              __dbgDiv = document.createElement('div');
              __dbgDiv.style.cssText = 'position:absolute;right:6px;top:6px;background:rgba(0,0,0,.7);color:#0f0;font:12px monospace;padding:6px 8px;border-radius:6px;max-width:50vw;max-height:35vh;overflow:auto;z-index:99999;white-space:pre-wrap';
              __dbgDiv.innerText = 'map: ready';
              document.body.appendChild(__dbgDiv);
              return __dbgDiv;
            }
            function __dbg(msg){
              const d = __ensureDbg();
              const now = new Date();
              const hh = now.getHours().toString().padStart(2,'0');
              const mm = now.getMinutes().toString().padStart(2,'0');
              const ss = now.getSeconds().toString().padStart(2,'0');
              d.innerText = '[' + hh + ':' + mm + ':' + ss + '] ' + msg + '\\n' + d.innerText.slice(0, 2000);
            }

            window.onerror = function(msg, src, line, col, err) {
              __dbg('ERR ' + msg + ' @' + line + ':' + col);
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({ error: String(msg) }));
              } catch {}
            };

            function tweenDriverTo(lat, lng, durationMs = 300) {
              if (!driverMarker) {
                // place first if needed (no reframe)
                setDriver(lat, lng);
                return;
              }
              if (driverTweenHandle) cancelAnimationFrame(driverTweenHandle);

              const start = driverMarker.getLatLng();
              const end = L.latLng(lat, lng);
              const t0 = performance.now();

              const step = (t) => {
                const p = Math.min(1, (t - t0) / durationMs);
                const latI = start.lat + (end.lat - start.lat) * p;
                const lngI = start.lng + (end.lng - start.lng) * p;
                driverMarker.setLatLng([latI, lngI]);
                if (p < 1) driverTweenHandle = requestAnimationFrame(step);
              };
              driverTweenHandle = requestAnimationFrame(step);
            }

            function tweenDriverTo(lat, lng, durationMs = 300) { 
              if (!driverMarker) { 
                driverMarker = L.marker([lat, lng]).addTo(map); 
                return; 
              } 
              if (tweenHandle) cancelAnimationFrame(tweenHandle); 
              const start = driverMarker.getLatLng(); 
              const end = L.latLng(lat, lng); 
              const t0 = performance.now(); 
              const step = (t) => { 
                const p = Math.min(1, (t - t0) / durationMs); 
                const latI = start.lat + (end.lat - start.lat) * p; 
                const lngI = start.lng + (end.lng - start.lng) * p; 
                driverMarker.setLatLng([latI, lngI]); 
                if (p < 1) tweenHandle = requestAnimationFrame(step); 
              }; 
              tweenHandle = requestAnimationFrame(step); 
            }


            function formatDuration(sec){
              if (sec < 60) return Math.round(sec) + "s";
              const m = Math.round(sec / 60);
              if (m >= 60) return Math.floor(m/60) + "h " + (m%60) + "m";
              return m + "m";
            }

            const map = L.map('map', {
              zoomControl: true,
              maxBounds: [[13.96, 121.643], [13.88,121.588]],
              maxBoundsViscosity: 0.5,
              minZoom: 13,
              maxZoom: 18,
              noWrap: true 
            }).setView([${initialLat}, ${initialLng}], 15)
              .fitBounds([[13.96, 121.643], [13.88,121.588]]);

            L.tileLayer('https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=7yQg8w68otDEssrPk9wU', {
              maxZoom: 19,
              attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors | © <a href="https://www.maptiler.com/">MapTiler</a>'
            }).addTo(map);

            driverMarker = L.marker([${initialLat}, ${initialLng}]).addTo(map);

            document.addEventListener('message', function(event) {
              const msg = JSON.parse(event.data);

              if (msg.type === 'debug') { __dbg(String(msg.text || '')); return; }

              if (msg.type === 'setPassengerMarkers') {
                if (pickupMarker) { map.removeLayer(pickupMarker); pickupMarker = null; }
                if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }

                if (msg.pickup) {
                  pickupMarker = L.marker([msg.pickup.latitude, msg.pickup.longitude], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png',
                      iconSize: [30, 30],
                    })
                  }).addTo(map);
                }

                if (msg.destination) {
                  destinationMarker = L.marker([msg.destination.latitude, msg.destination.longitude], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
                      iconSize: [30, 30],
                    })
                  }).addTo(map).bindTooltip("🎯 Destination", { permanent: true, direction: "top" });
                }
              }

              if (msg.type === 'updateDriver') {
                const lat = Number(msg.latitude), lng = Number(msg.longitude);

                // reject obviously-bad points
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                // optional: ignore tiny jitters
                if (driverMarker) {
                  const curr = driverMarker.getLatLng();
                  const dLat = Math.abs(curr.lat - lat);
                  const dLng = Math.abs(curr.lng - lng);
                  if (dLat < 1e-5 && dLng < 1e-5) return; // ~1m-ish
                }

                tweenDriverTo(lat, lng, 320);
                return;
              }



              if (msg.type === 'drawRoute') {
                if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
                if (midTooltipMarker) { map.removeLayer(midTooltipMarker); midTooltipMarker = null; }

                routeLine = L.polyline(msg.coords, { weight: 5 }).addTo(map);
                map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

                const idx = Math.floor(msg.coords.length / 2);
                const mid = msg.coords[idx] || msg.coords[0];
                const km = (msg.summary.distance / 1000).toFixed(2);
                const eta = formatDuration(msg.summary.duration);

                midTooltipMarker = L.marker(mid, { opacity: 0 })
                  .addTo(map)
                  .bindTooltip(km + " km • " + eta, { permanent: true, direction: "top" })
                  .openTooltip();
              }

              if (msg.type === 'clearRoute') {
                if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
                if (midTooltipMarker) { map.removeLayer(midTooltipMarker); midTooltipMarker = null; }
              }

              if (msg.type === 'setWaitingMarkers') {
                if (waitingLayer) { waitingLayer.clearLayers(); map.removeLayer(waitingLayer); }
                waitingLayer = L.layerGroup().addTo(map);

                var items = Array.isArray(msg.items) ? msg.items : [];
                items.forEach(function(it) {
                  var marker = L.marker([it.lat, it.lng], {
                    icon: L.icon({
                      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png',
                      iconSize: [30, 30],
                    })
                  })
                  .addTo(waitingLayer)
                  .bindTooltip('🧍 Passenger #' + it.id, { direction: 'top' });
                  marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'waitingMarkerTapped',
                      bookingId: it.id,
                    }));
                  });
                });
              }

              if (msg.type === 'setTodaZones') {
                if (todaLayer) {
                  todaLayer.clearLayers();
                  map.removeLayer(todaLayer);
                }
                todaLayer = L.layerGroup().addTo(map);

                var zones = Array.isArray(msg.items) ? msg.items : [];
                zones.forEach(function(z) {
                  var circle = L.circle([z.lat, z.lng], {
                    radius: z.radius || 100,
                    stroke: false,     
                    fillColor: '#3388ff',
                    fillOpacity: 0.15,
                  }).addTo(todaLayer);

                  if (z.name) {
                    circle.bindTooltip(z.name, {
                      direction: 'top',
                      permanent: false,
                    });
                  }
                });
              }

            });
          </script>
        </body>
      </html>
    `;
}
