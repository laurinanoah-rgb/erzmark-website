# ERZMARK – Offizielle Entwicklungsanweisung

## Vision

Wir entwickeln keine gewöhnliche Minecraft-Server-Website.
Wir entwickeln das Portal einer lebendigen Welt.

Der Besucher soll innerhalb der ersten fünf Sekunden das Gefühl bekommen, dass Erzmark existiert, auch wenn er Minecraft gar nicht geöffnet hat.

Die Website ist ein Teil der Spielwelt. Es gibt keine harten Übergänge zwischen Website und Spiel. Alles wirkt lebendig, hochwertig und geheimnisvoll.

**Inspiration:** Diablo IV, League of Legends Universe, Riot Games, Blizzard Battle.net, Star Citizen, Arcane Website.

**Nicht** inspirieren lassen von typischen Minecraft-Server-Webseiten.

## Wichtige Regel

Nichts auf der Website darf sich "tot" anfühlen. Wenn der Besucher 30 Sekunden lang nichts macht, soll trotzdem ständig etwas passieren:

- Rauch verändert sich.
- Feuer flackert.
- Wind bewegt Blätter.
- Sterne funkeln.
- Glühwürmchen fliegen vorbei.
- Charakter atmet.
- Charakter schaut ins Feuer.
- Charakter schaut kurz zum Besucher.
- Geräusche verändern sich.
- Nebel zieht.

Die Welt lebt unabhängig vom Benutzer.

## Prioritäten

### Phase 1 – Engine aufbauen

Nicht sofort Assets. Nicht sofort Animationen. Zuerst:

- React Three Fiber
- Kamera
- Beleuchtung
- Asset Loader
- Scene Manager
- Animation Manager
- Audio Manager
- Weather Manager
- Secret Manager

Erst danach Inhalte hinzufügen.

## Hero Scene

Die komplette Hero Section ist eine Echtzeit-3D-Szene. Keine Videos. Keine GIFs. Keine Canvas-Hacks. Alles wird live gerendert.

## Minecraft Account

Die Website besitzt Login. Der Benutzer kann seinen Minecraft Account verknüpfen. Sobald dies passiert: Der Held am Lagerfeuer ist nicht mehr irgendein Skin — es ist dein Minecraft Skin. Der Skin wird automatisch geladen, der Charakter sitzt weiterhin am Lagerfeuer, alle Animationen bleiben erhalten.

Falls kein Minecraft Account verknüpft wurde: neutraler Erzmark-Abenteurer.

## Personalisierung

Nach Login verändert sich die Website:

- Der NPC begrüßt dich.
- Der Serverstatus zeigt "Willkommen zurück, ...".
- Der Charakter am Feuer IST dein Charakter.

Später: Inventar, Errungenschaften, Fraktion, Rang, Freunde.

## Wetter

Die Website bleibt grundsätzlich eine Nacht-Szene. Es wird niemals Tag. Aber die Atmosphäre richtet sich nach dem echten Wetter des Besuchers (Wetter-API):

- **Regen**: leichter Regen, nasser Boden, Regentropfen, mehr Nebel, Regen auf dem Lagerfeuer, anderes Ambiente.
- **Schnee**: Schnee, kalter Nebel, sichtbarer Atem.
- **Nebel**: mehr Nebel.
- **Sturm**: stärkerer Wind.
- **Klar**: Sterne sichtbar.

Die Szene bleibt stilistisch gleich — nur die Atmosphäre wird angepasst.

## Audio

Audio reagiert ebenfalls: Regen → Regen-Sound, Wind → mehr Wind, Schnee → gedämpfte Atmosphäre.

## Geheimnisse

Die Website besitzt versteckte Geheimnisse. Nicht dokumentieren. Nicht ankündigen. Besucher sollen sie entdecken.

### Geheimnis: Rudolf

Tippt der Benutzer irgendwo auf der Website (nicht in ein Eingabefeld) das Wort `rudolf`, passiert:

1. Die komplette Website glitcht für ~1 Sekunde (Bildfehler, Shaderfehler, chromatische Aberration, Monitor-Flackern).
2. Der Bildschirm wird kurz schwarz.
3. Eine alte Entwicklerkonsole erscheint mit durchlaufendem Text, z.B.:
   ```
   Initializing...
   Connection established...
   R.U.D.O.L.F
   Access Level 7
   Observer detected.
   ...
   ```
4. Ein Achievement erscheint: "Geheime Errungenschaft freigeschaltet — Du solltest das eigentlich nicht wissen."
5. Die Konsole verschwindet wieder.

Der Besucher weiß nicht: War das Absicht? Oder ein Bug?

### Weitere Geheimnisse

Es wird von Anfang an ein generisches System gebaut (`secret-manager`), das beliebig viele versteckte Events verwaltet — nicht nur Rudolf. Trigger-Typen z.B.: bestimmte Uhrzeiten, Tastenkombinationen, Namen, Wochentage, Halloween, Weihnachten, Server-Jubiläum, Entwickler-Modus. Neue Geheimnisse müssen sich später einfach ergänzen lassen, ohne den Manager umzubauen.

## Atmosphäre

Die Welt soll Geheimnisse besitzen, die man nie ganz sicher wahrgenommen hat:

- Alle paar Minuten: zwei rote Augen, die wieder verschwinden.
- Ein Schatten läuft im Wald.
- Eine Rune erscheint kurz.

## Performance

Das Projekt wird wie ein Spiel entwickelt:

- Keine unnötigen Re-Renders.
- GPU-Partikel.
- Instancing.
- LOD.
- Texture Compression.
- Lazy Loading.
- Asset Streaming.

## Qualität

Keine billigen Animationen, keine linearen Schleifen. Animationen müssen zufällig wirken. Keine hektischen Bewegungen — alles langsam, alles atmosphärisch.

## Designprinzip

Jedes Detail soll die gleiche Frage beantworten:

> "Fühlt sich Erzmark wie eine echte Welt an?"

Wenn die Antwort Nein ist, wird das Feature überarbeitet.

## Leitsatz

Denke nicht in Komponenten – denke in Spielsystemen.

Entwickle diese Website wie die Lobby eines AAA-Spiels. Jede Animation, jedes Licht, jeder Sound und jede Interaktion soll Teil einer lebendigen Welt sein. Schreibe sauberen, erweiterbaren Code mit klar getrennten Managern (Scene, Animation, Audio, Weather, Secrets, Profile). Neue Features müssen später hinzugefügt werden können, ohne bestehende Systeme umzubauen. Qualität, Immersion und Wartbarkeit haben Vorrang vor schneller Umsetzung.
