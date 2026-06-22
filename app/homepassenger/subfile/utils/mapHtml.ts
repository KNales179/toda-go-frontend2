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
  iconDataJson: string;
  avatarUrl?: string | null;
}) {
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
          touch-action: none;
          background: #f8fafc;
        }

        .distance-label.leaflet-tooltip {
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

        .distance-label.leaflet-tooltip:before {
          display: none;
        }

        .toda-label {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(15,23,42,.18);
          white-space: nowrap;
        }

        .landmark-label {
          background: rgba(255,255,255,.95);
          color: #111827;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 3px 6px;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,.16);
          white-space: nowrap;
        }
      </style>
    </head>

    <body>
      <div id="map"></div>

      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>

      <script>
        if (!window.L) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: "error",
            msg: "Leaflet failed to load"
          }));
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
        }).setView([${initLat}, ${initLng}], 15);

        const baseTiles = L.tileLayer(
          "https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}",
          {
            maxZoom: 19,

            // Keeps nearby/offscreen tiles around so dragging/zooming back feels smoother.
            keepBuffer: 6,

            // Reduces tile reload pressure while dragging/zooming.
            updateWhenIdle: true,
            updateWhenZooming: false,
            updateInterval: 250,

            attribution:
              '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }
        ).addTo(map);

        // ======================================================
        // STATE
        // ======================================================

        let userMarker = null;
        let pickupMarker = null;
        let destMarker = null;
        let driverMarker = null;

        let destinationLocked = false;

        let routeLine = null;
        let distanceTooltip = null;

        let routePolylines = [];
        let routeHitPolylines = [];
        let routeVariantsMeta = [];
        let activeRouteIndex = null;

        let landmarkLayer = L.layerGroup().addTo(map);
        let todaLayer = L.layerGroup().addTo(map);

        let currentPassengerType = "CLASSIC";
        let tweenHandle = null;
        let isMapDragging = false;
        let pendingUserLoc = null;

        // ======================================================
        // ICONS
        // ======================================================

        const passengerIcons = {
          CLASSIC: L.icon({
            iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
          GROUP: L.icon({
            iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/orange-dot.png",
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
          SOLO: L.icon({
            iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/yellow-dot.png",
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
        };

        const pickupIcon = L.icon({
          iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const destIcon = L.icon({
          iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const driverIcon = L.icon({
          iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/cabs.png",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        function getPassengerIcon() {
          return passengerIcons[currentPassengerType] || passengerIcons.CLASSIC;
        }

        // ======================================================
        // MARKERS
        // ======================================================

        function upsertUserMarker(lat, lng) {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (!userMarker) {
            userMarker = L.marker([lat, lng], {
              icon: getPassengerIcon(),
              zIndexOffset: 1200,
              interactive: false,
            }).addTo(map);
          } else {
            userMarker.setLatLng([lat, lng]);
          }
        }

        function tweenMarkerTo(lat, lng, durationMs = 180) {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (!userMarker) {
            upsertUserMarker(lat, lng);
            return;
          }

          if (tweenHandle) {
            cancelAnimationFrame(tweenHandle);
            tweenHandle = null;
          }

          const start = userMarker.getLatLng();
          const end = L.latLng(lat, lng);
          const t0 = performance.now();

          const step = (t) => {
            const p = Math.min(1, (t - t0) / durationMs);
            const latI = start.lat + (end.lat - start.lat) * p;
            const lngI = start.lng + (end.lng - start.lng) * p;

            userMarker.setLatLng([latI, lngI]);

            if (p < 1) {
              tweenHandle = requestAnimationFrame(step);
            } else {
              tweenHandle = null;
            }
          };

          tweenHandle = requestAnimationFrame(step);
        }

        function setDestinationMarker(lat, lng) {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (destMarker) {
            map.removeLayer(destMarker);
            destMarker = null;
          }

          destMarker = L.marker([lat, lng], {
            icon: destIcon,
            zIndexOffset: 900,
          }).addTo(map);
        }

        function setPickupMarker(lat, lng) {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          if (pickupMarker) {
            map.removeLayer(pickupMarker);
            pickupMarker = null;
          }

          pickupMarker = L.marker([lat, lng], {
            icon: pickupIcon,
            zIndexOffset: 950,
          }).addTo(map);
        }

        function clearPickupMarker() {
          if (pickupMarker) {
            map.removeLayer(pickupMarker);
            pickupMarker = null;
          }
        }

        function setDriverMarker(lat, lng) {
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            if (driverMarker) {
              map.removeLayer(driverMarker);
              driverMarker = null;
            }
            return;
          }

          if (!driverMarker) {
            driverMarker = L.marker([lat, lng], {
              icon: driverIcon,
              zIndexOffset: 1100,
            }).addTo(map);
          } else {
            driverMarker.setLatLng([lat, lng]);
          }
        }

        // ======================================================
        // ROUTES
        // ======================================================

        let storedSingleRouteLatLngs = [];
        let storedSingleRouteMeta = null;

        let storedRouteVariants = [];
        let trimRouteTimer = null;
        let lastUserTrimLoc = null;

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

          for (let i = 0; i < latlngs.length; i++) {
            const d = distanceMeters(current, latlngs[i]);

            if (d < bestDistance) {
              bestDistance = d;
              bestIndex = i;
            }
          }

          return bestIndex;
        }

        function trimLatLngsFromPosition(latlngs, lat, lng) {
          if (!Array.isArray(latlngs) || latlngs.length < 2) return [];

          const idx = nearestRouteIndex(latlngs, lat, lng);

          // ✅ Always start from the live user GPS point.
          // ✅ Use original stored route, not the already-trimmed route.
          const remaining = [[Number(lat), Number(lng)]].concat(
            latlngs.slice(idx + 1)
          );

          return remaining.length >= 2 ? remaining : latlngs.slice(-2);
        }

        function clearSingleRouteDisplayOnly() {
          if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
          }

          if (distanceTooltip) {
            map.removeLayer(distanceTooltip);
            distanceTooltip = null;
          }
        }

        function clearRoutePolylinesDisplayOnly() {
          routePolylines.forEach((p) => map.removeLayer(p));
          routeHitPolylines.forEach((p) => map.removeLayer(p));

          routePolylines = [];
          routeHitPolylines = [];
          routeVariantsMeta = [];

          if (distanceTooltip) {
            map.removeLayer(distanceTooltip);
            distanceTooltip = null;
          }
        }

        function clearDisplayedRoutesOnly() {
          clearSingleRouteDisplayOnly();
          clearRoutePolylinesDisplayOnly();
        }

        function clearAllRoutes() {
          clearDisplayedRoutesOnly();

          activeRouteIndex = null;

          // ✅ Delete stored full routes.
          // This happens when phome.tsx sends clearRoute / clearRoutes,
          // like completed, canceled, reset, or destination change.
          storedSingleRouteLatLngs = [];
          storedSingleRouteMeta = null;
          storedRouteVariants = [];

          if (trimRouteTimer) {
            clearTimeout(trimRouteTimer);
            trimRouteTimer = null;
          }

          lastUserTrimLoc = null;
        }

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
            .join(" • ");

          if (!label || !midArr) {
            if (distanceTooltip) {
              map.removeLayer(distanceTooltip);
              distanceTooltip = null;
            }
            return;
          }

          const mid = L.latLng(midArr[0], midArr[1]);

          if (!distanceTooltip) {
            distanceTooltip = L.tooltip({
              permanent: true,
              direction: "top",
              offset: [0, -6],
              className: "distance-label",
            });
          }

          distanceTooltip
            .setLatLng(mid)
            .setContent(label)
            .addTo(map);
        }

        function highlightRouteIndex(idx) {
          activeRouteIndex = idx;

          routePolylines.forEach(function (poly, i) {
            const isMain = i === idx;

            poly.setStyle({
              color: isMain ? "#007bff" : "#808080",
              weight: isMain ? 6 : 4,
              opacity: isMain ? 0.9 : 0.55,
            });

            if (isMain && typeof poly.bringToFront === "function") {
              poly.bringToFront();
            }
          });

          routeHitPolylines.forEach(function (hit) {
            if (typeof hit.bringToFront === "function") {
              hit.bringToFront();
            }
          });

          updateRouteLabelForIndex(idx);
        }

        function normalizeRouteLatLngs(coords) {
          if (!Array.isArray(coords)) return [];

          return coords
            .map(function (pair) {
              return [Number(pair[0]), Number(pair[1])];
            })
            .filter(function (pair) {
              return Number.isFinite(pair[0]) && Number.isFinite(pair[1]);
            });
        }

        function buildRouteMetaFromStored(r, latlngs) {
          const distM =
            r && r.summary && typeof r.summary.distance === "number"
              ? r.summary.distance
              : 0;

          const durS =
            r && r.summary && typeof r.summary.duration === "number"
              ? r.summary.duration
              : 0;

          const distanceKm = distM / 1000;
          const fallbackDist = distanceKm.toFixed(2) + " km";

          const mins = Math.round(durS / 60);
          const fallbackDur =
            mins >= 60
              ? Math.floor(mins / 60) + "h " + (mins % 60) + " min"
              : mins + " min";

          const distanceText = r.distanceText || fallbackDist;
          const durationText = r.durationText || fallbackDur;
          const fareText = r.fareText || "";

          const midIndex = Math.floor(latlngs.length / 2);
          const midLatLng = latlngs[midIndex];

          return {
            midLatLng,
            distanceText,
            durationText,
            fareText,
          };
        }

        function renderRouteVariantsFromStored(options) {
          const shouldFit = !!(options && options.shouldFit);
          const trimLat = options ? options.trimLat : null;
          const trimLng = options ? options.trimLng : null;

          clearDisplayedRoutesOnly();

          if (!Array.isArray(storedRouteVariants) || !storedRouteVariants.length) {
            return;
          }

          routeVariantsMeta = [];
          routePolylines = [];
          routeHitPolylines = [];

          storedRouteVariants.forEach(function (r, idx) {
            const originalLatLngs = r.latlngs || [];

            if (!Array.isArray(originalLatLngs) || originalLatLngs.length < 2) {
              return;
            }

            const latlngs =
              Number.isFinite(Number(trimLat)) && Number.isFinite(Number(trimLng))
                ? trimLatLngsFromPosition(originalLatLngs, Number(trimLat), Number(trimLng))
                : originalLatLngs;

            if (latlngs.length < 2) return;

            const isMain = idx === (activeRouteIndex == null ? 0 : activeRouteIndex);

            const poly = L.polyline(latlngs, {
              color: isMain ? "#007bff" : "#808080",
              weight: isMain ? 6 : 4,
              opacity: isMain ? 0.9 : 0.55,
              interactive: false,
              smoothFactor: 1.2,
            }).addTo(map);

            routePolylines.push(poly);

            routeVariantsMeta[idx] = buildRouteMetaFromStored(r, latlngs);

            const hit = L.polyline(latlngs, {
              color: "#000000",
              weight: 70,
              opacity: 0,
              interactive: true,
              lineCap: "round",
              lineJoin: "round",
              bubblingMouseEvents: false,
            }).addTo(map);

            hit.on("click", function (e) {
              L.DomEvent.stop(e);
              highlightRouteIndex(idx);

              window.ReactNativeWebView?.postMessage(
                JSON.stringify({
                  type: "routeChosen",
                  index: idx,
                })
              );
            });

            routeHitPolylines.push(hit);
          });

          if (routePolylines.length) {
            if (activeRouteIndex == null || !routePolylines[activeRouteIndex]) {
              activeRouteIndex = 0;
            }

            highlightRouteIndex(activeRouteIndex);

            if (shouldFit && routePolylines[activeRouteIndex]) {
              map.fitBounds(routePolylines[activeRouteIndex].getBounds(), {
                paddingTopLeft: [60, 90],
                paddingBottomRight: [60, 260],
                maxZoom: 17,
              });
            }
          }
        }

        function renderSingleRouteFromStored(options) {
          const shouldFit = !!(options && options.shouldFit);
          const trimLat = options ? options.trimLat : null;
          const trimLng = options ? options.trimLng : null;

          clearDisplayedRoutesOnly();

          if (
            !Array.isArray(storedSingleRouteLatLngs) ||
            storedSingleRouteLatLngs.length < 2
          ) {
            return;
          }

          const latlngs =
            Number.isFinite(Number(trimLat)) && Number.isFinite(Number(trimLng))
              ? trimLatLngsFromPosition(
                  storedSingleRouteLatLngs,
                  Number(trimLat),
                  Number(trimLng)
                )
              : storedSingleRouteLatLngs;

          if (latlngs.length < 2) return;

          routeLine = L.polyline(latlngs, {
            weight: 5,
            color: "#1a73e8",
            opacity: 0.9,
            smoothFactor: 1.2,
          }).addTo(map);

          const mid = latlngs[Math.floor(latlngs.length / 2)];
          const label = [
            storedSingleRouteMeta?.distanceText,
            storedSingleRouteMeta?.durationText,
            storedSingleRouteMeta?.fareText,
          ]
            .filter(Boolean)
            .join(" • ");

          if (label) {
            distanceTooltip = L.tooltip({
              permanent: true,
              direction: "top",
              offset: [0, -6],
              className: "distance-label",
            })
              .setContent(label)
              .setLatLng(mid)
              .addTo(map);
          }

          if (shouldFit && routeLine) {
            map.fitBounds(routeLine.getBounds(), {
              paddingTopLeft: [60, 90],
              paddingBottomRight: [60, 260],
              maxZoom: 17,
            });
          }
        }

        function trimStoredRouteFromUserPosition(lat, lng) {
          if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
            return;
          }

          const hasVariantRoute =
            Array.isArray(storedRouteVariants) && storedRouteVariants.length > 0;

          const hasSingleRoute =
            Array.isArray(storedSingleRouteLatLngs) &&
            storedSingleRouteLatLngs.length > 1;

          if (!hasVariantRoute && !hasSingleRoute) return;

          lastUserTrimLoc = {
            latitude: Number(lat),
            longitude: Number(lng),
          };

          // ✅ Local redraw only. No backend request.
          // Slight delay prevents heavy redraw if GPS fires too fast.
          if (trimRouteTimer) {
            clearTimeout(trimRouteTimer);
          }

          trimRouteTimer = setTimeout(function () {
            if (!lastUserTrimLoc) return;

            if (hasVariantRoute) {
              renderRouteVariantsFromStored({
                trimLat: lastUserTrimLoc.latitude,
                trimLng: lastUserTrimLoc.longitude,
                shouldFit: false,
              });
              return;
            }

            if (hasSingleRoute) {
              renderSingleRouteFromStored({
                trimLat: lastUserTrimLoc.latitude,
                trimLng: lastUserTrimLoc.longitude,
                shouldFit: false,
              });
            }
          }, 120);
        }

        function drawRouteVariants(routes) {
          clearAllRoutes();

          if (!Array.isArray(routes) || !routes.length) return;

          storedRouteVariants = routes
            .map(function (r) {
              const latlngs = normalizeRouteLatLngs(r.coords);

              if (latlngs.length < 2) return null;

              return {
                ...r,
                latlngs,
              };
            })
            .filter(Boolean);

          if (!storedRouteVariants.length) return;

          activeRouteIndex = 0;

          renderRouteVariantsFromStored({
            shouldFit: false,
          });
        }

        function drawSingleRoute(route, meta) {
          clearAllRoutes();

          const latlngs = normalizeRouteLatLngs(route);
          if (latlngs.length < 2) return;

          storedSingleRouteLatLngs = latlngs;
          storedSingleRouteMeta = meta || null;

          renderSingleRouteFromStored({
            shouldFit: false,
          });
        }

        // ======================================================
        // MAP DRAG / ZOOM SAFETY
        // ======================================================

        map.on("dragstart zoomstart", function () {
          isMapDragging = true;
        });

        map.on("dragend zoomend moveend", function () {
          isMapDragging = false;

          if (pendingUserLoc) {
            tweenMarkerTo(
              pendingUserLoc.latitude,
              pendingUserLoc.longitude,
              120
            );

            trimStoredRouteFromUserPosition(
              pendingUserLoc.latitude,
              pendingUserLoc.longitude
            );

            pendingUserLoc = null;
          }
        });

        // ======================================================
        // USER TAP DESTINATION
        // ======================================================

        map.on("click", function (e) {
          if (destinationLocked) return;

          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          window.ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: "mapTapDestination",
              latitude: lat,
              longitude: lng,
            })
          );
        });

        // ======================================================
        // BRIDGE
        // ======================================================

        function handleMessage(raw) {
          let msg = {};

          try {
            msg = JSON.parse(raw || "{}");
          } catch (e) {
            return;
          }

          if (msg.type === "ensureUserMarker") {
            const lat = Number(msg.latitude);
            const lng = Number(msg.longitude);

            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              upsertUserMarker(lat, lng);
            }

            window.ReactNativeWebView?.postMessage(
              JSON.stringify({
                type: "userMarkerEnsured",
                placed: !!userMarker,
              })
            );

            return;
          }

          if (msg.type === "setPassengerType") {
            currentPassengerType = msg.passengerType || "CLASSIC";

            if (userMarker) {
              userMarker.setIcon(getPassengerIcon());
            }

            return;
          }

          if (msg.type === "updateUserLoc") {
            const lat = Number(msg.latitude);
            const lng = Number(msg.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

            if (isMapDragging) {
              pendingUserLoc = {
                latitude: lat,
                longitude: lng,
              };
              return;
            }

            tweenMarkerTo(lat, lng, 120);

            // ✅ Trim visible route locally when passenger GPS moves.
            // No ORS/backend request.
            trimStoredRouteFromUserPosition(lat, lng);

            return;
          }

          if (msg.type === "setPickup") {
            const lat = Number(msg.latitude);
            const lng = Number(msg.longitude);

            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              setPickupMarker(lat, lng);
            }

            return;
          }

          if (msg.type === "clearPickup") {
            clearPickupMarker();
            return;
          }

          if (msg.type === "setMarkers") {
            destinationLocked = !!msg.driver;

            if (
              msg.destination &&
              Number.isFinite(Number(msg.destination.latitude)) &&
              Number.isFinite(Number(msg.destination.longitude))
            ) {
              setDestinationMarker(
                Number(msg.destination.latitude),
                Number(msg.destination.longitude)
              );
            } else if (destMarker) {
              map.removeLayer(destMarker);
              destMarker = null;
            }

            if (
              msg.pickup &&
              Number.isFinite(Number(msg.pickup.latitude)) &&
              Number.isFinite(Number(msg.pickup.longitude))
            ) {
              setPickupMarker(
                Number(msg.pickup.latitude),
                Number(msg.pickup.longitude)
              );
            } else {
              clearPickupMarker();
            }

            if (
              msg.driver &&
              Number.isFinite(Number(msg.driver.latitude)) &&
              Number.isFinite(Number(msg.driver.longitude))
            ) {
              setDriverMarker(
                Number(msg.driver.latitude),
                Number(msg.driver.longitude)
              );
            } else {
              setDriverMarker(NaN, NaN);
            }

            return;
          }

          if (msg.type === "drawRoute" && Array.isArray(msg.route)) {
            drawSingleRoute(msg.route, {
              distanceText: msg.distanceText,
              durationText: msg.durationText,
              fareText: msg.fareText,
            });

            if (msg.reframe && routeLine) {
              map.fitBounds(routeLine.getBounds(), {
                paddingTopLeft: [60, 90],
                paddingBottomRight: [60, 260],
                maxZoom: 17,
              });
            }

            return;
          }

          if (msg.type === "setRoutes") {
            if (Array.isArray(msg.routes)) {
              drawRouteVariants(msg.routes);
            }
            return;
          }

          if (msg.type === "selectRouteIndex") {
            if (typeof msg.index === "number") {
              highlightRouteIndex(msg.index);
            }
            return;
          }

          if (msg.type === "clearRoute" || msg.type === "clearRoutes") {
            clearAllRoutes();
            return;
          }

          if (msg.type === "fitRoute") {
            const targetRoute =
              typeof msg.index === "number" && routePolylines[msg.index]
                ? routePolylines[msg.index]
                : routeLine || routePolylines[activeRouteIndex || 0];

            if (targetRoute) {
              map.fitBounds(targetRoute.getBounds(), {
                paddingTopLeft: [60, 90],
                paddingBottomRight: [60, Number(msg.bottomPadding || 320)],
                maxZoom: 17,
              });
            }

            return;
          }

          if (msg.type === "setLandmarks" && Array.isArray(msg.items)) {
            landmarkLayer.clearLayers();

            msg.items.forEach(function (it) {
              const lat = Number(it.lat);
              const lng = Number(it.lng);

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

              const marker = L.marker([lat, lng]).addTo(landmarkLayer);

              marker.bindTooltip(it.name || "Landmark", {
                direction: "top",
                permanent: false,
                className: "landmark-label",
              });

              marker.bindPopup(
                "<strong>" + (it.name || "Landmark") + "</strong>"
              );
            });

            return;
          }

          if (msg.type === "clearLandmarks") {
            landmarkLayer.clearLayers();
            return;
          }

          if (msg.type === "setTodas" && Array.isArray(msg.items)) {
            todaLayer.clearLayers();

            msg.items.forEach(function (it) {
              const lat = Number(it.lat);
              const lng = Number(it.lng);

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

              const dests = Array.isArray(it.destinations)
                ? it.destinations
                : [];

              const lines = dests
                .map(function (d) {
                  if (!d) return "";
                  if (typeof d === "string") return d;
                  if (typeof d === "object" && d.name) return d.name;
                  return "";
                })
                .filter(Boolean);

              const marker = L.marker([lat, lng]).addTo(todaLayer);

              marker.bindTooltip(it.name || "TODA", {
                direction: "top",
                permanent: true,
                className: "toda-label",
              });

              const html =
                "<div>" +
                  "<strong>" + (it.name || "TODA Terminal") + "</strong><br/>" +
                  "<span>Serves:</span><br/>" +
                  (
                    lines.length
                      ? "<ul style='padding-left:16px;margin:4px 0;'>" +
                          lines
                            .map(function (txt) {
                              return "<li>" + txt + "</li>";
                            })
                            .join("") +
                        "</ul>"
                      : "<em>No destinations configured</em>"
                  ) +
                "</div>";

              marker.bindPopup(html);
            });

            return;
          }

          if (msg.type === "clearTodas") {
            todaLayer.clearLayers();
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

        document.addEventListener("message", function (event) {
          handleMessage(event.data);
        });

        window.addEventListener("message", function (event) {
          handleMessage(event.data);
        });

        // ======================================================
        // READY
        // ======================================================

        setTimeout(function () {
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: "mapReady",
            })
          );
        }, 250);
      </script>
    </body>
  </html>
  `;
}