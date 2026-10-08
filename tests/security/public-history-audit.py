#!/usr/bin/env python3
"""Reviewed draft: private, read-only, reachable-history publication audit.

Only report/*.json may leave the ephemeral runner. No source checkout from an
unreviewed ref is executed. All failure messages use fixed labels, not source.
A clean secret scan is evidence for review, not permission to publish.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import urllib.request

REPO = 'nanophate/animewp'
GIT_URL = 'https://github.com/nanophate/animewp.git'
VERSION = '8.30.1'
UPSTREAM_COMMIT = '83d9cd684c87d95d656c1458ef04895a7f1cbd8e'
ARCHIVE = 'gitleaks_8.30.1_linux_x64.tar.gz'
ARCHIVE_SHA256 = '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb'
CHECKSUMS_SHA256 = '061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae'
CONFIG_SHA256 = 'e163e53b9e7e8a8511e77271e2b323ed057759542a6d988258afe3a1fa329caf'
REF_PATTERNS = ('refs/heads/*', 'refs/tags/*', 'refs/pull/*/head', 'refs/pull/*/merge')
SHA = re.compile(r'[0-9a-f]{40}')
MAX_OBJECT_BYTES = 128 * 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024

class AuditError(RuntimeError):
    pass

def require(value, message):
    if not value:
        raise AuditError(message)

def digest(value):
    return hashlib.sha256(value).hexdigest()

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=True, indent=2) + '\n')

def safe_env():
    # No job tokens, Git credentials, external filters, tracing, or user config.
    env = {key: os.environ[key] for key in ('PATH', 'LANG', 'LC_ALL', 'TMPDIR') if key in os.environ}
    env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_TERMINAL_PROMPT='0', GIT_NO_REPLACE_OBJECTS='1')
    return env

def command(args, label, *, env=None, data=None, codes=(0,), timeout=600):
    try:
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, env=env or safe_env(), timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AuditError(label + ': could not finish') from error
    require(result.returncode in codes, label + ': command failed')
    return result

def git(repo, *args, **options):
    return command(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'core.attributesFile=/dev/null',
                    '-c', 'diff.external=', '-C', str(repo), *args], 'Git data collection', **options).stdout

class HTTPSOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        require(newurl.startswith('https://'), 'Download redirected away from HTTPS')
        return super().redirect_request(request, response, code, message, headers, newurl)

def fetch(url, expected=None, *, token=None, limit=32 * 1024 * 1024):
    require(url.startswith('https://'), 'Download must use HTTPS')
    request = urllib.request.Request(url, headers={'User-Agent': 'animewp-private-publication-audit'})
    if token:
        require(url.startswith('https://api.github.com/repos/nanophate/animewp'), 'Unexpected authenticated endpoint')
        request.add_unredirected_header('Authorization', 'Bearer ' + token)
        request.add_header('Accept', 'application/vnd.github+json')
        request.add_header('X-GitHub-Api-Version', '2022-11-28')
    try:
        with urllib.request.build_opener(HTTPSOnly()).open(request, timeout=60) as response:
            content = response.read(limit + 1)
    except Exception as error:
        raise AuditError('Required download failed') from error
    require(len(content) <= limit, 'Download exceeded reviewed size limit')
    if expected:
        require(digest(content) == expected, 'Pinned download checksum differs')
    return content

def advertised(env):
    raw = command(['git', 'ls-remote', '--refs', GIT_URL, *REF_PATTERNS],
                  'Advertised refs', env=env).stdout
    refs = {}
    for line in raw.splitlines():
        oid, name = line.split(b'\t', 1)
        require(SHA.fullmatch(oid.decode('ascii')), 'Invalid advertised object id')
        refs[name.decode('utf-8', errors='surrogateescape')] = oid.decode('ascii')
    require('refs/heads/main' in refs, 'Main is not advertised')
    return refs

def materialize(repo, root):
    raw_ids = git(repo, 'rev-list', '--objects', '--all', '--no-object-names', '--missing=print')
    ids = set(raw_ids.decode('ascii').splitlines())
    # Explicitly retain annotated tag objects, in addition to their peeled history.
    ids.update(git(repo, 'for-each-ref', '--format=%(objectname)').decode('ascii').splitlines())
    require(ids and all(SHA.fullmatch(oid) for oid in ids), 'Missing or invalid reachable object')
    payload = ('\n'.join(sorted(ids)) + '\n').encode('ascii')
    inventory = git(repo, 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)', data=payload)
    counts, total, records = {}, 0, []
    text_dir = root / 'scan-text' / 'objects'
    text_dir.mkdir(parents=True)
    raw_dir = root / 'private' / 'objects'
    raw_dir.mkdir(parents=True)
    lookup = {}
    identities = {}
    binary_ids, lfs_ids, archive_ids, gitlinks = [], [], [], []
    privacy = []
    for line in inventory.decode('ascii').splitlines():
        oid, kind, size_raw = line.split(' ')
        size = int(size_raw)
        require(size <= MAX_OBJECT_BYTES, 'Object exceeds coverage limit; manual continuation required')
        total += size
        require(total <= MAX_TOTAL_BYTES, 'History exceeds coverage limit; manual continuation required')
        counts[kind] = counts.get(kind, 0) + 1
        records.append({'oid': oid, 'type': kind, 'bytes': size})
        if kind == 'tree':
            entries = git(repo, 'ls-tree', '-z', oid)
            for item in entries.split(b'\0'):
                if not item:
                    continue
                meta, path = item.split(b'\t', 1)
                mode, child_kind, child_oid = meta.decode('ascii').split(' ')
                lookup.setdefault(child_oid, []).append({'tree': oid, 'name_bytes_hex': path.hex(), 'mode': mode})
                if mode == '160000':
                    gitlinks.append(child_oid)
                if re.search(rb'(?i)(?:^|[./_-])(?:secret|credential|password|passwd|wp-config|backup|dump|\.env)(?:$|[./_-])|\.(?:pem|key|p12|pfx|sql|sqlite|db)$', path):
                    privacy.append({'category': 'sensitive-filename', 'object': child_oid, 'parent_tree': oid})
            continue
        if kind not in ('blob', 'commit', 'tag'):
            raise AuditError('Unexpected object type')
        content = git(repo, 'cat-file', kind, oid)
        require(len(content) == size, 'Object size differs')
        (raw_dir / oid).write_bytes(content)
        binary = b'\0' in content
        if binary:
            binary_ids.append(oid)
        if content.startswith(b'version https://git-lfs.github.com/spec/v1\n'):
            lfs_ids.append(oid)
        if content.startswith((b'PK\x03\x04', b'PK\x05\x06', b'\x1f\x8b', b'7z\xbc\xaf\x27\x1c', b'Rar!')):
            archive_ids.append(oid)
        # Every raw object is preserved locally; a text view also exposes ASCII
        # and UTF-16 strings from binaries without executing or extracting them.
        text = re.sub(rb'[^\x09\x0a\x0d\x20-\x7e]+', b' ', content).decode('ascii')
        if binary:
            for pattern, encoding in ((rb'(?:[\x20-\x7e]\x00){6,}', 'utf-16-le'),
                                      (rb'(?:\x00[\x20-\x7e]){6,}', 'utf-16-be')):
                for match in re.finditer(pattern, content):
                    text += '\n' + match.group().decode(encoding) + '\n'
        (text_dir / f'{kind}-{oid}.txt').write_text(text)
        for label, pattern in (
            ('credential-url', rb'https?://[^\s/@:]+:[^\s/@]+@'),
            ('private-ip-or-host', rb'\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b|(?i:[a-z0-9.-]+\.(?:internal|local))\b'),
            ('database-dump', rb'(?i)(?:CREATE TABLE|INSERT INTO)\s+[`\"]?(?:wp_users|users|customers|wp_usermeta)\b'),
        ):
            hits = list(re.finditer(pattern, content))
            if hits:
                privacy.append({'category': label, 'object': oid, 'type': kind, 'count': len(hits)})
        email_counts = {}
        for match in re.finditer(rb'(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', content):
            domain = match.group().rsplit(b'@', 1)[1].lower()
            if domain in (b'users.noreply.github.com', b'noreply.github.com'):
                label = 'github-noreply-email'
            elif domain in (b'example.com', b'example.org', b'example.net') or domain.endswith((b'.invalid', b'.test', b'.example')):
                label = 'example-email'
            else:
                label = 'email-requiring-owner-review'
            email_counts[label] = email_counts.get(label, 0) + 1
        for label, count in sorted(email_counts.items()):
            privacy.append({'category': label, 'object': oid, 'type': kind, 'count': count})
        if kind in ('commit', 'tag'):
            for role, identity in re.findall(rb'^(author|committer|tagger) (.+?) \d+ [+-]\d{4}$', content, re.M):
                ident = digest(identity)
                record = identities.setdefault(ident, {'identity_sha256': ident, 'objects': [], 'roles': []})
                if oid not in record['objects']:
                    record['objects'].append(oid)
                if role.decode() not in record['roles']:
                    record['roles'].append(role.decode())
    write_json(root / 'private' / 'object-path-lookup.json', lookup)
    write_json(root / 'report' / 'object-inventory.json', records)
    write_json(root / 'report' / 'privacy-candidates.json', privacy)
    write_json(root / 'report' / 'identity-inventory.json', list(identities.values()))
    return {'object_counts': counts, 'total_object_bytes': total, 'unique_identity_count': len(identities),
            'binary_objects': binary_ids, 'archive_objects_requiring_review': archive_ids,
            'lfs_pointer_objects_requiring_fetch': lfs_ids, 'submodule_commits_requiring_separate_audit': sorted(set(gitlinks))}

def collect(root, expected_main):
    require(SHA.fullmatch(expected_main) and expected_main != '0' * 40, 'Set the reviewed merge SHA before execution')
    require(not root.exists(), 'Audit data directory must be new')
    root.mkdir(parents=True, mode=0o700)
    token = os.environ.get('GITHUB_TOKEN', '')
    require(token, 'Read-only repository token is unavailable')
    repository = json.loads(fetch('https://api.github.com/repos/nanophate/animewp', token=token))
    require(repository.get('private') is True, 'This audit is restricted to the private repository')
    env = safe_env()
    env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
               GIT_CONFIG_VALUE_0='AUTHORIZATION: basic ' + base64.b64encode(('x-access-token:' + token).encode()).decode())
    before = advertised(env)
    require(before['refs/heads/main'] == expected_main, 'Main changed from reviewed merge SHA')
    repo = root / 'private' / 'repo.git'
    repo.parent.mkdir()
    command(['git', '-c', 'core.hooksPath=/dev/null', 'clone', '--mirror', '--quiet', GIT_URL, str(repo)],
            'Mirror fetch', env=env)
    # A separate explicit refspec prevents treating checkout/all-branches as PR coverage.
    git(repo, 'fetch', '--quiet', '--prune', '--force', 'origin',
        '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*',
        '+refs/pull/*/head:refs/pull/*/head', '+refs/pull/*/merge:refs/pull/*/merge', env=env)
    after = advertised(env)
    require(before == after, 'Remote refs changed during collection; repeat from a fresh directory')
    for name, oid in after.items():
        require(git(repo, 'rev-parse', '--verify', name).decode().strip() == oid, 'Advertised ref was not fetched exactly')
    require(git(repo, 'rev-parse', '--is-shallow-repository').strip() == b'false', 'Shallow history is insufficient')
    git(repo, 'fsck', '--full', '--no-reflogs')
    # Reconstructable location map remains private on the runner, never an artifact.
    write_json(root / 'private' / 'refs.json', after)
    refs = [{'category': 'head' if name.startswith('refs/heads/') else 'tag' if name.startswith('refs/tags/') else 'pull',
             'name_sha256': digest(name.encode('utf-8', errors='surrogateescape')), 'oid': oid}
            for name, oid in sorted(after.items())]
    coverage = materialize(repo, root)
    coverage.update(expected_main=expected_main, advertised_ref_count=len(after), refs=refs,
                    reachable_commit_count=int(git(repo, 'rev-list', '--all', '--count').strip()),
                    state='collected', detector_version=VERSION,
                    limits=['Only fetched reachable Git objects; not server-unreachable/cached objects or external forks.',
                            'LFS payloads, submodules, encrypted/embedded binary content require follow-up.',
                            'Issues, PR discussion, Release text/assets, Actions logs/artifacts, wiki are separate surfaces.',
                            'Pattern detectors cannot establish that all prose, names, media or licensed content may be published.'])
    write_json(root / 'report' / 'coverage.json', coverage)
    print('Git history collected; coverage and private-data candidates recorded without values.')

def detector(root):
    tools = root / 'private' / 'tools'
    tools.mkdir(parents=True, exist_ok=True)
    url = f'https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/'
    checksums = fetch(url + f'gitleaks_{VERSION}_checksums.txt', CHECKSUMS_SHA256, limit=16384)
    require(f'{ARCHIVE_SHA256}  {ARCHIVE}\n'.encode() in checksums, 'Upstream checksum entry differs')
    archive = tools / ARCHIVE
    archive.write_bytes(fetch(url + ARCHIVE, ARCHIVE_SHA256))
    with tarfile.open(archive, mode='r:gz') as tar:
        member = tar.getmember('gitleaks')
        require(member.isfile() and member.size <= 64 * 1024 * 1024, 'Unexpected detector binary')
        executable = tools / 'gitleaks'
        executable.write_bytes(tar.extractfile(member).read())
        executable.chmod(0o700)
    raw = fetch(f'https://raw.githubusercontent.com/gitleaks/gitleaks/{UPSTREAM_COMMIT}/config/gitleaks.toml', CONFIG_SHA256)
    config_text = raw.decode('utf-8')
    require(tomllib.loads(config_text)['allowlist'].get('paths'), 'Unexpected upstream allowlist layout')
    # Keep reviewed rule/known-placeholder allowlists; remove broad file-path
    # skips (SVG, lockfiles, binaries, dependencies). No repository rules used.
    config_text, count = re.subn(r'(?ms)^paths = \[\n.*?^\]\n', 'paths = []\n', config_text, count=1)
    require(count == 1 and tomllib.loads(config_text)['allowlist']['paths'] == [], 'Could not remove global path skips')
    config = tools / 'audit-rules.toml'
    config.write_text(config_text)
    empty_ignore = tools / 'empty-ignore'
    empty_ignore.write_text('')
    require(command([str(executable), 'version'], 'Detector version').stdout.strip().decode() == VERSION, 'Detector version differs')
    return executable, config, empty_ignore

def run_scan(root, mode, source, name, detector_paths):
    executable, config, ignore = detector_paths
    report = root / 'private' / f'{name}-findings.json'
    args = [str(executable), mode, str(source), '--config', str(config),
            '--gitleaks-ignore-path', str(ignore), '--ignore-gitleaks-allow', '--redact=100',
            '--no-banner', '--no-color', '--log-level=error', '--max-target-megabytes=0',
            '--max-decode-depth=5', '--exit-code=23', '--report-format=json', '--report-path', str(report),
            '--timeout=900']
    if mode == 'git':
        args += ['--log-opts=--all --full-history -m --no-ext-diff --no-textconv --no-renames']
    result = command(args, 'Secret scan ' + name, codes=(0, 23), timeout=960)
    require(report.is_file(), 'Detector did not produce a complete report')
    findings = json.loads(report.read_text())
    require(isinstance(findings, list), 'Detector report has unexpected shape')
    require((result.returncode == 23) == bool(findings), 'Detector exit status and findings disagree')
    safe = []
    for finding in findings:
        file = str(finding.get('File', ''))
        object_match = re.search(r'(?:blob|commit|tag)-([0-9a-f]{40})\.txt', file)
        rule = str(finding.get('RuleID', ''))
        require(re.fullmatch(r'[a-zA-Z0-9_-]+', rule), 'Unexpected detector rule identifier')
        entry = {'rule': rule, 'path_sha256': digest(file.encode()),
                 'start_line': int(finding.get('StartLine', 0)), 'end_line': int(finding.get('EndLine', 0))}
        if object_match:
            entry['object'] = object_match[1]
        metadata_match = re.search(r'(?:^|[/\\])([0-9a-f]{64})\.txt$', file)
        if name == 'metadata' and metadata_match:
            # SHA256 of the collector's relative source filename; the collector
            # maps this identifier to safe GitHub surface IDs without raw text.
            entry['source_id'] = metadata_match[1]
        commit = str(finding.get('Commit', ''))
        if SHA.fullmatch(commit):
            entry['commit'] = commit
        safe.append(entry)
    write_json(root / 'report' / f'{name}-findings-redacted.json', safe)
    return len(safe)

def scan(root):
    coverage_path = root / 'report' / 'coverage.json'
    coverage = json.loads(coverage_path.read_text())
    require(coverage['state'] == 'collected', 'Complete Git collection is required')
    paths = detector(root)
    results = {'history_patch_findings': run_scan(root, 'git', root / 'private' / 'repo.git', 'git-history', paths),
               'object_text_findings': run_scan(root, 'dir', root / 'scan-text', 'object-text', paths)}
    privacy = json.loads((root / 'report' / 'privacy-candidates.json').read_text())
    actionable_privacy = [item for item in privacy if item['category'] not in ('github-noreply-email', 'example-email')]
    unresolved = bool(coverage['archive_objects_requiring_review'] or coverage['lfs_pointer_objects_requiring_fetch']
                      or coverage['submodule_commits_requiring_separate_audit'])
    coverage.update(state='scanned', **results, private_data_candidate_count=len(privacy),
                    manual_review_required=bool(any(results.values()) or actionable_privacy or unresolved))
    write_json(coverage_path, coverage)
    print('Reachable-history secret scan complete; inspect redacted counts and review candidates.')
    if any(results.values()) or unresolved:
        raise AuditError('Findings or unresolved coverage remain; public decision must stay pending')

def scan_directory(root, source):
    # A separately authorized metadata job can write text files locally and use
    # this same detector. Stage under hash filenames so source-controlled
    # .gitleaksignore or nested symlinks cannot suppress or redirect a scan.
    root.mkdir(parents=True, exist_ok=True)
    stage = root / 'metadata-text'
    stage.mkdir()
    lookup = {}
    for path in source.rglob('*'):
        require(not path.is_symlink(), 'Metadata input contains a symlink')
        if path.is_file():
            data = path.read_bytes()
            require(len(data) <= MAX_OBJECT_BYTES, 'Metadata file exceeds reviewed limit')
            ident = digest(str(path.relative_to(source)).encode())
            (stage / f'{ident}.txt').write_bytes(data)
            lookup[ident] = str(path.relative_to(source))
    write_json(root / 'private' / 'metadata-path-lookup.json', lookup)
    count = run_scan(root, 'dir', stage, 'metadata', detector(root))
    print('Metadata secret scan complete; redacted locations recorded.')
    if count:
        raise AuditError('Metadata findings require review')


def summary(root):
    # Each permitted producer emits only validated rule IDs, hashes, line/count
    # numbers, fixed labels and fixed coverage limitations. No raw log, match,
    # author name/email, path, remote ref name, URL or source content is read.
    names = ('coverage.json', 'git-history-findings-redacted.json',
             'object-text-findings-redacted.json', 'metadata-findings-redacted.json',
             'privacy-candidates.json', 'object-inventory.json', 'identity-inventory.json')
    reports = {name: json.loads((root / 'report' / name).read_text())
               for name in names if (root / 'report' / name).is_file()}
    require(reports, 'No safe audit evidence was produced')
    encoded = json.dumps({'schema_version': 1, 'reports': reports}, ensure_ascii=True, separators=(',', ':'))
    if len(encoded.encode()) <= 190000:
        print('ANIMEWP_AUDIT_REDACTED_JSON_BEGIN')
        print(encoded)
        print('ANIMEWP_AUDIT_REDACTED_JSON_END')
    else:
        coverage = reports.get('coverage.json', {})
        print(json.dumps({'schema_version': 1, 'artifact_required': True,
                          'reason': 'Complete redacted evidence exceeds the 190000-byte log budget',
                          'complete_report_bytes': len(encoded.encode()),
                          'summary': {key: coverage.get(key) for key in ('state', 'expected_main',
                              'advertised_ref_count', 'reachable_commit_count', 'object_counts',
                              'history_patch_findings', 'object_text_findings', 'private_data_candidate_count',
                              'manual_review_required')},
                          'report_items': {key: len(value) for key, value in reports.items() if isinstance(value, list)}},
                         separators=(',', ':')))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('collect', 'scan', 'scan-directory', 'summary', 'cleanup'))
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--expected-main', default='')
    parser.add_argument('--source', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    require(root.name.startswith('animewp-public-audit'), 'Use a dedicated audit directory')
    if args.mode == 'collect':
        collect(root, args.expected_main)
    elif args.mode == 'scan':
        scan(root)
    elif args.mode == 'summary':
        summary(root)
    elif args.mode == 'scan-directory':
        require(args.source and args.source.is_dir(), 'Metadata source directory is required')
        scan_directory(root, args.source.resolve())
    else:
        # Root is a dedicated ephemeral directory; never remove a git checkout.
        require(not (root / '.git').exists(), 'Cleanup cannot target a repository checkout')
        for name in ('private', 'scan-text', 'metadata-text'):
            shutil.rmtree(root / name, ignore_errors=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never leak subprocess stderr, matched text, remote paths, API bodies,
        # exception reprs, or a traceback into retained Actions logs.
        print('Audit failed: ' + (str(error) if isinstance(error, AuditError) else 'Internal audit error'), file=sys.stderr)
        sys.exit(1)
