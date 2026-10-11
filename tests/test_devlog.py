import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SPEC = importlib.util.spec_from_file_location("devlog_tool", Path(__file__).resolve().parents[1] / "tools" / "devlog.py")
tool = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tool)


class DevlogTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1])
        self.addCleanup(self.temp.cleanup)
        self.old_devlog = tool.DEVLOG
        tool.DEVLOG = Path(self.temp.name) / "devlog"
        self.addCleanup(lambda: setattr(tool, "DEVLOG", self.old_devlog))
        self.entry_path = tool.DEVLOG / "inbox" / "2026-W41" / "codex" / "2026-10-09T120000Z-abc.json"
        self.entry_path.parent.mkdir(parents=True)
        self.entry = {
            "schema_version": 1,
            "agent": "codex",
            "date": "2026-10-09",
            "summary": "Profilmenü verbessert",
            "why": "Einstellungen sind leichter zu finden",
            "status": "done",
            "source": None,
        }
        self.save()

    def save(self):
        self.entry_path.write_text(json.dumps(self.entry), encoding="utf-8")

    def test_preview_has_date_title_and_machine_export(self):
        export, article = tool.build("2026-W41")
        self.assertEqual(export["title"], "2026-10-09")
        self.assertEqual(export["tag"], "DEV-Build")
        self.assertEqual(export["entries"][0]["id"], self.entry_path.stem)
        self.assertTrue(article.startswith("# 2026-10-09\n"))
        self.assertNotIn("# 41", article)

    def test_rejects_secret_and_wrong_week(self):
        self.entry["summary"] = "API token updated"
        self.save()
        with self.assertRaises(ValueError):
            tool.build("2026-W41")
        self.entry["summary"] = "Profilmenü verbessert"
        self.entry["date"] = "2026-10-02"
        self.save()
        with self.assertRaises(ValueError):
            tool.build("2026-W41")

    def test_archive_needs_matching_approval_and_keeps_inbox(self):
        export, _ = tool.build("2026-W41")
        approval_path = tool.DEVLOG / "approvals" / "2026-W41.json"
        approval_path.parent.mkdir(parents=True)
        approval = {
            "week": "2026-W41",
            "export_sha256": "0" * 64,
            "approved_by": "reviewer",
            "approved_at": "2026-10-11T12:00:00Z",
            "review_url": "https://github.com/laurinanoah-rgb/erzmark-website/pull/123",
        }
        approval_path.write_text(json.dumps(approval), encoding="utf-8")
        with self.assertRaises(ValueError):
            tool.approve_archive("2026-W41")
        self.assertFalse((tool.DEVLOG / "archive" / "2026-W41").exists())
        approval["export_sha256"] = tool.digest(export)
        approval_path.write_text(json.dumps(approval), encoding="utf-8")
        tool.approve_archive("2026-W41")
        archived = json.loads((tool.DEVLOG / "archive" / "2026-W41" / "week.json").read_text(encoding="utf-8"))
        self.assertEqual(archived["status"], "approved")
        tool.check_archive("2026-W41")
        self.assertTrue(self.entry_path.exists())
        with self.assertRaises(ValueError):
            tool.approve_archive("2026-W41")
        self.entry["why"] = "Eine andere Begründung"
        self.save()
        with self.assertRaises(ValueError):
            tool.check_archive("2026-W41")


if __name__ == "__main__":
    unittest.main()
