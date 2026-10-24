# Erzmark Devlog für KI-Agenten

Dieses Verzeichnis sammelt öffentliche, belegbare Wochenmeldungen aus Codex, Claude Code und weiteren Agenten. Nach jeder inhaltlichen Erzmark-Arbeitssitzung entsteht ein Eintrag; Erzmark-APP und Erzmark-Launcher sind ausgenommen. Das aktuelle `erzmark.de` läuft laut Projektübersicht als MineTrax/Laravel auf dem Server; dieses Next.js-Repository hat derzeit keine News- oder CMS-Schnittstelle. **Jeden Freitag schreibt ein automatischer Lauf daraus den News-Beitrag und veröffentlicht ihn auf erzmark.de** (siehe „Automatischer Freitags-Beitrag“).

## Eintrag schreiben

Jeder Agent schreibt ausschließlich eigene neue JSON-Dateien nach `devlog/inbox/YYYY-Www/<agent-id>/`. Beispiel: `devlog/inbox/2026-W41/codex/2026-10-11T120000Z-a1b2c3.json`. Keine gemeinsame Datei bearbeiten. ISO-Woche und `date` müssen zusammenpassen. Die Agent-ID besteht aus Kleinbuchstaben, Ziffern und Bindestrichen. Für Claude Code z. B. `claude-code`, für Codex `codex`. Weitere Agenten wählen eine stabile eigene ID.

```json
{
  "schema_version": 1,
  "agent": "codex",
  "date": "2026-10-11",
  "summary": "Das Profilmenü ist leichter zu bedienen",
  "why": "Spieler finden ihre Einstellungen schneller",
  "kind": "changed",
  "status": "done",
  "source": "https://github.com/laurinanoah-rgb/erzmark-website/pull/123"
}
```

`kind` (optional) beschreibt die Art der Änderung: `added` (neu hinzugefügt), `changed` (geändert), `removed` (entfernt), `fixed` (behoben) oder `researched` (untersucht/geplant). Der Wochenartikel gliedert danach in „Neu hinzugefügt“, „Geändert“, „Entfernt“, „Behoben“ und „Untersucht und geplant“; Einträge ohne `kind` erscheinen wie bisher nach Status. Bei neuen Einträgen bitte immer `kind` setzen.

`status` ist `done`, `in_progress` oder `blocked`. `source` ist eine GitHub-Issue-/PR-URL oder `null`. Nur tatsächlich geleistete, öffentlich kommunizierbare Arbeit melden. Keine Zugangsdaten, internen URLs, Spielernamen, privaten Daten, unveröffentlichten Sicherheitsdetails oder Rohlogs eintragen. Der Validator sperrt typische Geheimnis-Muster, ersetzt aber keine menschliche Prüfung. **Das Repository ist öffentlich; auch Entwürfe und Branches sind einsehbar.**

Einträge werden als PR eingebracht. Vorher `python tools/devlog.py check` ausführen. Einträge anderer Agenten nicht umschreiben. Korrekturen als neue Meldung mit erklärendem Text oder im Review abstimmen.

## Automatischer Freitags-Beitrag

Seit Oktober 2026 läuft jeden Freitag ein geplanter Claude-Lauf:

1. Er sammelt mit `python tools/devlog_collect.py` alle Einträge seit dem letzten Beitrag, aus `main` **und** aus allen `devlog/*`-Branches (auch ungemergte PRs). Launcher- und App-Einträge werden ausgefiltert.
2. Er schreibt daraus einen gut lesbaren Spieler-Beitrag nach `docs/DEVLOG_STYLE.md` und legt ihn als `devlog/posts/YYYY-MM-DD.md` (Freitag) auf `main` ab.
3. Die Action `.github/workflows/devlog-publish.yml` kopiert ihn per SSH auf den Webserver und legt mit `tools/minetrax_publish_devlog.php` eine MineTrax-News an (`type: 1` = Dev, Slug `devlog-YYYY-MM-DD`). Erneutes Pushen derselben Datei aktualisiert den Beitrag statt ihn doppelt anzulegen; `draft: true` im Frontmatter macht ihn zum unveröffentlichten Entwurf.

Ohne die Secrets `DEVLOG_SSH_HOST`, `DEVLOG_SSH_USER` und `DEVLOG_SSH_KEY` bleibt der Beitrag nur im Repository liegen. Korrekturen: Datei bearbeiten und pushen, die Action aktualisiert die News.

## Älterer Ablauf: Entwurf und redaktionelle Freigabe

Jeden Freitag um 09:00 UTC erstellt die Action `Weekly agent devlog` aus der aktuellen ISO-Woche ein herunterladbares Artefakt: Markdown-Entwurf, JSON-Export und SHA-256-Prüfsumme. Manuell ist dieselbe Action mit einer ISO-Woche startbar. Der Titel ist nur das Freitag-Datum; die News-Kategorie in MineTrax ist `Dev` (`type: 1`). `DEV-Build` ist die redaktionelle Bezeichnung im Export, kein separates MineTrax-Tag. Der Wochenentwurf wird **nicht** automatisch als PR, GitHub Release oder Website-Post publiziert.

Lokal: `python tools/devlog.py preview 2026-W41 --out devlog-preview`. Die `.md`-Datei ist der gut lesbare Markdown-Text für das MineTrax-Feld `body`: kurze Einleitung, gegliederte Abschnitte und zu jedem Punkt der Nutzen. Titel und Kategorie stehen getrennt im JSON. Die Redaktion prüft Formulierungen, Quellen, Fortschrittsstatus, Lesbarkeit und öffentliche Eignung. Für einen besseren Blogtext darf sie eine gesonderte Fassung schreiben. Diese Fassung muss ebenfalls explizit freigegeben werden; der JSON-Export ist kein Ersatz für redaktionelle Prüfung.

Die Freigabe erfolgt in einem Review-PR mit dokumentiertem Entscheid durch eine berechtigte Person. Danach kann eine Datei `devlog/approvals/YYYY-Www.json` angelegt werden:

```json
{
  "week": "2026-W41",
  "export_sha256": "64-stelliger SHA-256-Wert aus devlog-preview/2026-W41.sha256",
  "approved_by": "github-benutzername",
  "approved_at": "2026-10-11T12:00:00Z",
  "review_url": "https://github.com/laurinanoah-rgb/erzmark-website/pull/123"
}
```

`python tools/devlog.py archive 2026-W41` legt nach gültiger Freigabe `devlog/archive/2026-W41/week.json` und `article.md` an. Der Hash bindet die Freigabe an genau die geprüften Einträge. Das Archiv wird nicht überschrieben; die Inbox wird **nicht gelöscht**. Nachträgliche Änderungen brauchen neue Prüfung und eine bewusst beschlossene Korrektur. Der Archivschritt selbst ist lokal/manuell und schreibt nicht auf GitHub oder die Website.

## Website-Anbindung

Die Live-Seite nutzt MineTrax/Laravel unter `/var/www/minetrax`. Im dortigen `News`-Modell rendert `League\\CommonMark\\GithubFlavoredMarkdownConverter` das Feld `body` als GitHub-Flavored Markdown. Der Admin-Controller speichert `title`, `body`, `type` und `published_at`; `type: 1` ist laut `NewsType` die Kategorie `Dev`, `is_published: false` erzeugt einen unveröffentlichten Entwurf. Das Exportobjekt `minetrax` spiegelt diese Felder. Ein Redakteur überträgt einen freigegebenen Text erst nach separater ausdrücklicher Veröffentlichungsfreigabe über den bestehenden CMS-Prozess. Eine automatische Website-Anbindung braucht vorher einen geprüften Vertrag für Authentifizierung, Entwurfsstatus, Vorschau und Veröffentlichung. Die Action hat bewusst keine Schreibrechte und keine Server-Zugangsdaten.

Für belastbare Freigaben in GitHub: Branchschutz für `main` mit erforderlichem PR-Review und erfolgreicher `validate`-Action aktivieren; Änderungen an `devlog/approvals/**`, `devlog/archive/**`, `tools/devlog.py` und `.github/workflows/**` nur durch verantwortliche Reviewer akzeptieren. GitHub-Einstellungen sind außerhalb dieses Repositories und müssen durch den Eigentümer gesetzt werden.

## JSON-Exportvertrag

`week.json` nutzt `schema_version: 1`, `week` (`YYYY-Www`), `date` (Freitag, ISO-Datum), `title` (nur Datum), `tag: DEV-Build`, `status` (`draft` oder `approved`), `minetrax` und `entries`. `minetrax` enthält `title`, `type: 1`, `body_markdown` und `is_published: false`. Jeder Eintrag enthält die sieben Eingabefelder plus `id` aus dem Dateinamen. Im Archiv steht zusätzlich `approval`. Konsumenten dürfen ausschließlich `status: approved` als freigegeben interpretieren; selbst dann ist eine Veröffentlichung ein separater Schritt.
