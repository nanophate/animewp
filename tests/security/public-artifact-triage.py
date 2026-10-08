#!/usr/bin/env python3
"""Read two old verification assets and report structure-only finding evidence."""
import argparse
import bisect
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import zipfile

spec = importlib.util.spec_from_file_location('surface_audit', Path(__file__).with_name('public-surface-audit.py'))
surface = importlib.util.module_from_spec(spec)
spec.loader.exec_module(surface)
ASSETS = {612691713: 'animewp-verification-1.2.1.zip', 613399693: 'animewp-1.3.0-verification.zip'}
KEYS = set('name test tests result results description message status pass passed ok error errors key keys nonce token password secret api api_key access_token auth_key cache cache_key build version wordpress php runtime request requests response responses headers url action capabilities expected actual checks test_cases'.split())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_member(name):
    path = PurePosixPath(name)
    if (not name or len(name) > 240 or path.is_absolute() or '..' in path.parts or '@' in name
            or any(not re.fullmatch(r'[A-Za-z0-9_. -]{1,80}', part) for part in path.parts)
            or re.search(r'[A-Za-z0-9_-]{32,}', name)):
        return {'member_name_sha256': sha(name.encode())}
    return {'member_name': name}


def json_scalars(text):
    """Collect scalar key paths and source lines privately, without rendering values."""
    decoder = json.JSONDecoder()
    newlines = [i for i, character in enumerate(text) if character == '\n']
    result, visited = [], 0
    def white(index):
        while index < len(text) and text[index] in ' \t\r\n':
            index += 1
        return index
    def value(index, path, depth):
        nonlocal visited
        visited += 1
        surface.require(depth <= 64 and visited <= 100000, 'json_structure_limit')
        index = white(index)
        if text[index] == '{':
            index = white(index + 1)
            if text[index] == '}':
                return index + 1
            while True:
                key, end = decoder.raw_decode(text, index)
                surface.require(isinstance(key, str), 'invalid_json_key')
                index = white(end)
                surface.require(text[index] == ':', 'invalid_json_separator')
                index = white(value(index + 1, path + [key], depth + 1))
                if text[index] == '}':
                    return index + 1
                surface.require(text[index] == ',', 'invalid_json_separator')
                index = white(index + 1)
        if text[index] == '[':
            index, number = white(index + 1), 0
            if text[index] == ']':
                return index + 1
            while True:
                index = white(value(index, path + [number], depth + 1))
                number += 1
                if text[index] == ']':
                    return index + 1
                surface.require(text[index] == ',', 'invalid_json_separator')
                index = white(index + 1)
        item, end = decoder.raw_decode(text, index)
        result.append({'path': path, 'start_line': bisect.bisect_left(newlines, index) + 1,
                       'end_line': bisect.bisect_left(newlines, end - 1) + 1, 'value': item})
        return end
    end = white(value(0, [], 0))
    surface.require(end == len(text), 'extra_json_content')
    return result


def safe_key_path(path):
    return [key if isinstance(key, int) or key in KEYS else {'key_sha256': sha(key.encode())} for key in path]


def test_labels(repository):
    """Prove a label is an exact test-assertion literal, not merely test-like prose."""
    labels = {}
    for path in sorted((repository / 'tests').rglob('*')):
        if path.is_symlink() or path.suffix not in ('.php', '.js') or path.stat().st_size > 1024 * 1024:
            continue
        text = path.read_text(errors='replace')
        # Deliberately only unescaped multiword literals as the first argument
        # of a known assertion/test declaration; no fuzzy matching or baseline.
        pattern = r'''\b(?:test|it|check_[A-Za-z0-9_]+|smoke_check|check)\s*\(\s*(['"])([^'"\\\r\n]{12,240})\1'''
        for match in re.finditer(pattern, text):
            label = match.group(2)
            if len(label.split()) >= 3:
                labels.setdefault(label, []).append({'path': str(path.relative_to(repository)),
                                                     'line': text.count('\n', 0, match.start()) + 1})
    return labels


def scalar_evidence(item, labels):
    value = item['value']
    encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
    result = {'key_path': safe_key_path(item['path']), 'type': type(value).__name__,
              'value_sha256': sha(encoded), 'encoded_bytes': len(encoded),
              'classification': 'unclassified_requires_review'}
    key = item['path'][-1] if item['path'] else None
    if key in ('test', 'name', 'description', 'message') and isinstance(value, str):
        result['word_count'] = len(value.split())
        if value in labels:
            result['classification'] = 'exact_repository_test_assertion_label'
            result['proof_locations'] = labels[value]
        else:
            result['classification'] = 'text_label_field_requires_review'
    elif key in ('key', 'keys', 'nonce', 'token', 'password', 'secret', 'api_key', 'access_token', 'auth_key'):
        result['classification'] = 'credential_or_nonce_field_requires_review'
    return result


class Triage(surface.Audit):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.member_names = {}

    def archive(self, context, data, depth=0):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            surface.require(len(entries) <= surface.MAX_ARCHIVE_FILES, 'archive_entry_limit')
            for index, entry in enumerate(entries, 1):
                member = tuple(context.get('member_path', []) + [index])
                self.member_names[(context['id'], member)] = entry.filename
        # The reviewed reader enforces path/type/size/CRC restrictions and writes
        # only generated names. The untrusted names above remain private.
        return super().archive(context, data, depth)


def run(root, repository):
    os.umask(0o077)
    surface.require(root.name.startswith('animewp-public-audit') and not root.exists(), 'new_dedicated_root_required')
    root.mkdir(parents=True, mode=0o700)
    client = surface.Client(os.environ.get('GITHUB_TOKEN', ''))
    surface.require(client.token, 'read_only_github_token_required')
    triage = Triage(root, client, '9720ea42b1f310a3d582d0e91d95e3b6f107f834')
    try:
        triage.verify_repository()
        for asset_id, name in ASSETS.items():
            metadata, _ = client.json('/releases/assets/' + str(asset_id))
            surface.require(metadata.get('id') == asset_id and metadata.get('name') == name, 'asset_identity_changed')
            payload, _ = client.request(surface.PREFIX + '/releases/assets/' + str(asset_id), binary=True)
            surface.require(len(payload) == metadata.get('size'), 'release_asset_size_mismatch')
            triage.verify_digest(metadata.get('digest'), payload)
            triage.archive(triage.context('release_asset', asset_id), payload)
        surface.require(not triage.gaps, 'archive_coverage_incomplete')
        detector_root = root / 'private' / 'animewp-public-audit-triage-detector'
        completed = subprocess.run([sys.executable, str(repository / 'tests/security/public-history-audit.py'),
                                    'scan-directory', '--root', str(detector_root), '--source', str(triage.corpus)],
                                   env=surface.safe_env(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=1200)
        path = detector_root / 'report' / 'metadata-findings-redacted.json'
        surface.require(path.is_file(), 'triage_detector_report_missing')
        findings = json.loads(path.read_text())
        surface.require(isinstance(findings, list) and completed.returncode in (0, 1)
                        and (completed.returncode == 1) == bool(findings), 'triage_detector_status_mismatch')
        inputs = {sha(path.name.encode()): path for path in triage.corpus.iterdir()}
        labels = test_labels(repository)
        safe, structured = [], {}
        for finding in findings:
            source_id = finding.get('source_id')
            surface.require(source_id in inputs and source_id in triage.manifest, 'unknown_triage_source')
            context = triage.manifest[source_id]
            content = inputs[source_id].read_bytes()
            text = content.decode('utf-8')
            lines = text.splitlines()
            start, end = int(finding['start_line']), int(finding['end_line'])
            surface.require(1 <= start <= end <= len(lines), 'invalid_finding_line_range')
            candidate = '\n'.join(lines[start - 1:end]).encode()
            member_path = tuple(context.get('member_path', []))
            name = triage.member_names.get((context['id'], member_path), '')
            entry = {'asset_id': context['id'], 'member_path': list(member_path), **safe_member(name),
                     'source_id': source_id, 'rule': finding['rule'], 'start_line': start, 'end_line': end,
                     'file_sha256': sha(content), 'line_sha256': sha(candidate), 'line_bytes': len(candidate),
                     'classification': 'unclassified_requires_private_review',
                     'fixed_identifier_tokens': sorted({token for token in re.findall(r'[A-Za-z_][A-Za-z0-9_]*', candidate.decode()) if token in KEYS}),
                     'loopback_origin_present': bool(re.search(r'https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(?:/|["\s])', text))}
            if source_id not in structured:
                try:
                    structured[source_id] = json_scalars(text)
                except (ValueError, IndexError, surface.Gap):
                    structured[source_id] = None
            scalars = structured[source_id]
            if scalars is not None:
                matching = [scalar_evidence(item, labels) for item in scalars if item['start_line'] <= end and item['end_line'] >= start]
                entry.update(format='json', scalar_context=matching)
                if matching and all(item['classification'] == 'exact_repository_test_assertion_label' for item in matching):
                    entry['classification'] = 'exact_repository_test_assertion_label'
            else:
                entry['format'] = 'non_json_text'
            safe.append(entry)
        result = {'schema_version': 1, 'asset_ids': list(ASSETS), 'finding_count': len(safe), 'findings': safe,
                  'limitations': ['Only the two explicitly identified old verification assets are triaged.',
                                  'Hashes describe complete candidate lines or JSON scalar values, not an unredacted Gitleaks Secret field.',
                                  'Unclassified and credential/nonce fields remain pending; no detector finding is suppressed or removed.',
                                  'Exact test-label matches point to repository assertion locations for independent verification; values are never printed.']}
        surface.write_json(root / 'report' / 'artifact-triage-redacted.json', result)
        print('ANIMEWP_ARTIFACT_TRIAGE_JSON_BEGIN')
        print(json.dumps(result, separators=(',', ':')))
        print('ANIMEWP_ARTIFACT_TRIAGE_JSON_END')
        return 1 if any(entry['classification'] != 'exact_repository_test_assertion_label' for entry in safe) else 0
    finally:
        shutil.rmtree(root / 'private', ignore_errors=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    options = parser.parse_args()
    try:
        sys.exit(run(options.root.resolve(), Path(__file__).resolve().parents[2]))
    except Exception:
        print('Artifact triage incomplete; no private values were logged.', file=sys.stderr)
        sys.exit(1)
