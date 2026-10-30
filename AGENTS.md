# Erzmark Agentenkonventionen

Für Website-Code in `apps/web` gelten zusätzlich `apps/web/AGENTS.md` und `apps/web/CLAUDE.md`.

## Pflicht: Devlog nach jeder Erzmark-Arbeit

Nach **jeder inhaltlichen Arbeitssitzung** an Erzmark trägt jeder KI-Agent selbst ein, was er tatsächlich getan hat und warum. Das gilt auch für Recherche, Planung und Fehleranalyse mit einem verwertbaren Ergebnis. Reine Statusabfragen oder Gespräche ohne Projektarbeit brauchen keinen Eintrag. **Erzmark-APP und Erzmark-Launcher sind vollständig ausgenommen.** Keine APP- oder Launcher-Arbeit in einen Wochenbeitrag mischen.

Die gemeinsame Sammelstelle ist dieses GitHub-Repository `laurinanoah-rgb/erzmark-website`, auch wenn die Arbeit in einem anderen Erzmark-Repository stattfindet. Jeder Agent legt eine **neue eigene** Datei unter `devlog/inbox/YYYY-Www/<agent-id>/` an und bringt sie per PR ein. Codex verwendet `codex`, Claude Code `claude-code`; weitere Agenten nutzen eine stabile eigene ID. Das Format und der Freigabeablauf stehen in [devlog/README.md](devlog/README.md). Keine fremden Agentenlogs überschreiben. Keine Secrets, privaten Spielerdaten oder internen Details eintragen. Vor einem PR `python tools/devlog.py check` ausführen. Ist das zentrale Repository nicht erreichbar, den fertigen Eintrag als Entwurf liefern und die ausstehende Übernahme ausdrücklich melden; nicht behaupten, er sei erfasst.

Kein Agent löscht Einträge eigenständig. Der GitHub-Eintrag und die Veröffentlichung auf erzmark.de sind getrennte Schritte. **Veröffentlichen darf ausschließlich der automatische Freitags-Lauf** (vom Eigentümer eingerichtet, siehe [docs/DEVLOG_STYLE.md](docs/DEVLOG_STYLE.md)): Er schreibt `devlog/posts/YYYY-MM-DD.md` auf `main`, die Action `devlog-publish.yml` postet den Beitrag als MineTrax-News. Alle anderen Agenten schreiben nur Inbox-Einträge.
