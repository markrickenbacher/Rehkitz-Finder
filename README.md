# Rehkitz Finder

Rehkitz Finder ist eine browserbasierte Web-App zur Navigation zu GPS-Zielkoordinaten und zum Senden des aktuellen Fundorts an eine Google Form.

Die App ist für Smartphones gedacht und unterstützt:
- QR-Code-Scan mit Kamera
- Standortbestimmung per GPS
- Zielanzeige auf Karte
- Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- Nahbereichsmodus für die letzten Meter
- Senden des aktuellen Fundorts an Google Forms / Google Sheets
- PWA-Grundfunktion mit Service Worker

## Funktionen

- QR-Code-Scan mit Smartphone-Kamera
- Einlesen von WGS84-Koordinaten in Dezimalgrad
- Anzeige von Zielpunkt und eigener Position auf einer Karte
- großer Richtungspfeil zum Ziel
- Distanzanzeige in Echtzeit
- Farbübergang des Pfeils je nach Nähe zum Ziel
- Zielradius auf der Karte
- akustisches Signal bei Zielnähe
- dynamische Pieptöne im Nahbereich
- automatische Kartenvergrößerung im Nahbereich
- große Restdistanzanzeige unter 5 m
- Ziel speichern im Browser
- bevorzugte Richtungsbestimmung über GPS-Bewegung
- Kompass als Fallback
- Senden des aktuellen Fundorts an eine Google Form
- Weiterleitung der Daten in ein Google Sheet
- PWA-Unterstützung für Installation auf dem Startbildschirm
- Offline-App-Shell per Service Worker

## Aufbau der Oberfläche

Die App ist in vier Bereiche aufgeteilt:

1. **Suche vorbereiten**
2. **Navigation**
3. **Karte**
4. **Suche beenden**

## Bedienung

### 1. Suche vorbereiten

Im Bereich **Suche vorbereiten** stehen zwei Buttons zur Verfügung:

- **QR scannen**
- **Suche starten**

#### QR scannen
Mit **QR scannen** wird die Kamera geöffnet, um einen QR-Code mit Zielkoordinaten einzulesen.

Unterstützte Formate:

```text
47.3769,8.5417
47.3769;8.5417
geo:47.3769,8.5417
```

#### Suche starten
Mit **Suche starten** versucht die App gleichzeitig:

- den **Standort** des Geräts zu starten
- den **Kompass / Richtungssensor** freizugeben

Dadurch wird die Navigation vorbereitet.

---

### 2. Navigation

Die Navigation zeigt:

- einen großen Richtungspfeil
- die Distanz zum Ziel
- die Zielkoordinaten

#### Richtungslogik
Die App verwendet bevorzugt die **Bewegungsrichtung aus GPS-Positionen**.

Das bedeutet:
- wenn du dich bewegst, wird die Richtung aus den letzten Positionsänderungen berechnet
- wenn noch keine verlässliche Bewegungsrichtung vorliegt, wird der **Kompass** als Fallback verwendet

---

### 3. Nahbereichsmodus

Für die letzten Meter besitzt die App einen zusätzlichen **Nahbereichsmodus**.

#### Unter 10 Metern
Wenn du näher als **10 m** am Ziel bist:

- die Karte zoomt automatisch stärker hinein
- zusätzliche Pieptöne werden abgespielt
- die Pieptöne werden schneller, je näher du kommst

#### Unter 5 Metern
Wenn du näher als **5 m** am Ziel bist:

- erscheint eine große zusätzliche Anzeige
- dort wird die Restdistanz prominent dargestellt, zum Beispiel:

```text
Noch 4.3 m
Noch 2.1 m
Noch 0.9 m
```

#### Zielnähe
Zusätzlich gibt es bereits vorhandene Signale:
- bei ca. **10 m** erste Zielnähe-Signale
- bei ca. **3 m** ein deutliches Ziel-Erreicht-Signal

Der Nahbereichsmodus soll helfen, den Fundort im letzten Meterbereich schneller und genauer zu finden.

---

### 4. Karte

Die Karte zeigt:

- den Zielpunkt
- die aktuelle Position
- den Zielradius
- eine Linie zwischen aktueller Position und Ziel

Mit dem Button **Auf Ziel zentrieren** wird die Karte neu ausgerichtet.

Im Nahbereich zoomt die Karte zusätzlich automatisch näher an Ziel und aktuelle Position heran.

---

### 5. Suche beenden

Im Bereich **Suche beenden** steht der Button:

- **Fundort senden**

Mit diesem Button wird die **aktuelle GPS-Position** an eine Google Form gesendet.

Gesendet werden:
- aktuelles Datum
- aktuelle Latitude
- aktuelle Longitude

Die Google Form kann mit einem Google Sheet verbunden sein, sodass der Fundort dort automatisch gespeichert wird.

## Google Forms Anbindung

Die App verwendet eine Google Form als Empfänger für den Fundort.

Verwendete Felder:

- Datum → `entry.2133523640`
- Latitude → `entry.1056871652`
- Longitude → `entry.1495036116`

Die Daten werden an diese URL gesendet:

```text
https://docs.google.com/forms/d/e/1FAIpQLScoDXJmznfCCSkOtds7VLY38zztmyrw1cgU2iSgJPtcAc1H9g/formResponse
```

> Wichtig: Wenn sich die Feld-IDs in der Google Form ändern, muss auch die App angepasst werden.

## Voraussetzungen

Für Kamera, GPS, Kompass und Service Worker sollte die App über einen Webserver laufen.

Empfohlen:
- GitHub Pages
- lokaler Testserver
- HTTPS

Wichtige Hinweise:
- Kamera und Standort funktionieren auf mobilen Browsern meist nur zuverlässig über **HTTPS**
- auf iPhones muss der Orientierungssensor oft zusätzlich freigegeben werden
- auf Android kann der Kompass je nach Browser direkt funktionieren oder vom System abhängen

## Lokaler Start

### Mit Python

```bash
python -m http.server 8080
```

Danach im Browser öffnen:

```text
http://localhost:8080
```

## Nutzung auf dem Smartphone

1. App öffnen
2. **QR scannen**
3. Kamerazugriff erlauben
4. Zielkoordinaten scannen
5. **Suche starten**
6. Standortfreigabe erlauben
7. falls nötig Sensorfreigabe bestätigen
8. einige Meter gehen
9. dem Pfeil folgen
10. im Nahbereich auf Distanzanzeige, Karte und Pieptöne achten
11. am Fundort **Fundort senden**

## Installation auf dem Smartphone

### Android / Chrome
- Seite öffnen
- Browser-Menü öffnen
- **App installieren** oder **Zum Startbildschirm hinzufügen**

### iPhone / Safari
- Seite öffnen
- Teilen-Menü öffnen
- **Zum Home-Bildschirm**

## App-Icon / Logo

Damit beim Speichern auf dem Startbildschirm und im Header dein Logo angezeigt wird, müssen diese Dateien vorhanden sein:

```text
icons/icon-192.png
icons/icon-512.png
```

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
   └─ icon-512.png
```

## Offline-Verhalten

Die App nutzt einen Service Worker, um die App-Shell offline verfügbar zu machen.

Wichtig:
- externe Bibliotheken und Kartendaten werden weiterhin über das Netz geladen
- ohne Internet kann die Karte eingeschränkt oder leer sein
- lokale Dateien der App bleiben zwischengespeichert verfügbar
- das Senden an Google Forms benötigt eine Internetverbindung

## Grenzen der Genauigkeit

- Die Genauigkeit hängt stark vom GPS-Empfang ab
- Im Wald, bei dichter Bewölkung oder nahe an Gebäuden kann die Position ungenauer werden
- Browser-Kompasswerte können je nach Gerät springen oder driften
- Im Stillstand ist die Richtung oft weniger zuverlässig als beim Gehen
- Auch im Nahbereich ist GPS nicht zentimetergenau
- Die App ist als praktische Navigationshilfe gedacht, nicht als vermessungstechnisches Präzisionswerkzeug

## Empfohlene Nutzung im Feld

Für die beste Richtungsanzeige:

1. Ziel per QR-Code scannen
2. Suche starten
3. einige Meter in gerader Linie gehen
4. dem Pfeil folgen
5. im Bereich unter 10 m auf die schnelleren Pieptöne achten
6. unter 5 m die große Restdistanzanzeige nutzen
7. Karte im Nahbereich beobachten
8. am Fundort **Fundort senden**

So ist die Richtungsanzeige meist stabiler und der Fundort kann direkt dokumentiert werden.
