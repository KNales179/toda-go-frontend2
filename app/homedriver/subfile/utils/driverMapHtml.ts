// homedriver/subfile/driverMapHtml.ts

export function buildDriverMapHtml(initialLat: number, initialLng: number) {
  return String.raw`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />

        <style>
          html, body, #map {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #f8fafc;
            touch-action: none;
          }

          .route-label.leaflet-tooltip {
            background: rgba(0,0,0,.85);
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 5px 9px;
            box-shadow: 0 1px 4px rgba(0,0,0,.3);
            font-size: 12px;
            line-height: 1;
            white-space: nowrap;
          }

          .route-label.leaflet-tooltip:before {
            display: none;
          }

          .driver-route-main {
            filter: drop-shadow(0 0 4px rgba(26, 115, 232, 0.35));
          }

          .route-arrow-wrap {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .route-arrow {
            width: 18px;
            height: 18px;
            color: #ffffff;
            text-shadow:
              0 1px 3px rgba(0,0,0,0.55),
              0 0 4px rgba(26,115,232,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 900;
            animation: routeArrowPulse 1100ms ease-in-out infinite;
          }

          @keyframes routeArrowPulse {
            0% {
              transform: scale(0.82);
              opacity: 0.55;
            }
            50% {
              transform: scale(1.12);
              opacity: 1;
            }
            100% {
              transform: scale(0.82);
              opacity: 0.55;
            }
          }

          .task-pin {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font: 13px/1 sans-serif;
            font-weight: 900;
            color: #fff;
            border: 2px solid rgba(255,255,255,.95);
            box-shadow: 0 6px 16px rgba(0,0,0,.28);
            user-select: none;
            transform: translateZ(0);
            will-change: transform;
          }

          .task-pickup {
            background: #f59e0b;
          }

          .task-dropoff {
            background: #10b981;
          }

          .task-active {
            outline: 3px solid #111827;
            outline-offset: 1px;
          }

          .task-tooltip.leaflet-tooltip {
            background: rgba(15,23,42,.92);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 4px 7px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,.25);
          }

          .task-tooltip.leaflet-tooltip:before {
            display: none;
          }

          .pwapp-pin {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font: 16px/1 sans-serif;
            background: #111827;
            color: #fff;
            border: 2px solid rgba(255,255,255,.95);
            box-shadow: 0 6px 16px rgba(0,0,0,.28);
            user-select: none;
            transform: translateZ(0);
          }

          .pwapp-tooltip.leaflet-tooltip,
          .waiting-tooltip.leaflet-tooltip,
          .toda-tooltip.leaflet-tooltip {
            background: rgba(255,255,255,.96);
            color: #111827;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 3px 7px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,.18);
          }

          .pwapp-tooltip.leaflet-tooltip:before,
          .waiting-tooltip.leaflet-tooltip:before,
          .toda-tooltip.leaflet-tooltip:before {
            display: none;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>

        <script>
          if (!window.L) {
            document.body.innerHTML =
              '<div style="padding:16px;font-family:sans-serif;color:#111827;">Map is loading. Please check internet connection.</div>';
          }

          // ======================================================
          // MAP INIT
          // ======================================================

          const map = L.map("map", {
            zoomControl: true,
            preferCanvas: true,

            maxBounds: [[13.85, 121.55], [14.0, 121.69]],
            maxBoundsViscosity: 0.05,

            minZoom: 12,
            maxZoom: 19,
            noWrap: true,

            tapTolerance: 20,

            zoomAnimation: true,
            fadeAnimation: false,
            markerZoomAnimation: false,

            inertia: true,
            inertiaDeceleration: 2500,
            inertiaMaxSpeed: 1200,

            wheelDebounceTime: 80,
          }).setView([${initialLat}, ${initialLng}], 15);

          L.tileLayer(
            "https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.png?key=7yQg8w68otDEssrPk9wU",
            {
              maxZoom: 19,
              keepBuffer: 6,
              updateWhenIdle: true,
              updateWhenZooming: false,
              updateInterval: 250,
              attribution:
                '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }
          ).addTo(map);

          // Panes keep important markers above routes and reduce flicker ordering.
          map.createPane("routePane");
          map.getPane("routePane").style.zIndex = 420;

          map.createPane("waitingPane");
          map.getPane("waitingPane").style.zIndex = 520;

          map.createPane("taskPane");
          map.getPane("taskPane").style.zIndex = 620;

          map.createPane("driverPane");
          map.getPane("driverPane").style.zIndex = 720;

          map.createPane("tooltipPaneCustom");
          map.getPane("tooltipPaneCustom").style.zIndex = 820;

          // ======================================================
          // STATE
          // ======================================================

          let pickupMarker = null;
          let destinationMarker = null;
          let driverMarker = null;

          let routeLine = null;
          let routeArrowLayer = L.layerGroup().addTo(map);
          let routeTooltip = null;

          let fullRouteLatLngs = [];
          let fullRouteSummary = null;
          let trimRouteTimer = null;
          let lastDriverTrimLoc = null;

          let waitingLayer = L.layerGroup().addTo(map);
          let todaLayer = L.layerGroup().addTo(map);
          let pwappLayer = L.layerGroup().addTo(map);
          let taskLayer = L.layerGroup().addTo(map);

          let waitingMarkers = new Map();
          let taskMarkers = new Map();
          let pwappMarkers = new Map();

          let tweenHandle = null;

          let isMapInteracting = false;
          let pendingMessages = [];

          // ======================================================
          // HELPERS
          // ======================================================

          function safePost(obj) {
            try {
              window.ReactNativeWebView?.postMessage(JSON.stringify(obj));
            } catch {}
          }

          function formatDuration(sec) {
            sec = Number(sec || 0);
            if (sec < 60) return Math.round(sec) + "s";

            const m = Math.round(sec / 60);
            if (m >= 60) return Math.floor(m / 60) + "h " + (m % 60) + "m";

            return m + "m";
          }

          function bookingTypeToIconUrl(t) {
            const type = String(t || "CLASSIC").toUpperCase();

            if (type === "GROUP") {
              return "https://maps.gstatic.com/mapfiles/ms2/micons/orange-dot.png";
            }

            if (type === "SOLO" || type === "SPECIAL") {
              return "https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png";
            }

            return "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png";
          }

          const iconCache = {};

          function iconForBookingType(t) {
            const type = String(t || "CLASSIC").toUpperCase();

            if (iconCache[type]) return iconCache[type];

            iconCache[type] = L.icon({
              iconUrl: bookingTypeToIconUrl(type),
              iconSize: [30, 30],
              iconAnchor: [15, 30],
            });

            return iconCache[type];
          }

          function makeTaskIcon(orderNum, taskType, isActive) {
            const t = String(taskType || "").toUpperCase();
            const clsType = t === "PICKUP" ? "task-pickup" : "task-dropoff";
            const clsActive = isActive ? "task-active" : "";
            const html =
              '<div class="task-pin ' +
              clsType +
              " " +
              clsActive +
              '">' +
              String(orderNum) +
              "</div>";

            return L.divIcon({
              className: "",
              html,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
          }

          function makePwAppIcon() {
            return L.divIcon({
              className: "",
              html: '<div class="pwapp-pin">🚶</div>',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
          }

          function setOrReplaceMarker(oldMarker, lat, lng, options) {
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              if (oldMarker) map.removeLayer(oldMarker);
              return null;
            }

            if (!oldMarker) {
              return L.marker([lat, lng], options).addTo(map);
            }

            oldMarker.setLatLng([lat, lng]);

            if (options && options.icon) {
              oldMarker.setIcon(options.icon);
            }

            return oldMarker;
          }

          // ======================================================
          // INTERACTION SAFETY
          // Do not rebuild many markers while zooming/dragging.
          // ======================================================

          function queueOrRun(msg) {
            const heavy =
              msg.type === "setWaitingMarkers" ||
              msg.type === "setTaskPlan" ||
              msg.type === "setPwAppMarkers" ||
              msg.type === "setTodaZones";

            if (isMapInteracting && heavy) {
              pendingMessages = pendingMessages.filter((m) => m.type !== msg.type);
              pendingMessages.push(msg);
              return true;
            }

            return false;
          }

          function flushPendingMessages() {
            if (!pendingMessages.length) return;

            const queued = pendingMessages.slice();
            pendingMessages = [];

            queued.forEach((msg) => handleMessageObject(msg));
          }

          map.on("dragstart zoomstart", function () {
            isMapInteracting = true;
          });

          map.on("dragend zoomend moveend", function () {
            isMapInteracting = false;

            setTimeout(flushPendingMessages, 120);

            // ✅ Rebuild arrows based on current zoom level.
            // This prevents too many arrows when zoomed out.
            if (routeLine && Array.isArray(fullRouteLatLngs) && fullRouteLatLngs.length >= 2) {
              const currentRoute = routeLine.getLatLngs().map(function (p) {
                return [p.lat, p.lng];
              });

              addRouteArrows(currentRoute);
            }
          });

          // ======================================================
          // DRIVER MARKER
          // ======================================================

          function tweenDriverTo(lat, lng, durationMs = 260) {
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            if (!driverMarker) {
              driverMarker = L.marker([lat, lng], {
                pane: "driverPane",
                zIndexOffset: 1500,
              }).addTo(map);
              return;
            }

            if (tweenHandle) {
              cancelAnimationFrame(tweenHandle);
              tweenHandle = null;
            }

            const start = driverMarker.getLatLng();
            const end = L.latLng(lat, lng);
            const t0 = performance.now();

            const step = (t) => {
              const p = Math.min(1, (t - t0) / durationMs);
              const latI = start.lat + (end.lat - start.lat) * p;
              const lngI = start.lng + (end.lng - start.lng) * p;

              driverMarker.setLatLng([latI, lngI]);

              if (p < 1) {
                tweenHandle = requestAnimationFrame(step);
              } else {
                tweenHandle = null;
              }
            };

            tweenHandle = requestAnimationFrame(step);
          }

          driverMarker = L.marker([${initialLat}, ${initialLng}], {
            pane: "driverPane",
            zIndexOffset: 1500,
          }).addTo(map);

          // ======================================================
          // ROUTE
          // ======================================================

          function distanceMeters(a, b) {
            const R = 6371000;

            const lat1 = Number(a[0]) * Math.PI / 180;
            const lat2 = Number(b[0]) * Math.PI / 180;
            const dLat = (Number(b[0]) - Number(a[0])) * Math.PI / 180;
            const dLng = (Number(b[1]) - Number(a[1])) * Math.PI / 180;

            const s =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

            return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
          }

          function nearestRouteIndex(latlngs, lat, lng) {
            if (!Array.isArray(latlngs) || latlngs.length < 2) return 0;

            const current = [Number(lat), Number(lng)];
            let bestIndex = 0;
            let bestDistance = Infinity;

            // ✅ Always compare against the original full route,
            // not the already-trimmed displayed route.
            for (let i = 0; i < latlngs.length; i++) {
              const d = distanceMeters(current, latlngs[i]);

              if (d < bestDistance) {
                bestDistance = d;
                bestIndex = i;
              }
            }

            return bestIndex;
          }

          function trimLatLngsFromDriverPosition(lat, lng) {
            if (!Array.isArray(fullRouteLatLngs) || fullRouteLatLngs.length < 2) {
              return [];
            }

            const idx = nearestRouteIndex(fullRouteLatLngs, lat, lng);

            // ✅ Start line from live driver position, then continue to the remaining route.
            const remaining = [[Number(lat), Number(lng)]].concat(
              fullRouteLatLngs.slice(idx + 1)
            );

            return remaining.length >= 2 ? remaining : fullRouteLatLngs.slice(-2);
          }

          function clearRouteVisualOnly() {
            if (routeLine) {
              map.removeLayer(routeLine);
              routeLine = null;
            }

            if (routeArrowLayer) {
              routeArrowLayer.clearLayers();
            }

            if (routeTooltip) {
              map.removeLayer(routeTooltip);
              routeTooltip = null;
            }
          }

          function routeBearingDeg(a, b) {
            const lat1 = Number(a[0]) * Math.PI / 180;
            const lat2 = Number(b[0]) * Math.PI / 180;
            const dLng = (Number(b[1]) - Number(a[1])) * Math.PI / 180;

            const y = Math.sin(dLng) * Math.cos(lat2);
            const x =
              Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

            const brng = Math.atan2(y, x) * 180 / Math.PI;
            return (brng + 360) % 360;
          }

          function interpolateLatLng(a, b, t) {
            return [
              Number(a[0]) + (Number(b[0]) - Number(a[0])) * t,
              Number(a[1]) + (Number(b[1]) - Number(a[1])) * t,
            ];
          }

          function routeBearingDeg(a, b) {
            const lat1 = Number(a[0]) * Math.PI / 180;
            const lat2 = Number(b[0]) * Math.PI / 180;
            const dLng = (Number(b[1]) - Number(a[1])) * Math.PI / 180;

            const y = Math.sin(dLng) * Math.cos(lat2);
            const x =
              Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

            const brng = Math.atan2(y, x) * 180 / Math.PI;
            return (brng + 360) % 360;
          }

          function getArrowSpacingByZoom() {
            const zoom = map.getZoom();

            if (zoom <= 13) return 700;
            if (zoom === 14) return 550;
            if (zoom === 15) return 420;
            if (zoom === 16) return 300;
            if (zoom === 17) return 220;
            return 160;
          }

          function addRouteArrows(latlngs, spacingMeters) {
            routeArrowLayer.clearLayers();

            if (!Array.isArray(latlngs) || latlngs.length < 2) return;

            spacingMeters = Number(spacingMeters || getArrowSpacingByZoom());

            let walked = 0;
            let nextArrowAt = spacingMeters;

            for (let i = 0; i < latlngs.length - 1; i++) {
              const a = latlngs[i];
              const b = latlngs[i + 1];

              const segLen = distanceMeters(a, b);
              if (!Number.isFinite(segLen) || segLen < 1) continue;

              while (walked + segLen >= nextArrowAt) {
                const t = (nextArrowAt - walked) / segLen;
                const point = interpolateLatLng(a, b, t);

                const bearing = routeBearingDeg(a, b);

                // IMPORTANT:
                // bearing 0 = north, but arrow glyph points right by default
                // so subtract 90 degrees
                const rotation = bearing - 90;

                const icon = L.divIcon({
                  className: "",
                  html:
                    '<div class="route-arrow-wrap" style="transform: rotate(' +
                    rotation +
                    'deg);">' +
                    '<div class="route-arrow">➤</div>' +
                    '</div>',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                });

                L.marker(point, {
                  pane: "routePane",
                  icon,
                  interactive: false,
                  zIndexOffset: 700,
                }).addTo(routeArrowLayer);

                nextArrowAt += spacingMeters;
              }

              walked += segLen;
            }
          }

          function drawRouteVisual(latlngs, summary, shouldFit) {
            clearRouteVisualOnly();

            if (!Array.isArray(latlngs) || latlngs.length < 2) return;

            routeLine = L.polyline(latlngs, {
              pane: "routePane",
              weight: 6,
              color: "#1a73e8",
              opacity: 0.95,
              smoothFactor: 1.2,
              interactive: false,
              lineCap: "round",
              lineJoin: "round",
              className: "driver-route-main",
            }).addTo(map);

            addRouteArrows(latlngs);

            if (shouldFit && routeLine) {
              map.fitBounds(routeLine.getBounds(), {
                paddingTopLeft: [55, 70],
                paddingBottomRight: [55, 320],
                maxZoom: 17,
              });
            }

            const idx = Math.floor(latlngs.length / 2);
            const mid = latlngs[idx] || latlngs[0];

            const km = ((Number(summary?.distance || 0)) / 1000).toFixed(2);
            const eta = formatDuration(summary?.duration || 0);

            routeTooltip = L.tooltip({
              permanent: true,
              direction: "top",
              offset: [0, -7],
              className: "route-label",
              pane: "tooltipPaneCustom",
            })
              .setLatLng(mid)
              .setContent(km + " km • " + eta)
              .addTo(map);
          }

          function trimStoredRouteFromDriverPosition(lat, lng) {
            if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
              return;
            }

            if (!Array.isArray(fullRouteLatLngs) || fullRouteLatLngs.length < 2) {
              return;
            }

            lastDriverTrimLoc = {
              latitude: Number(lat),
              longitude: Number(lng),
            };

            if (trimRouteTimer) {
              clearTimeout(trimRouteTimer);
            }

            // ✅ small delay only to avoid redrawing too hard
            trimRouteTimer = setTimeout(function () {
              if (!lastDriverTrimLoc) return;

              const trimmed = trimLatLngsFromDriverPosition(
                lastDriverTrimLoc.latitude,
                lastDriverTrimLoc.longitude
              );

              if (trimmed.length >= 2) {
                drawRouteVisual(trimmed, fullRouteSummary, false);
              }
            }, 120);
          }

          function clearRoute() {
            clearRouteVisualOnly();

            // ✅ Delete stored route when task/transaction is completed or cleared.
            fullRouteLatLngs = [];
            fullRouteSummary = null;
            lastDriverTrimLoc = null;

            if (trimRouteTimer) {
              clearTimeout(trimRouteTimer);
              trimRouteTimer = null;
            }
          }

          function drawRoute(coords, summary) {
            clearRoute();

            if (!Array.isArray(coords) || coords.length < 2) return;

            const latlngs = coords
              .map((p) => [Number(p[0]), Number(p[1])])
              .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

            if (latlngs.length < 2) return;

            // ✅ Store full route once.
            // Local trimming uses this full copy every time.
            fullRouteLatLngs = latlngs;
            fullRouteSummary = summary || null;

            drawRouteVisual(fullRouteLatLngs, fullRouteSummary, true);
          }

          // ======================================================
          // MARKER SETS
          // ======================================================

          function setPassengerMarkers(msg) {
            if (pickupMarker) {
              map.removeLayer(pickupMarker);
              pickupMarker = null;
            }

            if (destinationMarker) {
              map.removeLayer(destinationMarker);
              destinationMarker = null;
            }

            const bounds = [];

            if (
              msg.pickup &&
              Number.isFinite(Number(msg.pickup.latitude)) &&
              Number.isFinite(Number(msg.pickup.longitude))
            ) {
              pickupMarker = L.marker(
                [Number(msg.pickup.latitude), Number(msg.pickup.longitude)],
                {
                  pane: "waitingPane",
                  icon: L.icon({
                    iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png",
                    iconSize: [30, 30],
                    iconAnchor: [15, 30],
                  }),
                  zIndexOffset: 900,
                }
              )
                .addTo(map)
                .bindTooltip(msg.pickupLabel || "Passenger", {
                  permanent: true,
                  direction: "top",
                  className: "waiting-tooltip",
                  pane: "tooltipPaneCustom",
                });

              bounds.push([Number(msg.pickup.latitude), Number(msg.pickup.longitude)]);
            }

            if (
              msg.destination &&
              Number.isFinite(Number(msg.destination.latitude)) &&
              Number.isFinite(Number(msg.destination.longitude))
            ) {
              destinationMarker = L.marker(
                [Number(msg.destination.latitude), Number(msg.destination.longitude)],
                {
                  pane: "waitingPane",
                  icon: L.icon({
                    iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png",
                    iconSize: [30, 30],
                    iconAnchor: [15, 30],
                  }),
                  zIndexOffset: 850,
                }
              )
                .addTo(map)
                .bindTooltip(msg.destinationLabel || "Destination", {
                  permanent: true,
                  direction: "top",
                  className: "waiting-tooltip",
                  pane: "tooltipPaneCustom",
                });

              bounds.push([Number(msg.destination.latitude), Number(msg.destination.longitude)]);
            }

            if (msg.fit && bounds.length >= 2) {
              map.fitBounds(bounds, {
                paddingTopLeft: [70, 80],
                paddingBottomRight: [70, 380],
                maxZoom: 16,
              });
            }
          }

          function setWaitingMarkers(msg) {
            const items = Array.isArray(msg.items) ? msg.items : [];
            const keep = new Set();

            items.forEach(function (it) {
              const id = String(it.id || "");
              const lat = Number(it.lat);
              const lng = Number(it.lng);

              if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

              keep.add(id);

              let marker = waitingMarkers.get(id);

              if (!marker) {
                marker = L.marker([lat, lng], {
                  pane: "waitingPane",
                  icon: iconForBookingType(it.bookingType),
                  zIndexOffset: 500,
                }).addTo(waitingLayer);

                marker.on("click", function () {
                  safePost({
                    type: "waitingMarkerTapped",
                    bookingId: id,
                  });
                });

                waitingMarkers.set(id, marker);
              } else {
                marker.setLatLng([lat, lng]);
                marker.setIcon(iconForBookingType(it.bookingType));
              }

              const distanceText =
                typeof it.matrixDistanceKm === "number"
                  ? " • " + Number(it.matrixDistanceKm).toFixed(1) + " km"
                  : "";

              const label = (it.bookingType || "Booking") + distanceText;

              marker.unbindTooltip();
              marker.bindTooltip(label, {
                permanent: false,
                direction: "top",
                className: "waiting-tooltip",
                pane: "tooltipPaneCustom",
              });
            });

            for (const [id, marker] of waitingMarkers) {
              if (!keep.has(id)) {
                waitingLayer.removeLayer(marker);
                waitingMarkers.delete(id);
              }
            }
          }

          function setPwAppMarkers(msg) {
            const items = Array.isArray(msg.items) ? msg.items : [];
            const keep = new Set();

            items.forEach(function (p) {
              const id = String(p.id || "");
              const lat = Number(p.lat);
              const lng = Number(p.lng);

              if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

              keep.add(id);

              let marker = pwappMarkers.get(id);

              if (!marker) {
                marker = L.marker([lat, lng], {
                  pane: "taskPane",
                  icon: makePwAppIcon(),
                  zIndexOffset: 700,
                }).addTo(pwappLayer);

                pwappMarkers.set(id, marker);
              } else {
                marker.setLatLng([lat, lng]);
              }

              marker.unbindTooltip();
              marker.bindTooltip(
                "pwApp • " +
                  (p.passengerType || "REGULAR") +
                  (p.note ? " • " + p.note : ""),
                {
                  permanent: false,
                  direction: "top",
                  className: "pwapp-tooltip",
                  pane: "tooltipPaneCustom",
                }
              );
            });

            for (const [id, marker] of pwappMarkers) {
              if (!keep.has(id)) {
                pwappLayer.removeLayer(marker);
                pwappMarkers.delete(id);
              }
            }
          }

          function setTaskPlan(msg) {
            const tasks = Array.isArray(msg.tasks) ? msg.tasks : [];
            const activeTaskId = msg.activeTaskId ? String(msg.activeTaskId) : null;
            const keep = new Set();

            tasks.forEach(function (t, idx) {
              const id = String(t.id || t._id || idx);
              const lat = Number(t.lat);
              const lng = Number(t.lng);

              if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

              keep.add(id);

              const taskStatus = String(t.status || "").toUpperCase();
              const isDone =
                taskStatus === "DONE" ||
                taskStatus === "COMPLETED" ||
                taskStatus === "PICKED_UP" ||
                taskStatus === "DROPPED_OFF";

              if (isDone) return;

              const isActive =
                (activeTaskId && activeTaskId === id) ||
                taskStatus === "ACTIVE";

              const icon = makeTaskIcon(idx + 1, t.taskType, isActive);
              const title =
                String(t.taskType || "").toUpperCase() === "PICKUP"
                  ? "Pickup"
                  : "Dropoff";
              const label =
                t.label && String(t.label).trim()
                  ? String(t.label)
                  : lat.toFixed(4) + ", " + lng.toFixed(4);

              let marker = taskMarkers.get(id);

              if (!marker) {
                marker = L.marker([lat, lng], {
                  pane: "taskPane",
                  icon,
                  zIndexOffset: isActive ? 1000 : 800,
                }).addTo(taskLayer);

                taskMarkers.set(id, marker);
              } else {
                marker.setLatLng([lat, lng]);
                marker.setIcon(icon);
                marker.setZIndexOffset(isActive ? 1000 : 800);
              }

              marker.unbindTooltip();
              marker.bindTooltip((idx + 1) + ") " + title + " • " + label, {
                permanent: isActive,
                direction: "top",
                className: "task-tooltip",
                pane: "tooltipPaneCustom",
              });

              if (isActive) {
                marker.openTooltip();
              }
            });

            for (const [id, marker] of taskMarkers) {
              if (!keep.has(id)) {
                taskLayer.removeLayer(marker);
                taskMarkers.delete(id);
              }
            }
          }

          function setTodaZones(msg) {
            todaLayer.clearLayers();

            const zones = Array.isArray(msg.items) ? msg.items : [];

            zones.forEach(function (z) {
              const lat = Number(z.lat);
              const lng = Number(z.lng);

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

              const circle = L.circle([lat, lng], {
                radius: Number(z.radius || 100),
                stroke: false,
                fillColor: "#3388ff",
                fillOpacity: 0.13,
              }).addTo(todaLayer);

              if (z.name) {
                circle.bindTooltip(String(z.name), {
                  direction: "top",
                  permanent: false,
                  className: "toda-tooltip",
                  pane: "tooltipPaneCustom",
                });
              }
            });
          }

          // ======================================================
          // BRIDGE
          // ======================================================

          function handleMessageObject(msg) {
            if (!msg || typeof msg !== "object") return;

            if (queueOrRun(msg)) return;

            if (msg.type === "updateDriver") {
              const lat = Number(msg.latitude);
              const lng = Number(msg.longitude);

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

              if (driverMarker) {
                const curr = driverMarker.getLatLng();
                const dLat = Math.abs(curr.lat - lat);
                const dLng = Math.abs(curr.lng - lng);

                if (dLat < 1e-6 && dLng < 1e-6) return;
              }

              tweenDriverTo(lat, lng, 260);

              // ✅ Local route follow. No backend/ORS request.
              trimStoredRouteFromDriverPosition(lat, lng);

              return;
            }

            if (msg.type === "drawRoute") {
              drawRoute(msg.coords, msg.summary);
              return;
            }

            if (msg.type === "clearRoute") {
              clearRoute();
              return;
            }

            if (msg.type === "setPassengerMarkers") {
              setPassengerMarkers(msg);
              return;
            }

            if (msg.type === "setWaitingMarkers") {
              setWaitingMarkers(msg);
              return;
            }

            if (msg.type === "setTodaZones") {
              setTodaZones(msg);
              return;
            }

            if (msg.type === "setPwAppMarkers") {
              setPwAppMarkers(msg);
              return;
            }

            if (msg.type === "setTaskPlan") {
              setTaskPlan(msg);
              return;
            }

            if (msg.type === "recenter") {
              const lat = Number(msg.latitude);
              const lng = Number(msg.longitude);
              const zoom = Number(msg.zoom || map.getZoom());

              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                map.setView([lat, lng], zoom, {
                  animate: true,
                  duration: 0.25,
                });
              }

              return;
            }
          }

          function handleRawMessage(raw) {
            let msg = {};

            try {
              msg = JSON.parse(raw || "{}");
            } catch (e) {
              return;
            }

            handleMessageObject(msg);
          }

          document.addEventListener("message", function (event) {
            handleRawMessage(event.data);
          });

          window.addEventListener("message", function (event) {
            handleRawMessage(event.data);
          });

          setTimeout(function () {
            safePost({
              type: "mapReady",
            });
          }, 250);
        </script>
      </body>
    </html>
  `;
}