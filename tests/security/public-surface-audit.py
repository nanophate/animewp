#!/usr/bin/env python3
"""Prepare/run a read-only audit of the private nanophate/animewp GitHub surfaces.

Only report/*.json may be uploaded. The private corpus, response bodies, archive
names, detector output, Authorization and signed URLs must never enter job logs.
This collector never invokes repository code or follows links in user content.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile


REPO = 'nanophate/animewp'
API = 'https://api.github.com'
PREFIX = '/repos/' + REPO
WEB = 'https://github.com/' + REPO
MAX_PAGES = 100
MAX_API_BYTES = 16 * 1024 * 1024
MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024
MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_ARCHIVE_FILES = 4000
MAX_ARCHIVE_DEPTH = 2
MAX_TOTAL_NETWORK = 2 * 1024 * 1024 * 1024
MAX_TOTAL_EXPANDED = 4 * 1024 * 1024 * 1024
SHA = re.compile(r'[0-9a-f]{40}')
SOURCE_ID = re.compile(r'[0-9a-f]{64}')


class Gap(RuntimeError):
    """A fixed diagnostic code, never a remote response or exception string."""
    def __init__(self, code, status=None):
        self.code = code
        self.status = status


def require(condition, code):
    if not condition:
        raise Gap(code)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=True, indent=2) + '\n')


def ident(value):
    require(isinstance(value, int) and not isinstance(value, bool) and value > 0, 'invalid_item_id')
    return value


def safe_env():
    return {key: os.environ[key] for key in ('PATH', 'LANG', 'LC_ALL', 'TMPDIR') if key in os.environ}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        return None


def validate_download_redirect(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        host = parsed.hostname or ''
        require(parsed.scheme == 'https' and not parsed.username and not parsed.password
                and parsed.port in (None, 443) and not parsed.fragment, 'unsafe_download_redirect')
    except ValueError:
        raise Gap('unsafe_download_redirect') from None
    # Signed URLs originate exclusively in the fixed GitHub binary endpoints.
    # A fresh request below has no Authorization, Cookie, or Referer header.
    allowed = (host in {'api.github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'}
               or host.endswith('.actions.githubusercontent.com')
               or host.endswith('.blob.core.windows.net'))
    require(allowed, 'unrecognized_download_host')


class Client:
    def __init__(self, token):
        self.token = token
        self.opener = urllib.request.build_opener(NoRedirect())
        self.network_bytes = 0

    def request(self, path, *, binary=False):
        require(path == PREFIX or path.startswith(PREFIX + '/'), 'unexpected_api_endpoint')
        require('..' not in urllib.parse.urlsplit(path).path.split('/'), 'unexpected_api_endpoint')
        url = API + path
        limit = MAX_DOWNLOAD_BYTES if binary else MAX_API_BYTES
        authenticated = True
        for attempt in range(5):
            headers = {'User-Agent': 'animewp-private-publication-audit',
                       'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json',
                       'X-GitHub-Api-Version': '2022-11-28'}
            request = urllib.request.Request(url, headers=headers, method='GET')
            if authenticated:
                # This header is never inherited by a redirect, even to GitHub.
                request.add_unredirected_header('Authorization', 'Bearer ' + self.token)
            try:
                with self.opener.open(request, timeout=60) as response:
                    declared = response.headers.get('Content-Length')
                    if declared and declared.isdigit():
                        require(int(declared) <= limit, 'download_size_limit')
                    data = bytearray()
                    while True:
                        chunk = response.read(min(64 * 1024, limit + 1 - len(data)))
                        if not chunk:
                            break
                        data.extend(chunk)
                        self.network_bytes += len(chunk)
                        require(len(data) <= limit, 'download_size_limit')
                        require(self.network_bytes <= MAX_TOTAL_NETWORK, 'network_budget_exhausted')
                    return bytes(data), response.headers
            except urllib.error.HTTPError as error:
                if binary and error.code in (301, 302, 303, 307, 308):
                    location = error.headers.get('Location', '')
                    error.close()
                    validate_download_redirect(location)
                    url = location
                    authenticated = False
                    continue
                status = error.code
                error.close()
                raise Gap('not_found_or_expired' if status in (404, 410) else 'http_request_failed', status) from None
            except (urllib.error.URLError, OSError):
                raise Gap('network_request_failed') from None
        raise Gap('redirect_limit')

    def json(self, suffix):
        raw, headers = self.request(PREFIX + suffix)
        try:
            return json.loads(raw), headers
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise Gap('invalid_api_json') from None

    def pages(self, suffix, *, key=None, query=None):
        seen, expected = set(), None
        for page in range(1, MAX_PAGES + 1):
            params = dict(query or {}, per_page=100, page=page)
            data, headers = self.json(suffix + '?' + urllib.parse.urlencode(params))
            if key:
                require(isinstance(data, dict) and isinstance(data.get(key), list), 'invalid_api_collection')
                total = data.get('total_count')
                require(isinstance(total, int) and total >= 0, 'invalid_api_total')
                if expected is None:
                    expected = total
                require(expected == total, 'collection_changed_during_pagination')
                rows = data[key]
            else:
                require(isinstance(data, list), 'invalid_api_collection')
                rows = data
            require(len(rows) <= 100, 'unexpected_api_page_size')
            for row in rows:
                require(isinstance(row, dict), 'invalid_api_item')
                row_id = ident(row.get('id'))
                require(row_id not in seen, 'duplicate_item_during_pagination')
                seen.add(row_id)
                yield row
            # Construct the next request locally. Never follow an API/user Link URL.
            next_page = 'rel="next"' in headers.get('Link', '')
            if not next_page and len(rows) < 100:
                require(expected is None or len(seen) == expected, 'collection_count_or_api_cap_mismatch')
                return
        raise Gap('pagination_limit')


class Audit:
    def __init__(self, root, client, expected_main, own_run_id=None):
        self.root, self.client = root, client
        self.corpus = root / 'private' / 'text'
        self.corpus.mkdir(parents=True, mode=0o700)
        self.expected_main, self.own_run_id = expected_main, own_run_id
        self.started = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        self.manifest, self.gaps, self.exclusions, self.privacy, self.artifacts, self.releases = {}, [], [], [], [], []
        self.counts = Counter()
        self.expanded_bytes = 0

    def context(self, kind, item_id, **extras):
        context = {'kind': kind, 'id': ident(item_id)}
        context.update(extras)
        if kind in ('issue', 'pull_request', 'pull_review'):
            number = extras.get('number')
            if number:
                context['url'] = WEB + ('/pull/' if kind != 'issue' else '/issues/') + str(ident(number))
        elif kind.startswith('run') or kind.startswith('artifact'):
            run_id = extras.get('run_id', item_id if kind.startswith('run') else None)
            if run_id:
                context['url'] = WEB + '/actions/runs/' + str(ident(run_id))
        elif kind.startswith('release'):
            context['url'] = WEB + '/releases'
        elif kind == 'issue_comment':
            context['url'] = API + PREFIX + '/issues/comments/' + str(item_id)
        elif kind == 'review_comment':
            context['url'] = API + PREFIX + '/pulls/comments/' + str(item_id)
        elif kind == 'commit_comment':
            context['url'] = API + PREFIX + '/comments/' + str(item_id)
        return context

    def gap(self, context, error):
        self.gaps.append(dict(context, code=error.code, **({'http_status': error.status} if error.status else {})))

    def guarded(self, context, callback):
        try:
            callback()
        except Gap as error:
            self.gap(context, error)
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError):
            self.gap(context, Gap('collection_or_archive_error'))

    def add(self, context, data):
        if not isinstance(data, bytes):
            data = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        require(len(data) <= MAX_FILE_BYTES, 'text_file_size_limit')
        self.expanded_bytes += len(data)
        require(self.expanded_bytes <= MAX_TOTAL_EXPANDED, 'expanded_corpus_budget_exhausted')
        name = 'surface-' + str(len(self.manifest) + 1).zfill(6) + '.txt'
        source_id = hashlib.sha256(name.encode()).hexdigest()
        (self.corpus / name).write_bytes(data)
        self.manifest[source_id] = dict(context, bytes=len(data))
        self.counts['text_files'] += 1
        patterns = {
            'email_address': rb'(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',
            'credential_in_url': rb'https?://[^\s/@:]+:[^\s/@]+@',
            'private_ip_or_internal_host': rb'\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b|(?i:[a-z0-9.-]+\.(?:internal|local))\b',
            'embedded_attachment_link': rb'https://(?:user-images\.githubusercontent\.com/|github\.com/user-attachments/)',
        }
        for category, pattern in patterns.items():
            count = len(re.findall(pattern, data))
            if count:
                self.privacy.append({'source_id': source_id, 'category': category, 'count': count})

    def file(self, context, data, depth=0):
        if data.startswith((b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08')):
            require(depth < MAX_ARCHIVE_DEPTH, 'nested_archive_depth_limit')
            return self.archive(context, data, depth)
        if data.startswith((b'\x1f\x8b', b'7z\xbc\xaf\x27\x1c', b'Rar!')):
            raise Gap('unsupported_archive_format')
        if data.startswith((b'\xff\xfe', b'\xfe\xff')):
            try:
                self.add(context, data.decode('utf-16').encode('utf-8'))
                return
            except UnicodeError:
                raise Gap('invalid_text_encoding') from None
        try:
            data.decode('utf-8')
            binary = b'\0' in data
        except UnicodeDecodeError:
            binary = True
        if binary:
            # Useful strings are inspected, but this does not inspect image pixels,
            # OCR, compressed payloads or licensed/proprietary media semantics.
            strings = b'\n'.join(re.findall(rb'[\x09\x20-\x7e]{6,}', data))
            self.add(dict(context, view='binary_ascii_strings'), strings)
            self.counts['binary_files_requiring_review'] += 1
            self.privacy.append(dict(context, category='binary_or_visual_content_requires_manual_review'))
        else:
            self.add(context, data)

    def archive(self, context, data, depth=0):
        require(len(data) <= MAX_DOWNLOAD_BYTES, 'archive_download_size_limit')
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            require(len(entries) <= MAX_ARCHIVE_FILES, 'archive_entry_limit')
            total, names = 0, set()
            for entry in entries:
                name = entry.filename
                path = PurePosixPath(name)
                require(name and entry.orig_filename == name and '\0' not in name and '\\' not in name
                        and not path.is_absolute() and '..' not in path.parts
                        and not re.match(r'^[A-Za-z]:', name), 'unsafe_archive_path')
                require(name not in names, 'duplicate_archive_path')
                names.add(name)
                mode = entry.external_attr >> 16
                require(stat.S_IFMT(mode) in (0, stat.S_IFREG, stat.S_IFDIR), 'archive_non_regular_entry')
                require(not entry.flag_bits & 1, 'encrypted_archive_entry')
                require(entry.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'unsupported_zip_compression')
                require(entry.file_size <= MAX_FILE_BYTES, 'archive_member_size_limit')
                total += entry.file_size
                require(total <= MAX_ARCHIVE_BYTES, 'archive_expanded_size_limit')
            # Names themselves can contain private data; scan them without ever
            # using them as filesystem destinations or publishing them in reports.
            self.add(dict(context, view='archive_member_names'), '\n'.join(entry.filename for entry in entries).encode('utf-8'))
            for index, entry in enumerate(entries, 1):
                if entry.is_dir():
                    continue
                with archive.open(entry, 'r') as stream:
                    content = stream.read(MAX_FILE_BYTES + 1)
                    require(len(content) == entry.file_size and len(content) <= MAX_FILE_BYTES, 'archive_member_size_mismatch')
                nested = dict(context, member_path=context.get('member_path', []) + [index], depth=depth)
                # Each archive is bounded; an unsupported nested object records a
                # gap while allowing other independent objects to be collected.
                self.guarded(nested, lambda c=nested, b=content: self.file(c, b, depth + 1))
                self.counts['archive_members'] += 1

    def discussions(self):
        prs = []
        for row in self.client.pages('/issues', query={'state': 'all', 'sort': 'created', 'direction': 'asc'}):
            number = ident(row.get('number'))
            kind = 'pull_request' if row.get('pull_request') else 'issue'
            self.add(self.context(kind, row['id'], number=number), row)
            self.counts[kind + 's'] += 1
            if kind == 'pull_request':
                prs.append(number)
        for endpoint, kind in (('/issues/comments', 'issue_comment'), ('/pulls/comments', 'review_comment'), ('/comments', 'commit_comment')):
            def collect_comments(endpoint=endpoint, kind=kind):
                for row in self.client.pages(endpoint, query={'sort': 'created', 'direction': 'asc'}):
                    self.add(self.context(kind, row['id']), row)
                    self.counts[kind + 's'] += 1
            self.guarded({'kind': kind}, collect_comments)
        for number in prs:
            def collect_reviews(number=number):
                for row in self.client.pages('/pulls/' + str(number) + '/reviews'):
                    self.add(self.context('pull_review', row['id'], number=number), row)
                    self.counts['pull_reviews'] += 1
            self.guarded({'kind': 'pull_review', 'number': number}, collect_reviews)

    def release_data(self):
        for row in self.client.pages('/releases'):
            release_id = ident(row['id'])
            context = self.context('release', release_id)
            self.add(context, row)
            record = {'id': release_id, 'draft': bool(row.get('draft')), 'prerelease': bool(row.get('prerelease')), 'assets': []}
            self.releases.append(record)
            self.counts['releases'] += 1
            def assets():
                # The embedded assets list is not assumed to be complete.
                for asset in self.client.pages('/releases/' + str(release_id) + '/assets'):
                    asset_id = ident(asset['id'])
                    info = self.context('release_asset', asset_id, release_id=release_id)
                    self.add(info, asset)
                    item = {'id': asset_id, 'bytes': asset.get('size'), 'state': 'pending'}
                    record['assets'].append(item)
                    self.counts['release_assets'] += 1
                    def download():
                        size = asset.get('size')
                        require(isinstance(size, int) and 0 <= size <= MAX_DOWNLOAD_BYTES, 'release_asset_size_limit')
                        data, _ = self.client.request(PREFIX + '/releases/assets/' + str(asset_id), binary=True)
                        require(len(data) == size, 'release_asset_size_mismatch')
                        self.verify_digest(asset.get('digest'), data)
                        before = len(self.gaps)
                        self.file(info, data)
                        item['state'] = 'collected' if len(self.gaps) == before else 'collected_with_gaps'
                    self.guarded(info, download)
                    if item['state'] == 'pending':
                        item['state'] = 'incomplete'
            self.guarded(context, assets)

    @staticmethod
    def verify_digest(expected, data):
        if expected:
            require(isinstance(expected, str) and re.fullmatch(r'sha256:[0-9a-f]{64}', expected), 'unrecognized_asset_digest')
            require(expected[7:] == hashlib.sha256(data).hexdigest(), 'asset_digest_mismatch')

    def actions(self):
        # Snapshot all pages before slow downloads so newly produced artifacts/runs
        # cannot shift pagination partway through the inventory.
        for run in list(self.client.pages('/actions/runs', key='workflow_runs', query={'created': '<=' + self.started})):
            run_id = ident(run['id'])
            context = self.context('run', run_id)
            self.add(context, run)
            self.counts['workflow_runs'] += 1
            if run_id == self.own_run_id:
                self.exclusions.append(dict(context, reason='current_audit_run_not_yet_complete'))
                continue
            if run.get('status') != 'completed':
                self.exclusions.append(dict(context, reason='workflow_run_not_yet_complete_at_cutoff'))
                continue
            attempts = run.get('run_attempt', 1)
            require(isinstance(attempts, int) and 1 <= attempts <= 100, 'workflow_attempt_limit')
            for attempt in range(1, attempts + 1):
                info = self.context('run_logs', run_id, attempt=attempt)
                def logs():
                    data, _ = self.client.request(PREFIX + '/actions/runs/' + str(run_id) + '/attempts/' + str(attempt) + '/logs', binary=True)
                    self.archive(info, data)
                    self.counts['workflow_log_attempts_collected'] += 1
                self.guarded(info, logs)

    def artifact_data(self):
        for artifact in list(self.client.pages('/actions/artifacts', key='artifacts')):
            artifact_id = ident(artifact['id'])
            run = artifact.get('workflow_run') or {}
            run_id = ident(run['id']) if run.get('id') is not None else None
            context = self.context('artifact', artifact_id, **({'run_id': run_id} if run_id else {}))
            self.add(context, artifact)
            record = {'id': artifact_id, 'run_id': run_id, 'bytes': artifact.get('size_in_bytes'),
                      'expired': bool(artifact.get('expired')), 'state': 'pending'}
            self.artifacts.append(record)
            self.counts['actions_artifacts'] += 1
            if record['expired']:
                record['state'] = 'expired_unavailable'
                self.gap(context, Gap('expired_artifact_not_downloadable'))
                continue
            def download():
                size = artifact.get('size_in_bytes')
                require(isinstance(size, int) and 0 <= size <= MAX_DOWNLOAD_BYTES, 'artifact_size_limit')
                data, _ = self.client.request(PREFIX + '/actions/artifacts/' + str(artifact_id) + '/zip', binary=True)
                # Actions size_in_bytes can be a storage size; digest, when
                # supplied, is the authoritative downloaded ZIP integrity check.
                self.verify_digest(artifact.get('digest'), data)
                before = len(self.gaps)
                self.archive(context, data)
                record['state'] = 'collected' if len(self.gaps) == before else 'collected_with_gaps'
            self.guarded(context, download)
            if record['state'] == 'pending':
                record['state'] = 'incomplete'

    def verify_repository(self):
        repository, _ = self.client.json('')
        require(repository.get('full_name') == REPO and repository.get('private') is True, 'repository_identity_or_visibility_changed')
        ref, _ = self.client.json('/git/ref/heads/main')
        require(ref.get('object', {}).get('sha') == self.expected_main, 'main_changed_from_reviewed_merge')

    def report(self, state):
        report = self.root / 'report'
        write_json(report / 'surface-source-map.json', self.manifest)
        write_json(report / 'surface-coverage-gaps.json', self.gaps)
        write_json(report / 'surface-temporal-exclusions.json', self.exclusions)
        write_json(report / 'surface-privacy-candidates.json', self.privacy)
        write_json(report / 'surface-artifact-inventory.json', self.artifacts)
        write_json(report / 'surface-release-inventory.json', self.releases)
        write_json(report / 'surface-coverage.json', {
            'schema_version': 1, 'repository': REPO, 'expected_main': self.expected_main,
            'snapshot_started_at': self.started, 'state': state,
            'collection_complete': not self.gaps, 'counts': dict(self.counts),
            'coverage_gap_count': len(self.gaps), 'privacy_candidate_count': len(self.privacy),
            'temporal_exclusion_count': len(self.exclusions),
            'manual_review_required': bool(self.gaps or self.exclusions or self.privacy or self.counts['secret_findings']),
            'network_bytes': self.client.network_bytes, 'corpus_bytes': self.expanded_bytes,
            'limits': {'pages_per_collection': MAX_PAGES, 'download_bytes_per_archive': MAX_DOWNLOAD_BYTES,
                       'expanded_bytes_per_archive': MAX_ARCHIVE_BYTES, 'bytes_per_member': MAX_FILE_BYTES,
                       'members_per_archive': MAX_ARCHIVE_FILES, 'archive_depth': MAX_ARCHIVE_DEPTH,
                       'total_network_bytes': MAX_TOTAL_NETWORK, 'total_corpus_bytes': MAX_TOTAL_EXPANDED},
            'limitations': [
                'Only currently returned REST objects and surviving downloads were collected; deleted objects, edited prior revisions, cached copies, inaccessible draft reviews and external forks are not enumerable.',
                'Expired, removed, unavailable and size-limited historical objects are explicit gaps, not successful scans.',
                'Current/in-progress runs at the cutoff are explicit temporal exclusions; review their completed logs and new Release/assets separately before any public decision.',
                'Issue/PR attachments and arbitrary links were inventoried as candidates, never followed.',
                'Binary string extraction is not OCR, visual review, malware analysis, or verification of media licensing and publication rights.',
                'Workflow and artifact collections can change concurrently; API totals, duplicate IDs and reviewed main are checked, but the API offers no atomic snapshot.',
                'Repository settings, collaborators, encrypted Actions secret values, security alerts, Discussions, wiki and external services need separately authorized/available checks.',
                'A clean pattern scan is evidence for human review; it does not authorize visibility changes or prove all prose and media may be published.'
            ]})


def run(args):
    os.umask(0o077)
    require(SHA.fullmatch(args.expected_main or '') and args.expected_main != '0' * 40, 'reviewed_main_sha_required')
    root = args.root.resolve()
    require(root.name.startswith('animewp-public-audit') and not root.exists(), 'new_dedicated_root_required')
    token = os.environ.get('GITHUB_TOKEN', '')
    require(bool(token), 'read_only_github_token_required')
    root.mkdir(parents=True, mode=0o700)
    own_id = os.environ.get('GITHUB_RUN_ID', '')
    own_id = int(own_id) if own_id.isdigit() else None
    audit = Audit(root, Client(token), args.expected_main, own_id)
    try:
        audit.verify_repository()
        for kind, callback in (('discussions', audit.discussions), ('releases', audit.release_data),
                               ('actions_runs', audit.actions), ('actions_artifacts', audit.artifact_data)):
            audit.guarded({'kind': kind}, callback)
        audit.guarded({'kind': 'repository_snapshot'}, audit.verify_repository)
        audit.report('collected')
        detector_root = root / 'private' / 'animewp-public-audit-surface-detector'
        try:
            result = subprocess.run([sys.executable, str(args.detector.resolve()), 'scan-directory',
                                     '--root', str(detector_root), '--source', str(audit.corpus)],
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                    env=safe_env(), timeout=1200)
        except (OSError, subprocess.TimeoutExpired):
            raise Gap('surface_detector_did_not_finish') from None
        path = detector_root / 'report' / 'metadata-findings-redacted.json'
        require(path.is_file(), 'surface_detector_report_missing')
        findings = json.loads(path.read_text())
        require(isinstance(findings, list), 'surface_detector_report_invalid')
        require(result.returncode in (0, 1) and (result.returncode == 1) == bool(findings), 'surface_detector_status_mismatch')
        safe = []
        for finding in findings:
            source_id = finding.get('source_id', '')
            rule = finding.get('rule', '')
            require(isinstance(source_id, str) and SOURCE_ID.fullmatch(source_id) and source_id in audit.manifest, 'surface_detector_source_mapping_failed')
            require(isinstance(rule, str) and re.fullmatch(r'[A-Za-z0-9_-]+', rule), 'surface_detector_rule_invalid')
            safe.append({'source_id': source_id, 'rule': rule,
                         'start_line': int(finding['start_line']), 'end_line': int(finding['end_line'])})
        write_json(root / 'report' / 'surface-secret-findings-redacted.json', safe)
        audit.counts['secret_findings'] = len(safe)
        audit.report('scanned')
        print('Surface audit finished. Only sanitized coverage, inventory and finding locations were retained.')
        return 1 if audit.gaps or safe else 0
    except Gap as error:
        audit.gap({'kind': 'audit'}, error)
        audit.report('incomplete')
        print('Surface audit incomplete; inspect sanitized coverage codes.', file=sys.stderr)
        return 1
    except Exception:
        audit.gap({'kind': 'audit'}, Gap('unexpected_collector_error'))
        audit.report('incomplete')
        print('Surface audit incomplete; inspect sanitized coverage codes.', file=sys.stderr)
        return 1
    finally:
        # Source, signed downloads, private detector reports and its logs stay in
        # the runner only. Even an incomplete audit retains only sanitized JSON.
        shutil.rmtree(root / 'private', ignore_errors=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--expected-main', required=True)
    parser.add_argument('--detector', required=True, type=Path)
    options = parser.parse_args()
    try:
        sys.exit(run(options))
    except Exception:
        print('Surface audit could not start; no private data was logged.', file=sys.stderr)
        sys.exit(1)
