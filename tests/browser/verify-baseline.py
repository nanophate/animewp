"""Choose and verify the published release that the browser upgrade test starts from.

  select  Read release tags (one per line) on stdin and print the newest
          stable vX.Y.Z that is not newer than the source under test, so a
          version bump upgrades from the previous release and other changes
          replace the current release's ZIPs.
  verify  Check the two downloaded installation ZIPs against that release's
          SHA256SUMS and record the version for the upgrade fixture.
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
directory = ROOT / "artifacts/browser-fixtures"


def version_tuple(text):
    return tuple(int(part) for part in text.split("."))


def select():
    current = re.search(r"^Version: (\d+\.\d+\.\d+)$", (ROOT / "themes/animewp/style.css").read_text(), re.M).group(1)
    stable = [line.strip()[1:] for line in sys.stdin if re.fullmatch(r"v\d+\.\d+\.\d+", line.strip())]
    candidates = [tag for tag in stable if version_tuple(tag) <= version_tuple(current)]
    if not candidates:
        raise SystemExit(f"No published release at or below {current} to upgrade from")
    print(max(candidates, key=version_tuple))


def verify(version):
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise SystemExit(f"Invalid baseline version: {version}")
    checksums = {}
    for line in (directory / "SHA256SUMS").read_text().splitlines():
        match = re.fullmatch(r"([a-fA-F0-9]{64})\s+\*?(.+)", line)
        if match:
            checksums[match[2]] = match[1].lower()
    for name in (f"animewp-{version}.zip", f"animewp-blocks-{version}.zip"):
        actual = hashlib.sha256((directory / name).read_bytes()).hexdigest()
        if checksums.get(name) != actual:
            raise SystemExit(f"Baseline release SHA256 verification failed: {name}")
        print(f"Verified baseline release asset: {name}")
    (directory / "baseline-version.txt").write_text(version + "\n")


if __name__ == "__main__":
    if sys.argv[1:2] == ["select"]:
        select()
    elif len(sys.argv) == 3 and sys.argv[1] == "verify":
        verify(sys.argv[2])
    else:
        raise SystemExit(__doc__)
