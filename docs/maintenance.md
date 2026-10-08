# 更新配布と定期セキュリティ検査

## この変更の適用先

この設定は `main` にマージ済みの AnimeWP v2 の依存関係と検査構成を対象とします。
定期実行と通常の Dependabot 更新 PR は、設定が既定ブランチに入ってから有効になります。

## 自動化する検査

| 検査 | 対象 | タイミング |
| --- | --- | --- |
| Dependabot version updates | GitHub Actions、ルートと `tests/serialization` の npm、`tests/security` の Composer | 毎週月曜 04:17 JST |
| npm / Composer audit | 上記3箇所の lockfile。開発用依存も含む（扱いは下記） | PR、main の push、毎日 04:23 JST、手動 |
| 既存のソース・ZIP・WordPress セキュリティ検査 | テーマとプラグイン | push、PR、毎週月曜 04:37 JST、手動 |

GitHub Actions の cron は UTC に換算して記述しています。実行時刻は目安で、
GitHub 側の混雑等で遅延することがあります。

npm の監査は `tests/security/npm_audit.py` が行い、次の場合に失敗します。

- 開発用（devDependencies）以外の依存に、既知の脆弱性が1件でもある。
- 開発用ツールに high / critical の advisory があり、`tests/security/npm-audit-accepted.json` で確認済みになっていない。
- 確認済みの advisory が、記録した見直し期限（`review_by`、UTCの日付）を過ぎた。
- 同じ advisory でも、確認したディレクトリ・パッケージ・開発ツール経由の依存関係から外れた。
- npmが異常終了した、監査JSONが不完全・未知形式、または集計と詳細が一致しない。

開発用ツールの low / moderate はログに件数を出すだけです。Composer は既知の脆弱性で失敗し、
abandoned package はログで確認できます。依存関係は lockfile から監査し、このジョブで
install や audit fix は行いません。prod / optional / peer を明示して環境の omit 設定による監査漏れを防ぎ、`--offline=false` でオンライン監査を明示し、監査サービスに接続できない場合も成功扱いにはしません。受容判定はIDだけでなく、lockfile内の実際の経路も検査します。別の開発ツールから同じ脆弱な依存へ到達する経路を追加した場合も、未確認として失敗します。

確認済みとして記録するのは、WordPress 公式の開発ツール（`@wordpress/scripts`、`@wordpress/env`）の
奥にあり、上流の更新を待つしかないものだけです。記録には、配布物に入らないことと
影響が限られる理由を書き、見直し期限は3か月以内にします。上流で直ったら記録を削除します
（監査ログに「No longer reported」と表示されます）。

## 依存の方針

- 配布する ZIP（テーマ、プラグイン）には、外部の JS / CSS ライブラリーもフォントも同梱せず、
  外部のサーバーからも読み込みません。例外は、明示的に設定した動画プレーヤー（背景の無音自動再生を含む）と、
  編集者が取り込んだ YouTube のサムネイルだけです。
- ブロックのスクリプトが使うのは WordPress 本体が提供する部品（`wp-*`、`@wordpress/*`、React）だけです。
- npm のパッケージは開発用の道具に限ります（`package.json` に `dependencies` を置かない）。
  開発用も WordPress 公式の `@wordpress/scripts` と `@wordpress/env` を基本にし、
  新しいパッケージは必要なときだけ足します。
- ビルドは WordPress の方針に合わせます。`@wordpress/scripts` は将来、esbuild を使う
  `@wordpress/build` の上で動く予定のため、独自のビルドへは移らず、公式の更新を取り込みます。

`scripts/build-policy.cjs` は本番用ビルドの各チャンクと結合モジュールを調べ、npmライブラリーがJavaScriptへ入ることと、npm由来のCSS/Sassの取り込みを拒否します。WordPress本体の外部依存とビルド用loaderは配布コードへ混ぜません。`tests/static_check.py` は外部参照、ライセンス表記、宣言されたスクリプト依存、`package.json` の `dependencies`、各ブロックとモーションの必須ビルドファイルを検査します。ライセンスコメントの有無だけでは、同梱されるコードを判定しません。

開発環境はNode.js 24.18以上・npm 11.16以上・Python 3.10以上です。CIはNode.js 24とnpm 11.16.0を明示し、ホスト側の既定バージョンへ依存しません。

Dependabot の通常更新は npm / Composer の minor・patch をまとめ、major は個別 PR にします。
GitHub Actions の更新は一つのグループにします。自動マージは設定していません。
リポジトリ設定で Dependency graph、Dependabot alerts、Dependabot security updates も有効にしてください。
security updates は通常更新の週次スケジュールとは別に機能します。
YAML の追加だけでリポジトリ側の security updates 設定を切り替えることはできません。

既存の `npm run test:security` は PHPCS の WordPress セキュリティルール、
Plugin Check の security category、Theme Check を実行します。
Plugin Check と Theme Check はテスト用 WordPress（ポート 8889）を対象に、
wp-env の `tests-cli` で実行します。
Plugin Check は実行成功と ERROR findings の両方を判定し、
Theme Check は CLI の終了コードを尊重します。
WP-CLI からの通常の Plugin Check は静的検査です。wp-env 内で動くことだけを根拠に、
動的な侵入テストやすべての認可テストまで完了したとは扱いません。

`npm run test:wp` は別途、実WordPressへHTTP要求を送り、権限・nonce、下書きの取り込み、旧設定とGlobal Stylesの保持、標準ページ表示を確認します。CIはWordPress 6.6/PHP 8.0とWordPress 7.1/PHP 8.3で実行し、空の結果・不正な結果・PHPの実行失敗も失敗扱いにします。

## 今後の更新配布方針

依存更新と定期セキュリティ検査は導入済みです。以下は配布の実装計画です。
更新 JSON、WordPress 側 updater、Release ワークフローは未実装です。
リポジトリの公開設定も変更していません。

配布時は `nanophate/animewp` を公開し、同じリポジトリの Raw JSON と
GitHub Releases のインストール用 ZIP を使います。
更新 JSON は `main` のルートに二つ置き、`raw.githubusercontent.com` の
`nanophate/animewp/main/wp-theme.json` と
`nanophate/animewp/main/wp-plugin.json` から取得します。

| 対象 | ソース | 更新 JSON | Release のインストール用 ZIP |
| --- | --- | --- | --- |
| テーマ | `themes/animewp/` | `wp-theme.json` | `animewp-X.Y.Z.zip` |
| 任意のブロックプラグイン | `plugins/animewp-blocks/` | `wp-plugin.json` | `animewp-blocks-X.Y.Z.zip` |

一つのJSONは一つのコンポーネントの更新情報を持ちます。`version` は対象ZIPのVersionヘッダーと一致させ、`download_url` にそのZIPを指定します。必要なPHP / WordPressバージョンや変更内容も記載します。

更新クライアントは実装時に方式を確定します。PHPライブラリーの同梱を許容するならPlugin Update Checker (PUC) のgeneric JSON方式を使えます。配布コード全体をライブラリーなしに揃える場合は、WordPress Coreの更新フィルターとHTTP・キャッシュAPIで実装します。いずれもJSONの型・HTTPSの配布先・バージョンを検証し、通信失敗時は通常の管理画面を妨げず、互換条件と期限付きキャッシュを扱います。

現行の検査はテーマとプラグインのリリース番号を同じに揃えます。最初は同じタグから2つのZIPとJSONを作り、WordPress上での適用はそれぞれ行います。将来別々の番号へ分ける場合は、メタデータ検査とリリース処理も同時に変更します。
テーマの更新検出を、任意のブロックプラグインの有効化に依存させません。
`Update URI` は WordPress.org の同名パッケージによる誤上書き防止に使いますが、
そのヘッダーだけでは更新検出機能は付きません。

### リリースと導入の順序

1. `main` に取り込んだソースをビルドし、既存 CI と依存監査を通す。
2. `scripts/package.py` で単体 ZIP を作成し、各パッケージの Version、必要 PHP / WordPress バージョン、ZIP の内容とハッシュを確認する。
3. 正式な GitHub Release にバージョン付きの単体 ZIP を公開し、ダウンロードできることを確認する。
4. ZIP の公開成功後に、対象コンポーネントの JSON を `main` で更新する。
5. WordPress が各 JSON を確認し、標準の更新画面に新バージョンを表示する。

`download_url` は `github.com` の `nanophate/animewp/releases/download/<tag>/<ZIP名>` のように、
タグとファイル名で版を固定します。正式 Release と対応 ZIP がそろった版だけを JSON に載せ、
draft、prerelease、移動する latest リンク、GitHub のソース ZIP、検証用 ZIP を指定しません。
ZIP の公開に失敗した場合は JSON を更新しません。

初回導入は Release から単体 ZIP をダウンロードし、WordPress のテーマ／プラグインの
アップロード画面でインストールします。更新コードを含まない旧版も、最初の一回は
updater を含む新しい ZIP を手動でアップロードして置き換えます。

### 運用

更新通知と無人でのインストールは分けて導入します。
最初は WordPress の更新画面から確認して適用し、バックアップと表示・編集確認を行います。
テーマとプラグインの更新は一つのトランザクションではないため、
前後の版を組み合わせた互換性を維持します。

DB に保存した本文やサイトエディターのテンプレートは通常ファイル更新後も残ります。
保存済みテンプレートが初期テンプレートに優先する点は既存 README を参照してください。

Dependabot はこの開発リポジトリの依存関係を更新するもので、
本番サイトに入れた別のプラグインや WordPress core を網羅して監査するものではありません。
本番側のインベントリと既知脆弱性を確認する場合は WPScan 等を別の検査として運用します。
また、CodeQL は現在 PHP を対応言語に含めていません。

## 参考資料

Dependabot options reference、Dependabot on Actions、Actions schedule、
npm audit、Composer audit、Plugin Update Checker、WordPress の Update URI、
GitHub Releases、Plugin Check、Theme Check CLI、CodeQL の公式資料を参照してください。
参照先 URL はこの変更の PR 本文に記載します。
