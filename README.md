# Rehkitz Finder

Browserbasierte Web-App zur Navigation zu GPS-Zielkoordinaten, die per QR-Code eingelesen werden.

## Funktionen

- QR-Code Scan mit Smartphone-Kamera
- Einlesen von WGS84-Koordinaten in Dezimalgrad
- Anzeige von Zielpunkt und eigener Position auf einer Karte
- Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- Farbverlauf des Pfeils:
  - Blau bei mehr als 20 m Entfernung
  - zunehmend roter innerhalb der letzten 20 m
  - Rot am Ziel
- Zielradius auf der Karte
- akustisches Signal bei Zielnähe
- PWA-Grundunterstützung
- Offline-App-Shell per Service Worker

## Unterstützte QR-Formate

```text
47.3769,8.5417
47.3769;8.5417
geo:47.3769,8.5417
```

## Lokaler Start

Da Kamera, GPS und Service Worker typischerweise kein `file://` mögen, die App bitte über einen lokalen Webserver starten.

### Python
```bash
python -m http.server 8080
```

Danach öffnen:
```text
http://localhost:8080
```

## GitHub Pages

Die App kann als statische Seite über GitHub Pages bereitgestellt werden.

Wichtig:
- HTTPS ist für Kamera, Standort und Sensoren sehr empfehlenswert
- iPhone/Safari verlangt oft eine explizite Freigabe für Orientierungssensoren

## Installation auf dem Smartphone

- Seite im mobilen Browser öffnen
- optional "Zum Startbildschirm hinzufügen"
- Kamera, Standort und Kompass erlauben

## Icons

Die SVG-Dateien im Ordner `icons/` dienen als Vorlage.
Bitte zusätzlich echte PNG-Dateien erzeugen:

- `icons/icon-192.png`
- `icons/icon-512.png`

Empfohlene Größen:
- 192x192 px
- 512x512 px

## Hinweise

- Die Genauigkeit hängt stark von GPS und Gerätesensoren ab
- Der Kompass im Browser kann je nach Gerät schwanken
- Falls kein Kompass verfügbar ist, bleiben Karte und Distanzanzeige nutzbar