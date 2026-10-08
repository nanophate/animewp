# 2.0.1 の配布・更新検証

この記録は、v2全体レビューを反映したmainから、2.0.1の更新配布機能とブラウザー試験を追加した変更を対象にします。
最初のv2レビューは [review-2026-10.md](review-2026-10.md)、運用手順は [maintenance.md](maintenance.md) に残しています。

## 検査する経路

| 経路 | 方法 | 確認内容 |
| --- | --- | --- |
| 旧Releaseからの導入 | v1.3.0の実ZIPを取得・ハッシュ検証し、WP-CLIで新ZIPへ置換 | 投稿本文、保存済みテンプレート、Global Styles、旧書体設定、ホーム設定の保持 |
| 標準の更新画面 | 現行ZIPをインストールした使い捨てWordPressで、更新通知からテスト専用の次版ZIPを適用 | テーマ単独、プラグインと別テーマ、両方導入、版番号の更新 |
| 更新クライアントの異常系 | WordPressのHTTPフックで正常・不正レスポンスを再現 | 配布先・必要環境・SHA-256・一時ファイル削除・通信障害・キャッシュ・情報取り下げ |
| 公開処理 | Python単体テストでGitHub APIの成功・失敗を再現 | Draft再開、タグ不変、アセット不変、公開前検証、古い版の拒否、2JSONの一括反映 |
| 公開側の表示・操作 | PlaywrightのChromium / Firefox / WebKit | 狭い画面、見出し、ページ内リンク、入力中のカルーセル、ダイアログ、reduced motion、JavaScript無効 |
| ブロック編集 | 実WordPressのPost Editor / Site Editor iframe | 見本の検証、本文・テンプレートの編集、保存後の再読込 |

テスト専用MUプラグインは `ANIMEWP_BROWSER_QA` が有効な使い捨てサイトでだけ動作します。
GitHubの固定URLへの問い合わせをfixtureへ置き換えます。インストールZIPにはテストやMUプラグインを含めません。
認証cookieやnonceを含むトレース・HAR・動画・セッションは共有artifactへ出さず、画面画像と結果だけを保存します。

## 実行手順

通常のソース検査は、依存関係をlockfileから導入した後に実行します。

```sh
npm ci
npm ci --prefix tests/serialization
python3 scripts/validate.py
npm run env:start
npm run test:security
npm run test:wp
```

`npm run test:wp`には更新機能の `wp-updates.php` を含めます。
ソースのWordPress試験は6.6 / PHP 8.0と7.1 / PHP 8.3の組合せで実行します。
保存互換性はそれぞれのWordPressエディタースクリプトで、直前mainのビルドと比較します。

ブラウザーとZIP試験は `.github/workflows/browser.yml` が、旧ZIP取得、現行ZIPビルド、
Docker上の隔離サイト、Playwrightブラウザーの導入、試験、結果artifact作成を担当します。
この試験は物理的なテーマ・プラグインディレクトリを使い、開発用ソースのbind mountを更新先にしません。
Releaseワークフローからも同じ検査を再利用し、実際に配布するコミットを指定します。

## 検証記録

2026-10-08に追加した検証です。GitHub CIの確定結果はPR #9とReleaseワークフローの最新チェックを参照してください。Releaseは全検証の成功を配布条件にします。

| 検証 | 結果 |
| --- | --- |
| Releaseの回帰テスト | 23件成功 |
| WordPress 6.6.10の保存互換性 | 7保存文書＋3,627生成ブロックが直前mainと同一 |
| WordPress 7.1.4-alpha-64164の保存互換性 | 同じ範囲で保存HTML・再読込・変換が同一 |
| 実WordPressの更新クライアント | PHP WASM / SQLiteで両環境56/56件成功、読み込み順と重複防止6/6件成功。Docker / MySQLのCIでも確認する |
| ブラウザー・実ZIP更新 | 10件×4環境のCIを実行。v1.3.0からのデータ保持と標準更新3ケースは初回から全環境で成功 |
| Theme Checkの配布方針 | 自前配布用Update URIだけを適応する10件の回帰試験を両PHPで確認 |
| 公開GitHubからの匿名取得 | リポジトリ公開後、Releaseの明示的なpublish実行で確認する |

Motionは3,189の生成ブロックに加え、標準7ブロック×4設定で、保存HTMLと設定保持を確認しています。
7.1の本体取得元は `7.1-branch` で、上記の実際の実行版は開発版を含みます。
PHP WASM / SQLiteでの先行検証と、Docker / MySQLでのCIは別の実行環境です。

## この記録で完了扱いにしないこと

WebKitでの成功をSafari実機の成功とは扱いません。スクリーンリーダー、iOS/macOS実機、
外部動画サービスの実再生、任意の他社プラグインとの組合せ、本番サイトのバックアップ復元は別途必要です。
外部動画への通信をテストで遮断する場面では、DOM・操作・接続タイミングを確認します。
公開サイトへのデプロイや本番データの変更は、この試験に含めません。

初回ブラウザー試験で、単一テンプレートの保存後に不要な確認パネルを待つ処理と、CSSアニメーション中の要素の静止を待つ手順を修正しました。保存後の再読込、実際のhover状態、アニメーションの開始とreduced motionによる停止を引き続き検証します。画像は実際に表示中のheroとアンカー位置を分けて記録し、画面外の未開始アニメーションを欠落と誤認しないようにしています。
