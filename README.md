# Rehkitz Finder

Eine mobile Web-App zur QR-basierten Navigation zu einem Fundort mit Karte, Richtungsanzeige und Standortübermittlung.

## Funktionen

- **Splash Screen beim Start** mit Logo aus `icons/icon-512.png`
- **QR-Code-Scan** über die Rückkamera des Smartphones
- Unterstützung für QR-Codes im DJI-Pilot-2-Format wie:
  - `https://maps.google.com/?q=47.4614,7.9123`
- **Zielerkennung aus QR-Code** und Speicherung des letzten Ziels im Browser
- **Navigation per Pfeil**, wobei die Pfeilspitze zum Fundort zeigt
- **Stabilisierte Richtungsanzeige** durch geglätteten Kompass und GPS-Bewegungsrichtung
- **Rote Zielmarkierung** und **blaue Benutzerposition** auf der Karte
- **Automatischer Nahbereichsmodus**:
  - unter 5 m zusätzliche Distanzanzeige
  - unter 2 m größere Karte und maximal sinnvoller Zoom abhängig von GPS-Genauigkeit
- **Stabiler Nahzoom** ohne ständiges Rein-/Rauszoomen
- **Akustische Annäherungssignale** im Nahbereich
- **Fundort senden** an ein Google Form
- **Suche beenden** nach dem Senden des Fundorts
- **Offline-Unterstützung** über Service Worker

## Bedienung

1. App starten
2. QR-Code mit **QR scannen** einlesen
3. Mit **Suche starten** Standort und Kompass aktivieren
4. Dem Pfeil folgen – **die Pfeilspitze zeigt zum Fundort**
5. Im Nahbereich die Karte verwenden:
   - **blauer Marker** = eigene Position
   - **roter Marker** = Ziel / Fundort
6. Am Fundort **Fundort senden** drücken
   - der Standort wird an das Google Form gesendet
   - die Suche wird beendet

## QR-Code-Format

Aktuell wird das von **DJI Pilot 2** verwendete Format unterstützt:

```text
https://maps.google.com/?q=47.4614,7.9123
```

Die App extrahiert daraus automatisch Breitengrad und Längengrad.

## Navigation

Die Navigation kombiniert zwei Richtungsquellen:

- **GPS-Bewegungsrichtung**, wenn genügend Bewegung vorhanden ist
- **Kompass**, wenn keine stabile Bewegungsrichtung vorliegt

Zur Beruhigung des Pfeils werden:

- Winkel geglättet
- kleine Richtungsänderungen ignoriert
- Quellenwechsel zwischen GPS und Kompass verzögert

## Kartenverhalten

- Ziel wird **rot** dargestellt
- eigene Position wird **blau** dargestellt
- zwischen Benutzer und Ziel wird eine Linie angezeigt
- unter **2 m** wird ein Nahmodus aktiviert:
  - Karte wird größer
  - Zoom richtet sich nach der GPS-Genauigkeit
  - der Zoom bleibt stabil und pumpt nicht dauernd

## Projektstruktur

- `index.html` – Oberfläche der App
- `style.css` – Layout, Navigation, Splash Screen und Marker-Styling
- `app.js` – Scanner, Navigation, Karte, QR-Parsing und Formularübermittlung
- `service-worker.js` – Offline-Unterstützung
- `manifest.webmanifest` – PWA-Metadaten
- `icons/` – App-Icons und Splash-Logo

## Voraussetzungen

- modernes Smartphone mit Browser
- HTTPS-Betrieb für Kamera-, Standort- und Kompasszugriff
- Kamerazugriff für den QR-Scanner
- Standortfreigabe für die Navigation
- auf iOS ggf. zusätzliche Kompassfreigabe

## Hinweise zum Einsatz

- Der QR-Code sollte ruhig und möglichst formatfüllend ins Kamerabild gehalten werden.
- Bei schwacher GPS-Genauigkeit kann die Position im Nahbereich springen.
- Die Karte zeigt in den letzten Metern meist verlässlicher als der Kompass allein.
- Wenn der Fundort gesendet wurde, ist die Suche beendet und muss für einen neuen Durchlauf erneut gestartet werden.

## Konfiguration

### Splash Screen Dauer

In `app.js`:

```javascript
const SPLASH_MIN_DURATION_MS = 4000;
```

- `4000` = 4 Sekunden
- `5000` = 5 Sekunden

### Google Form Ziel

In `app.js`:

```javascript
const GOOGLE_FORM_ACTION_URL = "...";
const GOOGLE_FORM_FIELDS = {
  date: "...",
  latitude: "...",
  longitude: "...",
};
```

Hier können Formular-URL und Feld-IDs angepasst werden.

## Technische Details

- QR-Scan mit `html5-qrcode`
- Karte mit `Leaflet`
- Standort über `navigator.geolocation.watchPosition`
- Richtung über `deviceorientation` / `webkitCompassHeading`
- Zielspeicherung via `localStorage`

## Lizenz / Nutzung

Dieses Projekt ist für den praktischen Einsatz zur Navigation zu einem Fundort ausgelegt und kann an die eigenen betrieblichen Abläufe angepasst werden.
