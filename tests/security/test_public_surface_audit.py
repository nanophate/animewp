"""Synthetic local tests only: no GitHub requests or real credentials."""
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
import urllib.error
import zipfile

spec = importlib.util.spec_from_file_location('surface_audit', Path(__file__).with_name('public-surface-audit.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class Response(io.BytesIO):
    headers = {}


class CollectorTest(unittest.TestCase):
    def make_audit(self, root):
        return audit.Audit(root, audit.Client('synthetic-test-token'), '1' * 40)

    def archive(self, entries):
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w', compression=zipfile.ZIP_DEFLATED) as target:
            for name, content in entries:
                target.writestr(name, content)
        return data.getvalue()

    def test_binary_redirect_never_forwards_authorization(self):
        requests = []
        class Opener:
            def open(self, request, timeout):
                requests.append(request)
                if len(requests) == 1:
                    raise urllib.error.HTTPError(request.full_url, 302, 'redirect',
                        {'Location': 'https://example.blob.core.windows.net/logs?sig=synthetic'}, None)
                return Response(b'zip-data')
        client = audit.Client('synthetic-test-token')
        client.opener = Opener()
        data, _ = client.request(audit.PREFIX + '/actions/runs/1/logs', binary=True)
        self.assertEqual(data, b'zip-data')
        self.assertTrue(requests[0].has_header('Authorization'))
        self.assertFalse(requests[1].has_header('Authorization'))
        self.assertFalse(requests[1].has_header('Cookie'))
        self.assertFalse(requests[1].has_header('Referer'))

    def test_untrusted_redirect_rejected(self):
        for url in ('http://example.blob.core.windows.net/x', 'https://attacker.example/x',
                    'https://user:pass@objects.githubusercontent.com/x', 'https://objects.githubusercontent.com:444/x'):
            with self.subTest(url=url), self.assertRaises(audit.Gap):
                audit.validate_download_redirect(url)

    def test_pagination_ignores_remote_link_target(self):
        client = audit.Client('synthetic-test-token')
        calls = []
        def fake(suffix):
            calls.append(suffix)
            if len(calls) == 1:
                return {'total_count': 1, 'artifacts': [{'id': 1}]}, {'Link': '<https://attacker.example/>; rel="next"'}
            return {'total_count': 1, 'artifacts': []}, {}
        client.json = fake
        self.assertEqual(list(client.pages('/actions/artifacts', key='artifacts')), [{'id': 1}])
        self.assertEqual(calls, ['/actions/artifacts?per_page=100&page=1', '/actions/artifacts?per_page=100&page=2'])

    def test_pagination_total_mismatch_is_not_success(self):
        client = audit.Client('synthetic-test-token')
        client.json = lambda _: ({'total_count': 2, 'artifacts': [{'id': 1}]}, {})
        with self.assertRaises(audit.Gap) as raised:
            list(client.pages('/actions/artifacts', key='artifacts'))
        self.assertEqual(raised.exception.code, 'collection_count_or_api_cap_mismatch')

    def test_archive_traversal_and_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            collector = self.make_audit(Path(temp))
            context = collector.context('artifact', 1, run_id=2)
            for name in ('../outside.txt', '/outside.txt', 'C:/outside.txt', 'nested\\outside.txt'):
                with self.subTest(name=name), self.assertRaises(audit.Gap):
                    collector.archive(context, self.archive([(name, b'private-text')]))
            symlink = zipfile.ZipInfo('link')
            symlink.create_system = 3
            symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
            with self.assertRaises(audit.Gap) as raised:
                collector.archive(context, self.archive([(symlink, b'../target')]))
            self.assertEqual(raised.exception.code, 'archive_non_regular_entry')
            self.assertEqual(list(collector.corpus.iterdir()), [])

    def test_nested_zip_is_scanned_under_opaque_names(self):
        with tempfile.TemporaryDirectory() as temp:
            collector = self.make_audit(Path(temp))
            context = collector.context('artifact', 1, run_id=2)
            nested = self.archive([('private-name.txt', b'private-content person@example.invalid')])
            collector.archive(context, self.archive([('package.zip', nested)]))
            collector.report('collected')
            combined = '\n'.join(path.read_text() for path in (Path(temp) / 'report').glob('*.json'))
            self.assertNotIn('private-content', combined)
            self.assertNotIn('private-name', combined)
            self.assertNotIn('person@example.invalid', combined)
            self.assertTrue(all(path.name.startswith('surface-') for path in collector.corpus.iterdir()))
            entries = list(collector.manifest.values())
            self.assertTrue(any(entry.get('member_path') == [1, 1] for entry in entries))
            self.assertTrue(any(item['category'] == 'email_address' for item in collector.privacy))
            self.assertEqual(collector.gaps, [])

    def test_third_zip_level_is_explicit_gap(self):
        with tempfile.TemporaryDirectory() as temp:
            collector = self.make_audit(Path(temp))
            data = self.archive([('third.zip', self.archive([('payload.txt', b'payload')]))])
            collector.archive(collector.context('artifact', 1), self.archive([('second.zip', data)]))
            self.assertEqual(collector.gaps[0]['code'], 'nested_archive_depth_limit')

    def test_binary_pixels_remain_manual_review(self):
        with tempfile.TemporaryDirectory() as temp:
            collector = self.make_audit(Path(temp))
            collector.file(collector.context('artifact', 1), b'\x89PNG\0binary-readable-canary\0')
            collector.report('collected')
            report = json.loads((Path(temp) / 'report' / 'surface-coverage.json').read_text())
            self.assertTrue(report['manual_review_required'])
            self.assertEqual(report['counts']['binary_files_requiring_review'], 1)
            self.assertNotIn('binary-readable-canary', json.dumps(report))

    def test_non_utf8_without_nul_is_not_silently_skipped_by_detector(self):
        with tempfile.TemporaryDirectory() as temp:
            collector = self.make_audit(Path(temp))
            collector.file(collector.context('artifact', 1), b'\xffbinary-readable-canary')
            self.assertEqual(collector.counts['binary_files_requiring_review'], 1)
            self.assertTrue(all(path.read_bytes().decode('utf-8') for path in collector.corpus.iterdir()))


if __name__ == '__main__':
    unittest.main()
