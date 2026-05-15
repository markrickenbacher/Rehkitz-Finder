const GOOGLE_FORM_ACTION_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScoDXJmznfCCSkOtds7VLY38zztmyrw1cgU2iSgJPtcAc1H9g/formResponse";

const GOOGLE_FORM_FIELDS = {
  date: "entry.2133523640",
  latitude: "entry.1056871652",
  longitude: "entry.1495036116",
};

const SPLASH_MIN_DURATION_MS = 2000;

const splashScreen = document.getElementById("splashScreen");
const appRoot = document.getElementById("appRoot");

const startScanBtn = document.getElementById("startScanBtn");
const startSearchBtn = document.getElementById("startSearchBtn");
const centerMapBtn = document.getElementById("centerMapBtn");
const sendLocationBtn = document.getElementById("sendLocationBtn");

const scanStatus = document.getElementById("scanStatus");
const permissionStatus = document.getElementById("permissionStatus");
const sendStatus = document.getElementById("sendStatus");
const distanceText = document.getElementById("distanceText");
const targetText = document.getElementById("targetText");
const nearDistanceBox = document.getElementById("nearDistanceBox");
const nearDistanceText = document.getElementById("nearDistanceText");
const mapPanel = document.getElementById("mapPanel");
const reader = document.getElementById("reader");
const arrow = document.getElementById("arrow");
const arrowGlow = document.getElementById("arrowGlow");

let map;
let userMarker = null;
let targetMarker = null;
let accuracyCircle = null;
let targetRadiusCircle = null;
let lineToTarget = null;

let html5QrCode = null;
let scannerRunning = false;

let watchId = null;
let targetCoords = loadSavedTarget();
let currentCoords = null;

let currentHeading = null;
let smoothedCompassHeading = null;
let smoothedArrowRotation = null;

let activeHeadingMode = null;
let activeHeadingModeSince = 0;

let targetReachedBeepPlayed = false;
let nearTargetBeepPlayed = false;
let audioContext = null;
let lastDynamicBeepAt = 0;

let searchActive = false;
let nearZoomLocked = false;

const recentPositions = [];
const MAX_RECENT_POSITIONS = 8;
const MIN_MOVEMENT_FOR_TRACK_HEADING_METERS = 6;
const MIN_TRACK_DISTANCE_FOR_STABLE_HEADING_METERS = 10;
const DEFAULT_CENTER = [47.3769, 8.5417];

const COMPASS_SMOOTHING_FACTOR = 0.18;
const ARROW_SMOOTHING_FACTOR = 0.22;
const MIN_ROTATION_CHANGE_DEGREES = 6;
const HEADING_MODE_HOLD_MS = 2500;

const userIcon = L.divIcon({
  className: "custom-marker-wrapper",
  html: '<div class="user-marker-pin"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

const targetIcon = L.divIcon({
  className: "custom-marker-wrapper",
  html: '<div class="target-marker-pin"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

initMap();
bindEvents();
registerServiceWorker();
updateStaticUI();
restoreTargetIfAvailable();
showSplashThenApp();

function showSplashThenApp() {
  window.setTimeout(() => {
    splashScreen.classList.add("hidden");
    appRoot.classList.remove("app-hidden");

    window.setTimeout(() => {
      splashScreen.remove();
      map.invalidateSize();
    }, 500);
  }, SPLASH_MIN_DURATION_MS);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.error("Service Worker Registrierung fehlgeschlagen:", error);
    }
  });
}

function initMap() {
  map = L.map("map").setView(DEFAULT_CENTER, 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap-Mitwirkende",
  }).addTo(map);
}

function bindEvents() {
  startScanBtn.addEventListener("click", startScanner);
  startSearchBtn.addEventListener("click", startSearch);
  centerMapBtn.addEventListener("click", () => fitMapToAvailablePoints(true));
  sendLocationBtn.addEventListener("click", submitCurrentLocationToGoogleForm);

  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

async function startSearch() {
  searchActive = true;
  startSearchBtn.disabled = true;
  startLocationTracking();
  await requestOrientationPermission();
}

function updateStaticUI() {
  distanceText.textContent = "–";
  nearDistanceText.textContent = "–";
  nearDistanceBox.classList.add("hidden");
  mapPanel.classList.remove("near-focus");
  applyArrowColor("rgb(59, 130, 246)");
  sendLocationBtn.disabled = true;

  if (targetCoords) {
    targetText.textContent = `${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
  } else {
    targetText.textContent = "–";
  }
}

function restoreTargetIfAvailable() {
  if (!targetCoords) return;

  updateTargetMarker();
  fitMapToAvailablePoints(true);
  scanStatus.textContent =
    `Gespeichertes Ziel geladen: ${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
}

async function startScanner() {
  if (scannerRunning) return;

  reader.classList.remove("hidden");
  scanStatus.textContent = "Starte Kamera…";
  html5QrCode = new Html5Qrcode("reader");

  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.72;
          return { width: size, height: size };
        },
      },
      onScanSuccess,
      () => {}
    );

    scannerRunning = true;
    startScanBtn.disabled = true;
    scanStatus.textContent = "Scanner aktiv. Bitte QR-Code ins Kamerabild halten.";
  } catch (error) {
    scanStatus.textContent = `Scanner konnte nicht gestartet werden: ${error}`;
    reader.classList.add("hidden");
  }
}

async function stopScannerAfterSuccess() {
  if (!html5QrCode || !scannerRunning) return;

  try {
    await html5QrCode.stop();
    await html5QrCode.clear();
  } catch (_) {
  } finally {
    scannerRunning = false;
    startScanBtn.disabled = false;
    reader.classList.add("hidden");
  }
}

async function stopScannerCompletely() {
  if (!html5QrCode) return;

  try {
    if (scannerRunning) {
      await html5QrCode.stop();
    }
    await html5QrCode.clear();
  } catch (_) {
  } finally {
    scannerRunning = false;
    html5QrCode = null;
    startScanBtn.disabled = false;
    reader.classList.add("hidden");
  }
}

async function onScanSuccess(decodedText) {
  const parsed = parseCoordinates(decodedText);

  if (!parsed) {
    scanStatus.textContent = `QR-Code erkannt, aber ungültiges Format: ${decodedText}`;
    return;
  }

  targetCoords = parsed;
  saveTarget(targetCoords);
  targetReachedBeepPlayed = false;
  nearTargetBeepPlayed = false;
  lastDynamicBeepAt = 0;
  smoothedArrowRotation = null;
  nearZoomLocked = false;

  targetText.textContent = `${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;
  scanStatus.textContent =
    `Ziel erkannt: ${targetCoords.lat.toFixed(6)}, ${targetCoords.lng.toFixed(6)}`;

  updateTargetMarker();
  updateNavigation();
  fitMapToAvailablePoints(true);

  await stopScannerAfterSuccess();
}

function parseCoordinates(text) {
  const clean = text.trim();

  let match = clean.match(
    /(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)/i
  );

  if (!match) {
    match = clean.match(/geo:\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i);
  }

  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function startLocationTracking() {
  if (!navigator.geolocation) {
    permissionStatus.textContent = "Geolocation wird von diesem Browser nicht unterstützt.";
    return;
  }

  if (watchId !== null) {
    permissionStatus.textContent = "Suche läuft bereits.";
    return;
  }

  permissionStatus.textContent = "Standort wird ermittelt…";

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (!searchActive) return;

      currentCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      pushRecentPosition(currentCoords);

      permissionStatus.textContent =
        "Standort aktiv. Richtung wird stabilisiert berechnet.";
      sendLocationBtn.disabled = false;

      updateUserMarker();
      updateNavigation();

      if (!nearZoomLocked) {
        fitMapToAvailablePoints(false);
      }
    },
    (error) => {
      permissionStatus.textContent = `Standortfehler: ${error.message}`;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    }
  );
}

function stopSearch() {
  searchActive = false;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  nearZoomLocked = false;
  mapPanel.classList.remove("near-focus");

  startSearchBtn.disabled = false;
  sendLocationBtn.disabled = true;

  permissionStatus.textContent = "Suche beendet.";
}

function pushRecentPosition(coords) {
  recentPositions.push({
    lat: coords.lat,
    lng: coords.lng,
    timestamp: coords.timestamp || Date.now(),
  });

  if (recentPositions.length > MAX_RECENT_POSITIONS) {
    recentPositions.shift();
  }
}

async function requestOrientationPermission() {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result === "granted") {
        permissionStatus.textContent = "Standort aktiv. Kompassfreigabe erteilt.";
      } else {
        permissionStatus.textContent =
          "Standort aktiv. Kompassfreigabe wurde nicht erteilt.";
      }
    } else {
      permissionStatus.textContent =
        "Standort aktiv. Kompass ist verfügbar oder nicht separat freizugeben.";
    }
  } catch (error) {
    permissionStatus.textContent =
      `Standort aktiv. Kompassfreigabe fehlgeschlagen: ${error.message}`;
  }
}

function handleOrientation(event) {
  if (!searchActive) return;

  let heading = null;

  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading;
  } else if (typeof event.alpha === "number") {
    heading = 360 - event.alpha;
  }

  if (heading === null || Number.isNaN(heading)) return;

  currentHeading = normalizeDegrees(heading);

  if (smoothedCompassHeading === null) {
    smoothedCompassHeading = currentHeading;
  } else {
    smoothedCompassHeading = smoothAngle(
      smoothedCompassHeading,
      currentHeading,
      COMPASS_SMOOTHING_FACTOR
    );
  }

  updateNavigation();
}

function updateTargetMarker() {
  if (!targetCoords) return;

  if (!targetMarker) {
    targetMarker = L.marker([targetCoords.lat, targetCoords.lng], {
      icon: targetIcon,
    }).addTo(map);
  } else {
    targetMarker.setLatLng([targetCoords.lat, targetCoords.lng]);
  }

  if (!targetRadiusCircle) {
    targetRadiusCircle = L.circle([targetCoords.lat, targetCoords.lng], {
      radius: 2,
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);
  } else {
    targetRadiusCircle.setLatLng([targetCoords.lat, targetCoords.lng]);
    targetRadiusCircle.setRadius(2);
  }

  targetMarker.bindPopup("Fundort");
}

function updateUserMarker() {
  if (!currentCoords) return;

  if (!userMarker) {
    userMarker = L.marker([currentCoords.lat, currentCoords.lng], {
      icon: userIcon,
    }).addTo(map);
  } else {
    userMarker.setLatLng([currentCoords.lat, currentCoords.lng]);
  }

  if (!accuracyCircle) {
    accuracyCircle = L.circle([currentCoords.lat, currentCoords.lng], {
      radius: currentCoords.accuracy,
      color: "#60a5fa",
      fillColor: "#60a5fa",
      fillOpacity: 0.08,
      weight: 2,
    }).addTo(map);
  } else {
    accuracyCircle.setLatLng([currentCoords.lat, currentCoords.lng]);
    accuracyCircle.setRadius(currentCoords.accuracy);
  }
}

function updateNavigation() {
  if (!targetCoords || !currentCoords || !searchActive) {
    distanceText.textContent = "–";
    nearDistanceText.textContent = "–";
    nearDistanceBox.classList.add("hidden");
    updateTargetLine();
    return;
  }

  const distance = haversineDistance(
    currentCoords.lat,
    currentCoords.lng,
    targetCoords.lat,
    targetCoords.lng
  );

  const targetBearing = calculateBearing(
    currentCoords.lat,
    currentCoords.lng,
    targetCoords.lat,
    targetCoords.lng
  );

  distanceText.textContent = formatDistance(distance);
  updateNearDistanceUI(distance);

  const headingSource = getStableHeadingSource();
  const effectiveHeading = headingSource ? headingSource.heading : null;

  const desiredRotation =
    effectiveHeading === null
      ? targetBearing
      : normalizeDegrees(targetBearing - effectiveHeading);

  applySmoothedArrowRotation(desiredRotation);

  const color = getProximityColor(distance);
  applyArrowColor(color);
  updateTargetLine();
  updateNearZoom(distance);
  handleProximityBeeps(distance);
  handleDynamicNearBeep(distance);
}

function getStableHeadingSource() {
  const trackHeadingInfo = calculateTrackHeadingFromRecentPositions();
  const compassAvailable = smoothedCompassHeading !== null;

  let preferredMode = null;

  if (trackHeadingInfo && trackHeadingInfo.distance >= MIN_TRACK_DISTANCE_FOR_STABLE_HEADING_METERS) {
    preferredMode = "gps";
  } else if (trackHeadingInfo && trackHeadingInfo.distance >= MIN_MOVEMENT_FOR_TRACK_HEADING_METERS) {
    preferredMode = activeHeadingMode === "gps" ? "gps" : null;
  }

  if (!preferredMode && compassAvailable) {
    preferredMode = "compass";
  }

  if (!preferredMode && trackHeadingInfo) {
    preferredMode = "gps";
  }

  if (!preferredMode) {
    activeHeadingMode = null;
    return null;
  }

  const now = Date.now();

  if (!activeHeadingMode) {
    activeHeadingMode = preferredMode;
    activeHeadingModeSince = now;
  } else if (activeHeadingMode !== preferredMode) {
    const heldLongEnough = now - activeHeadingModeSince >= HEADING_MODE_HOLD_MS;

    if (heldLongEnough) {
      activeHeadingMode = preferredMode;
      activeHeadingModeSince = now;
    }
  }

  if (activeHeadingMode === "gps" && trackHeadingInfo) {
    return { heading: trackHeadingInfo.heading, mode: "gps" };
  }

  if (activeHeadingMode === "compass" && compassAvailable) {
    return { heading: smoothedCompassHeading, mode: "compass" };
  }

  if (trackHeadingInfo) {
    return { heading: trackHeadingInfo.heading, mode: "gps" };
  }

  if (compassAvailable) {
    return { heading: smoothedCompassHeading, mode: "compass" };
  }

  return null;
}

function calculateTrackHeadingFromRecentPositions() {
  if (recentPositions.length < 2) return null;

  const first = recentPositions[0];
  const last = recentPositions[recentPositions.length - 1];

  const movedDistance = haversineDistance(first.lat, first.lng, last.lat, last.lng);

  if (movedDistance < MIN_MOVEMENT_FOR_TRACK_HEADING_METERS) {
    return null;
  }

  return {
    heading: calculateBearing(first.lat, first.lng, last.lat, last.lng),
    distance: movedDistance,
  };
}

function applySmoothedArrowRotation(desiredRotation) {
  if (smoothedArrowRotation === null) {
    smoothedArrowRotation = desiredRotation;
  } else {
    const delta = shortestAngleDelta(smoothedArrowRotation, desiredRotation);

    if (Math.abs(delta) < MIN_ROTATION_CHANGE_DEGREES) {
      return;
    }

    smoothedArrowRotation = smoothAngle(
      smoothedArrowRotation,
      desiredRotation,
      ARROW_SMOOTHING_FACTOR
    );
  }

  arrow.style.transform =
    `translate(-50%, -76%) rotate(${smoothedArrowRotation}deg)`;
}

function smoothAngle(fromAngle, toAngle, factor) {
  const delta = shortestAngleDelta(fromAngle, toAngle);
  return normalizeDegrees(fromAngle + delta * factor);
}

function shortestAngleDelta(fromAngle, toAngle) {
  return ((toAngle - fromAngle + 540) % 360) - 180;
}

function updateNearDistanceUI(distance) {
  if (distance <= 5) {
    nearDistanceText.textContent = formatDistance(distance);
    nearDistanceBox.classList.remove("hidden");
  } else {
    nearDistanceText.textContent = "–";
    nearDistanceBox.classList.add("hidden");
  }
}

function updateNearZoom(distance) {
  if (!map || !targetCoords || !currentCoords) return;

  if (distance <= 2) {
    mapPanel.classList.add("near-focus");

    if (!nearZoomLocked) {
      nearZoomLocked = true;

      const zoom = getAccuracyBasedZoom(currentCoords.accuracy);
      const center = [
        (currentCoords.lat + targetCoords.lat) / 2,
        (currentCoords.lng + targetCoords.lng) / 2,
      ];

      map.setView(center, zoom, { animate: true });
    } else {
      const center = [
        (currentCoords.lat + targetCoords.lat) / 2,
        (currentCoords.lng + targetCoords.lng) / 2,
      ];

      map.panTo(center, { animate: true });
    }

    return;
  }

  nearZoomLocked = false;
  mapPanel.classList.remove("near-focus");

  if (distance <= 10) {
    const bounds = L.latLngBounds(
      [currentCoords.lat, currentCoords.lng],
      [targetCoords.lat, targetCoords.lng]
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 19 });
  }
}

function getAccuracyBasedZoom(accuracy) {
  if (accuracy <= 3) return 20;
  if (accuracy <= 5) return 19;
  if (accuracy <= 10) return 18;
  return 17;
}

function getProximityColor(distance) {
  let red = 59;
  let green = 130;
  let blue = 246;

  if (distance <= 20) {
    const t = Math.max(0, Math.min(1, (20 - distance) / 20));
    red = Math.round(59 + (239 - 59) * t);
    green = Math.round(130 + (68 - 130) * t);
    blue = Math.round(246 + (68 - 246) * t);
  }

  return `rgb(${red}, ${green}, ${blue})`;
}

function applyArrowColor(color) {
  arrow.style.borderBottomColor = color;
  arrow.style.filter = `drop-shadow(0 0 18px ${color})`;
  arrowGlow.style.background = color;
}

function updateTargetLine() {
  if (!map) return;

  if (!targetCoords || !currentCoords || !searchActive) {
    if (lineToTarget) {
      map.removeLayer(lineToTarget);
      lineToTarget = null;
    }
    return;
  }

  const latLngs = [
    [currentCoords.lat, currentCoords.lng],
    [targetCoords.lat, targetCoords.lng],
  ];

  if (!lineToTarget) {
    lineToTarget = L.polyline(latLngs, {
      color: "#38bdf8",
      weight: 3,
      dashArray: "8 8",
      opacity: 0.8,
    }).addTo(map);
  } else {
    lineToTarget.setLatLngs(latLngs);
  }
}

function fitMapToAvailablePoints(forceFit = false) {
  if (nearZoomLocked && !forceFit) return;

  const points = [];

  if (currentCoords) points.push([currentCoords.lat, currentCoords.lng]);
  if (targetCoords) points.push([targetCoords.lat, targetCoords.lng]);

  if (points.length === 0) return;

  if (points.length === 1) {
    if (forceFit) {
      map.setView(points[0], 18);
    }
    return;
  }

  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
}

function handleProximityBeeps(distance) {
  if (!searchActive) return;

  if (distance <= 3 && !targetReachedBeepPlayed) {
    playBeepSequence([
      { frequency: 1200, duration: 140, volume: 0.06 },
      { frequency: 1500, duration: 180, volume: 0.06 },
      { frequency: 1800, duration: 240, volume: 0.06 },
    ]);
    targetReachedBeepPlayed = true;
    nearTargetBeepPlayed = true;
    return;
  }

  if (distance <= 10 && !nearTargetBeepPlayed) {
    playBeepSequence([
      { frequency: 900, duration: 120, volume: 0.05 },
      { frequency: 1100, duration: 120, volume: 0.05 },
    ]);
    nearTargetBeepPlayed = true;
  }

  if (distance > 10) {
    nearTargetBeepPlayed = false;
  }

  if (distance > 3) {
    targetReachedBeepPlayed = false;
  }
}

function handleDynamicNearBeep(distance) {
  if (!searchActive) return;
  if (distance > 10 || distance <= 0.5) return;

  const now = Date.now();
  const interval = getDynamicBeepInterval(distance);

  if (now - lastDynamicBeepAt < interval) {
    return;
  }

  lastDynamicBeepAt = now;

  const frequency = distance <= 2 ? 1600 : distance <= 5 ? 1300 : 1000;
  const duration = distance <= 2 ? 120 : 100;

  playBeep(frequency, duration, 0.04);
}

function getDynamicBeepInterval(distance) {
  if (distance <= 2) return 250;
  if (distance <= 3) return 400;
  if (distance <= 5) return 650;
  return 1000;
}

function playBeepSequence(tones) {
  let delay = 0;
  for (const tone of tones) {
    setTimeout(() => {
      playBeep(tone.frequency, tone.duration, tone.volume);
    }, delay);
    delay += tone.duration + 80;
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

async function playBeep(frequency = 1000, duration = 150, volume = 0.05) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration / 1000);
}

async function submitCurrentLocationToGoogleForm() {
  if (!currentCoords) {
    alert("Bitte zuerst Suche starten und Standort bestimmen.");
    return;
  }

  const dateValue = formatDate(new Date());
  const latValue = normalizeCoordinate(currentCoords.lat.toFixed(6));
  const lonValue = normalizeCoordinate(currentCoords.lng.toFixed(6));

  const form = document.createElement("form");
  form.method = "POST";
  form.action = GOOGLE_FORM_ACTION_URL;
  form.target = "hidden_iframe";

  const fields = [
    { name: GOOGLE_FORM_FIELDS.date, value: dateValue },
    { name: GOOGLE_FORM_FIELDS.latitude, value: "'" + latValue },
    { name: GOOGLE_FORM_FIELDS.longitude, value: "'" + lonValue },
  ];

  fields.forEach((field) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = field.name;
    input.value = field.value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  sendStatus.textContent =
    `Fundort gesendet: ${dateValue}, ${latValue}, ${lonValue}`;

  await stopScannerCompletely();
  stopSearch();

  scanStatus.textContent = "Suche abgeschlossen. Fundort wurde gesendet.";
  alert("Fundort wurde gesendet und die Suche beendet.");
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeCoordinate(value) {
  return String(value).replace(",", ".").trim();
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const lambda1 = toRad(lon1);
  const lambda2 = toRad(lon2);

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

function normalizeDegrees(value) {
  return (value % 360 + 360) % 360;
}

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) {
    return `${distanceMeters.toFixed(1)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function saveTarget(target) {
  localStorage.setItem("rehkitz-target", JSON.stringify(target));
}

function loadSavedTarget() {
  try {
    const raw = localStorage.getItem("rehkitz-target");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      parsed.lat >= -90 &&
      parsed.lat <= 90 &&
      parsed.lng >= -180 &&
      parsed.lng <= 180
    ) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
