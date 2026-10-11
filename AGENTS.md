# Erzmark Agentenkonventionen

Für Website-Code in `apps/web` gelten zusätzlich `apps/web/AGENTS.md` und `apps/web/CLAUDE.md`.

## Wöchentliches Devlog

Codex und andere KI-Agenten melden öffentlich geeignete, nachprüfbare Änderungen in je einer neuen Datei unter `devlog/inbox/YYYY-Www/<agent-id>/`. Das Format und der Freigabeablauf stehen in [devlog/README.md](devlog/README.md). Keine fremden Agentenlogs überschreiben. Keine Secrets oder private Spielerdaten eintragen. Vor einem PR `python tools/devlog.py check` ausführen. Nur die Redaktion kann einen Wochenexport freigeben; kein Agent veröffentlicht oder löscht Einträge eigenständig.
