# Rehkitz Finder

Rehkitz Finder ist eine browserbasierte Web-App zur Navigation zu GPS-Zielkoordinaten, die per QR-Code eingelesen werden.

Die App ist für Smartphones gedacht und unterstützt:
- QR-Code-Scan mit Kamera
- Standortbestimmung per GPS
- Zielanzeige auf Karte
- Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- PWA-Grundfunktion mit Service Worker

---

## Funktionen

- QR-Code-Scan mit Smartphone-Kamera
- Einlesen von WGS84-Koordinaten in Dezimalgrad
- Anzeige von Zielpunkt und eigener Position auf einer Karte
- großer Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- Farbverlauf des Pfeils:
  - Blau bei mehr als 20 m Entfernung
  - zunehmend roter innerhalb der letzten 20 m
  - Rot am Ziel
- Zielradius auf der Karte
- akustisches Signal bei Zielnähe
- Ziel speichern im Browser
- Ziel löschen und neu scannen
- PWA-Grundunterstützung
- Offline-App-Shell per Service Worker
- bevorzugte Richtungsbestimmung über GPS-Bewegung
- Kompass als Fallback
- manuelle Pfeil-Kalibrierung um ±10°

---

## Unterstützte QR-Formate

Folgende Inhalte werden unterstützt:

```text
47.3769,8.5417
47.3769;8.5417
geo:47.3769,8.5417
```

Die Koordinaten müssen im Format **Breitengrad, Längengrad** vorliegen.

---

## Voraussetzungen

Für Kamera, GPS, Kompass und Service Worker sollte die App über einen Webserver laufen.

Empfohlen:
- GitHub Pages
- lokaler Testserver
- HTTPS

Hinweise:
- Kamera und Standort funktionieren auf mobilen Browsern zuverlässig meist nur über HTTPS
- auf iPhones muss der Orientierungssensor oft zusätzlich freigegeben werden

---

## Lokaler Start

### Mit Python

```bash
python -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

---

## Nutzung

1. App auf dem Smartphone öffnen
2. **QR scannen**
3. Kamerazugriff erlauben
4. **Standort starten**
5. Standortfreigabe erlauben
6. falls nötig **Kompass freigeben**
7. dem Pfeil folgen
8. bei Bedarf **Ziel löschen** und neu scannen

### Kalibrierung
Falls der Pfeil systematisch leicht versetzt ist:
- **Pfeil -10°**
- **Pfeil +10°**

Damit kann der Richtungsanzeiger manuell feinjustiert werden.

---

## Richtungslogik

Die App verwendet bevorzugt die **Bewegungsrichtung aus GPS-Positionen**.

Das bedeutet:
- wenn sich der Nutzer bewegt, wird die Richtung aus den letzten Positionsänderungen berechnet
- wenn noch keine verlässliche Bewegungsrichtung vorhanden ist, wird auf den **Kompass** zurückgegriffen
- wenn weder GPS-Bewegungsrichtung noch Kompass sinnvoll verfügbar sind, bleiben Karte und Distanzanzeige nutzbar

Das verbessert die Zuverlässigkeit gegenüber einer rein kompassbasierten Lösung.

---

## GitHub Pages

Die App ist als statische Website für GitHub Pages geeignet.

### Aktivierung
1. Repository auf GitHub öffnen
2. **Settings** → **Pages**
3. Source wählen:
   - **Deploy from a branch**
4. Branch wählen:
   - `main`
   - `/ (root)`
5. Speichern

Danach ist die App über die GitHub-Pages-URL erreichbar.

Beispiel:
```text
https://markrickenbacher.github.io/Rehkitz-Finder/
```

---

## Installation auf dem Smartphone

Je nach Gerät/Betriebssystem kann die App zum Startbildschirm hinzugefügt werden.

### iPhone / Safari
- Seite öffnen
- Teilen-Menü öffnen
- **Zum Home-Bildschirm**

### Android / Chrome
- Seite öffnen
- Browser-Menü öffnen
- **App installieren** oder **Zum Startbildschirm hinzufügen**

---

## Projektstruktur

```text
Rehkitz-Finder/
├─ index.html
├─ style.css
├─ app.js
├─ manifest.webmanifest
├─ service-worker.js
├─ README.md
└─ icons/
   ├─ icon-192.png
   ├─ icon-512.png
   ├─ icon-192.svg
   └─ icon-512.svg
```

---

## Icons

Für die PWA sollten echte PNG-Dateien vorhanden sein:

- `icons/icon-192.png`
- `icons/icon-512.png`

Empfohlene Größen:
- `192x192`
- `512x512`

Die SVG-Dateien können als Vorlage für den PNG-Export verwendet werden.

---

## Hinweise zu Berechtigungen

### Kamera
Wird für das Scannen des QR-Codes benötigt.

### Standort
Wird benötigt, um die eigene Position und die Distanz zum Ziel zu berechnen.

### Kompass / Orientierungssensor
Wird benötigt, damit der Pfeil im Fallback-Modus korrekt ausgerichtet werden kann.

Hinweis:
- auf iPhones muss der Orientierungssensor oft explizit freigegeben werden
- je nach Gerät kann die Kompassgenauigkeit schwanken

---

## Offline-Verhalten

Die App nutzt einen Service Worker, um die App-Shell offline verfügbar zu machen.

Wichtig:
- externe Bibliotheken und Kartendaten werden weiterhin über das Netz geladen
- ohne Internet kann die Karte daher eingeschränkt oder leer sein
- bereits geladene lokale Dateien bleiben verfügbar

---

## Grenzen der Genauigkeit

- Die Genauigkeit hängt stark vom GPS-Empfang ab
- Im Wald, bei dichter Bewölkung oder nahe an Gebäuden kann die Position ungenauer werden
- Browser-Kompasswerte können je nach Gerät springen oder driften
- Die App ist als praktische Navigationshilfe gedacht, nicht als vermessungstechnisches Präzisionswerkzeug

---

## Erweiterungsmöglichkeiten

Die App ist als einfache statische Web-App aufgebaut und kann leicht erweitert werden, zum Beispiel um:
- mehrere Ziele
- manuelle Koordinateneingabe
- weitere QR-Formate
- Offline-Karten
- Zielhistorie
- Export / Import von Zielpunkten
- automatische Nullpunkt-Kalibrierung