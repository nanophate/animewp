"""Verify only the two explicitly requested old release assets before installing."""
import hashlib
import re
from pathlib import Path

directory = Path(__file__).resolve().parents[2] / "artifacts/browser-fixtures"
checksums = {}
for line in (directory / "SHA256SUMS").read_text().splitlines():
    match = re.fullmatch(r"([a-fA-F0-9]{64})\s+\*?(.+)", line)
    if match:
        checksums[match[2]] = match[1].lower()
for name in ("animewp-1.3.0.zip", "animewp-blocks-1.3.0.zip"):
    actual = hashlib.sha256((directory / name).read_bytes()).hexdigest()
    if checksums.get(name) != actual:
        raise SystemExit(f"Old release SHA256 verification failed: {name}")
    print(f"Verified old release asset: {name}")
