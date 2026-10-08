"""Installation archives must contain every declared runtime asset."""
import copy
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import package


class PackageAssetsTests(unittest.TestCase):
    def test_metadata_file_references_include_arrays_and_script_manifests(self):
        with tempfile.TemporaryDirectory(prefix="animewp-metadata-") as directory:
            source = Path(directory)
            metadata = source / "src/blocks/example/block.json"
            metadata.parent.mkdir(parents=True)
            metadata.write_text(json.dumps({
                "editorScript": ["file:./editor.js", "wp-blocks"],
                "viewScriptModule": "file:./view.js",
                "style": ["file:./style.css", "animewp-blocks-style"],
                "editorStyle": "file:../shared.css",
                "render": "file:./render.php",
            }), encoding="utf-8")
            expected = {
                "build/blocks/example/block.json",
                "build/blocks/example/editor.js", "build/blocks/example/editor.asset.php",
                "build/blocks/example/view.js", "build/blocks/example/view.asset.php",
                "build/blocks/example/style.css", "build/blocks/shared.css",
                "build/blocks/example/render.php",
                "languages/animewp-blocks-ja.mo", "languages/animewp-blocks-ja.po",
                "includes/distribution-updater.php",
                *(f"build/motion/{name}" for name in package.MOTION_FILES),
            }
            self.assertEqual(set(package.plugin_installation_files(source)), expected)
            for reference in ("file:", "file:/outside.js", "file:../../../../outside.js", "file:../../../"):
                with self.subTest(reference=reference):
                    metadata.write_text(json.dumps({"editorScript": reference}), encoding="utf-8")
                    with self.assertRaisesRegex(ValueError, "Unsafe block file reference"):
                        package.plugin_installation_files(source)

    def test_zip_rejects_each_missing_installation_asset(self):
        source = ROOT / "plugins/animewp-blocks"
        required = package.plugin_installation_files(source)
        complete = package.build_archive("animewp-blocks", source)
        package.inspect_archive(complete, "animewp-blocks", required)
        with zipfile.ZipFile(io.BytesIO(complete)) as original:
            for missing in required:
                with self.subTest(missing=missing):
                    buffer = io.BytesIO()
                    with zipfile.ZipFile(buffer, "w") as archive:
                        for info in original.infolist():
                            if info.filename != f"animewp-blocks/{missing}":
                                archive.writestr(copy.copy(info), original.read(info.filename))
                    with self.assertRaisesRegex(ValueError, "Missing installation file: " + re.escape(missing)):
                        package.inspect_archive(buffer.getvalue(), "animewp-blocks", required)

    def test_static_audit_rejects_new_block_and_motion_asset_loss(self):
        # Never remove files from the working build: each mutation is isolated.
        with tempfile.TemporaryDirectory(prefix="animewp-installation-") as directory:
            root = Path(directory) / "repo"
            shutil.copytree(ROOT, root, ignore=shutil.ignore_patterns(
                ".git", ".testenv", "node_modules", "vendor", "artifacts", "__pycache__",
            ))

            def audit():
                return subprocess.run(
                    [sys.executable, str(root / "tests/static_check.py")],
                    cwd=root, text=True, capture_output=True, check=False,
                )

            baseline = audit()
            self.assertEqual(baseline.returncode, 0, baseline.stdout + baseline.stderr)
            missing_files = (
                "build/blocks/carousel/index.js",
                "build/blocks/decoration/index.asset.php",
                "build/blocks/video-card/view.js",
                "build/blocks/backdrop/style-index.css",
                "build/motion/editor.js",
                "build/motion/view.asset.php",
                "build/motion/style-style.css",
                "includes/distribution-updater.php",
            )
            for missing in missing_files:
                with self.subTest(missing=missing):
                    path = root / "plugins/animewp-blocks" / missing
                    content = path.read_bytes()
                    path.unlink()
                    try:
                        result = audit()
                        self.assertNotEqual(result.returncode, 0)
                        self.assertIn(f"Missing installation file: {missing}", result.stderr)
                    finally:
                        path.write_bytes(content)


if __name__ == "__main__":
    unittest.main()
