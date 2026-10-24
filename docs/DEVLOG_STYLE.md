# Freitags-Devlog: Schreibanleitung

Gilt für den automatischen Freitags-Lauf, der aus den Devlog-Einträgen einen News-Beitrag für erzmark.de schreibt. **Vorlage für Ton, Aufbau und Länge ist `devlog/posts/2026-10-23.md`.** Neue Beiträge sollen sich genauso anfühlen.

## Ablauf

1. `git fetch origin '+refs/heads/devlog/*:refs/remotes/origin/devlog/*'`
2. `python tools/devlog_collect.py --until <Freitag> > /tmp/entries.json` (sammelt `main` **und** alle `devlog/*`-Branches, ab dem Tag nach dem letzten Beitrag)
3. Beitrag als `devlog/posts/<Freitag YYYY-MM-DD>.md` schreiben (Frontmatter siehe unten)
4. Direkt auf `main` committen und pushen. Die Action `Devlog auf erzmark.de veröffentlichen` postet ihn als MineTrax-News (Kategorie Dev)
5. Gibt es **keine** neuen Einträge, wird nichts geschrieben und nichts gepostet

## Dateiformat

```markdown
---
title: "⚒️ Devlog · Freitag, 30. Oktober 2026"
---

> *„…kurzer R.U.D.O.L.F.-Satz zur Woche…"*
> — **R.U.D.O.L.F.**, Wochenprotokoll

…Text…
```

Optional `draft: true` im Frontmatter: Dann landet der Beitrag als unveröffentlichter Entwurf in MineTrax.

## Inhalt und Reihenfolge

1. R.U.D.O.L.F.-Zitat (kurz, in-world, passend zur Woche) + 1–2 Sätze Einleitung + Legende `✅ live · 🧪 auf dem Testserver · 🛠️ in Arbeit`
2. **🔥 Highlight**: das spannendste Neue der Woche, ausführlich (gern Tabelle, Kette mit ➜, Unterabschnitte)
3. **✨ Weitere Neuheiten**: je Thema eine `###`-Überschrift mit Emoji und Statusmarke
4. **📱 Bedrock** (falls es Bedrock-Arbeit gab)
5. **🔧 Behoben**: Liste, je Punkt ✅ oder 🛠️
6. **⚙️ Unter der Haube**: Server-Updates, Aufräumarbeiten (kurz)
7. **🔭 Was als Nächstes kommt**
8. **📊 Auf einen Blick**: Tabelle Bereich | Status
9. Kurzer Dank + Discord-Hinweis + R.U.D.O.L.F.-Schlusssatz

Abschnitte ohne Inhalt weglassen. Ähnliche Einträge zusammenfassen (z. B. mehrere Taverne-Einträge zu einem Abschnitt), nicht jeden Eintrag einzeln aufzählen.

## Regeln

- **Erzmark-Launcher und Erzmark-App kommen nie vor**, auch nicht als Nebensatz
- Für Spieler schreiben: verständlich, begeistert, „ihr"-Ansprache, keine Fachbegriffe ohne Nutzen
- Nur, was in den Einträgen steht. Nichts erfinden, nichts übertreiben. Status ehrlich markieren (Testserver ≠ live)
- Rein interne Punkte weglassen (Devlog-Workflow, Testserver angleichen, Entwicklungs-Kopien, Checklisten)
- Keine Spielernamen, Zugangsdaten, Server-Pfade, IP-Adressen, Sicherheitsdetails oder Exploit-Hinweise
- Nur GitHub-Markdown (MineTrax rendert GFM): Überschriften, Listen, Tabellen, Zitate, Fett/Kursiv, Emojis. Kein HTML
- Länge etwa wie die Vorlage; in ruhigen Wochen gern kürzer
