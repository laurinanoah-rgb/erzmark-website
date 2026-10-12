#!/usr/bin/env python3
"""Prepare public-safe weekly devlog drafts. No network or publishing operations."""

import argparse
import hashlib
import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEVLOG = ROOT / "devlog"
ID = re.compile(r"^[a-z][a-z0-9-]{1,39}$")
WEEK = re.compile(r"^\d{4}-W\d{2}$")
SECRET = re.compile(r"(?i)(password|passwd|secret|token|api[_-]?key|private[_-]?key|authorization\s*:|bearer\s+|\.env\b)")
ALLOWED_STATUS = {"done", "in_progress", "blocked"}
FIELDS = {"schema_version", "agent", "date", "summary", "why", "status", "source"}


def week_of(day):
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def parse_week(value):
    if not WEEK.fullmatch(value):
        raise ValueError("week must be ISO YYYY-Www")
    year, week = int(value[:4]), int(value[-2:])
    return date.fromisocalendar(year, week, 1)


def clean_text(value, name):
    if not isinstance(value, str) or not (1 <= len(value.strip()) <= 400):
        raise ValueError(f"{name}: expected 1–400 characters")
    if any(ord(c) < 32 for c in value) or "<" in value or ">" in value or SECRET.search(value):
        raise ValueError(f"{name}: unsafe content; use public, plain text only")
    return value.strip()


def markdown_text(value):
    return re.sub(r"([\\`*_{}\[\]()#+!|>])", r"\\\1", value)


def validate_entry(path, week):
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or set(data) != FIELDS or data["schema_version"] != 1:
        raise ValueError(f"{path}: unexpected schema")
    agent = data["agent"]
    if not isinstance(agent, str) or not ID.fullmatch(agent) or path.parent.name != agent:
        raise ValueError(f"{path}: agent and directory must match")
    day = date.fromisoformat(data["date"])
    if week_of(day) != week:
        raise ValueError(f"{path}: date outside {week}")
    for field in ("summary", "why"):
        data[field] = clean_text(data[field], field)
    if data["status"] not in ALLOWED_STATUS:
        raise ValueError(f"{path}: invalid status")
    source = data["source"]
    if source is not None and (not isinstance(source, str) or not re.fullmatch(
        r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(?:issues|pull)/[1-9]\d*", source
    )):
        raise ValueError(f"{path}: source must be a GitHub issue/PR URL or null")
    return data


def load_week(week):
    parse_week(week)
    folder = DEVLOG / "inbox" / week
    paths = sorted(folder.glob("*/*.json"))
    entries = []
    for path in paths:
        if path.is_symlink() or path.parent.is_symlink():
            raise ValueError(f"{path}: symlinks are forbidden")
        entries.append((path, validate_entry(path, week)))
    return entries


def build(week):
    monday = parse_week(week)
    friday = date.fromordinal(monday.toordinal() + 4).isoformat()
    entries = load_week(week)
    public = [{**item, "id": path.stem} for path, item in entries]
    groups = [
        ("done", "Das ist fertig"),
        ("in_progress", "Daran arbeiten wir"),
        ("blocked", "Das braucht noch Klärung"),
    ]
    lines = []
    if entries:
        lines += ["Diese Woche hat sich bei Erzmark einiges bewegt. Hier sind die Änderungen und der Grund, warum wir daran arbeiten.", ""]
        for status, heading in groups:
            matching = [item for _, item in entries if item["status"] == status]
            if matching:
                lines += [f"## {heading}", ""]
                for item in matching:
                    source = f" [Mehr dazu]({item['source']})." if item["source"] else ""
                    lines += [f"- **{markdown_text(item['summary'])}** — {markdown_text(item['why'])}.{source}"]
                lines.append("")
    else:
        lines += ["Für diese Woche liegen noch keine geprüften Änderungen vor.", ""]
    markdown = "\n".join(lines).rstrip() + "\n"
    export = {
        "schema_version": 1,
        "week": week,
        "date": friday,
        "title": friday,
        "tag": "DEV-Build",
        "status": "draft",
        "minetrax": {"title": friday, "type": 1, "body_markdown": markdown, "is_published": False},
        "entries": public,
    }
    return export, markdown


def digest(export):
    return hashlib.sha256(json.dumps(export, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def write_preview(week, out):
    export, markdown = build(week)
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{week}.json").write_text(json.dumps(export, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / f"{week}.md").write_text(markdown, encoding="utf-8")
    (out / f"{week}.sha256").write_text(digest(export) + "\n", encoding="ascii")


def approve_archive(week):
    export, markdown = build(week)
    if not export["entries"]:
        raise ValueError("empty week cannot be archived")
    approval_path = DEVLOG / "approvals" / f"{week}.json"
    approval = json.loads(approval_path.read_text(encoding="utf-8"))
    if set(approval) != {"week", "export_sha256", "approved_by", "approved_at", "review_url"}:
        raise ValueError("invalid approval record")
    if approval["week"] != week or approval["export_sha256"] != digest(export):
        raise ValueError("approval does not match current weekly export")
    if not re.fullmatch(r"[A-Za-z0-9-]{1,39}", approval["approved_by"]):
        raise ValueError("invalid approver")
    datetime.fromisoformat(approval["approved_at"].replace("Z", "+00:00"))
    if not re.fullmatch(r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/pull/[1-9]\d*", approval["review_url"]):
        raise ValueError("review_url must point to a GitHub PR")
    folder = DEVLOG / "archive" / week
    if folder.exists():
        raise ValueError("archive is immutable; week already exists")
    folder.mkdir(parents=True)
    export["status"] = "approved"
    export["approval"] = approval
    (folder / "week.json").write_text(json.dumps(export, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (folder / "article.md").write_text(markdown, encoding="utf-8")
    # Inbox entries remain intact. Publication requires a separate, explicit website step.


def check_archive(week):
    folder = DEVLOG / "archive" / week
    archived = json.loads((folder / "week.json").read_text(encoding="utf-8"))
    current, markdown = build(week)
    approval = json.loads((DEVLOG / "approvals" / f"{week}.json").read_text(encoding="utf-8"))
    if approval.get("export_sha256") != digest(current):
        raise ValueError(f"{week}: approval hash no longer matches inbox")
    current["status"] = "approved"
    current["approval"] = approval
    if archived != current:
        raise ValueError(f"{week}: archived JSON differs from approved entries")
    if (folder / "article.md").read_text(encoding="utf-8") != markdown:
        raise ValueError(f"{week}: archived article differs from approved entries")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    preview = sub.add_parser("preview")
    preview.add_argument("week")
    preview.add_argument("--out", type=Path, default=ROOT / "devlog-preview")
    archive = sub.add_parser("archive")
    archive.add_argument("week")
    check = sub.add_parser("check")
    args = parser.parse_args()
    try:
        if args.command == "check":
            for folder in sorted((DEVLOG / "inbox").glob("*")):
                if folder.is_dir():
                    load_week(folder.name)
            for folder in sorted((DEVLOG / "archive").glob("*")):
                if folder.is_dir():
                    check_archive(folder.name)
        elif args.command == "preview":
            write_preview(args.week, args.out)
        else:
            approve_archive(args.week)
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        parser.exit(1, f"devlog: {exc}\n")


if __name__ == "__main__":
    main()
