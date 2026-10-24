#!/usr/bin/env python3
"""Sammelt Devlog-Einträge für den Freitags-Beitrag.

Liest alle JSON-Einträge unter devlog/inbox/ aus dem aktuellen Stand UND aus
allen Remote-Branches origin/devlog/* (dort liegen oft noch ungemergte
Einträge). Gibt nur Einträge seit dem letzten veröffentlichten Beitrag
(devlog/posts/YYYY-MM-DD.md) zurück und filtert Launcher/App heraus.

Beispiel:
    git fetch origin '+refs/heads/devlog/*:refs/remotes/origin/devlog/*'
    python tools/devlog_collect.py --until 2026-10-30 > entries.json
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS = ROOT / "devlog" / "posts"
EXCLUDE = re.compile(r"(?i)\b(launcher|erzmark[- ]?app|android[- ]?app|companion[- ]?app|die app|der app|app-)")


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], check=True, capture_output=True, text=True).stdout


def refs():
    out = ["HEAD"]
    for line in git("for-each-ref", "--format=%(refname)", "refs/remotes/origin/devlog").splitlines():
        out.append(line.strip())
    return out


def last_post_date():
    dates = [date.fromisoformat(p.stem) for p in POSTS.glob("*.md") if re.fullmatch(r"\d{4}-\d{2}-\d{2}", p.stem)]
    return max(dates) if dates else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", help="erstes Datum (inklusive); Standard: Tag nach letztem Beitrag, sonst 7 Tage vor --until")
    ap.add_argument("--until", default=date.today().isoformat(), help="letztes Datum (inklusive)")
    args = ap.parse_args()
    until = date.fromisoformat(args.until)
    if args.since:
        since = date.fromisoformat(args.since)
    else:
        last = last_post_date()
        since = last + timedelta(days=1) if last else until - timedelta(days=7)

    seen, entries, skipped = set(), [], []
    for ref in refs():
        try:
            names = git("ls-tree", "-r", "--name-only", ref, "--", "devlog/inbox").splitlines()
        except subprocess.CalledProcessError:
            continue
        for name in names:
            if not name.endswith(".json") or name in seen:
                continue
            seen.add(name)
            try:
                data = json.loads(git("show", f"{ref}:{name}"))
                day = date.fromisoformat(data["date"])
            except Exception as exc:  # kaputter Eintrag: melden, nicht abbrechen
                skipped.append({"path": name, "reason": f"ungültig: {exc}"})
                continue
            if not (since <= day <= until):
                continue
            text = f"{data.get('summary', '')} {data.get('why', '')}"
            if EXCLUDE.search(text):
                skipped.append({"path": name, "reason": "Launcher/App ausgeschlossen"})
                continue
            data["_path"] = name
            data["_ref"] = ref.replace("refs/remotes/", "")
            entries.append(data)

    entries.sort(key=lambda e: (e["date"], e["_path"]))
    json.dump({"since": since.isoformat(), "until": until.isoformat(), "count": len(entries),
               "entries": entries, "skipped": skipped}, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
