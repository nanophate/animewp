# 更新配布と定期セキュリティ検査

## この変更の適用先

この設定は `main` にマージ済みの AnimeWP v2 の依存関係と検査構成を対象とします。
定期実行と通常の Dependabot 更新 PR は、設定が既定ブランチに入ってから有効になります。

## 自動化する検査

| 検査 | 対象 | タイミング |
| --- | --- | --- |
| Dependabot version updates | GitHub Actions、ルートと `tests/serialization` の npm、`tests/security` の Composer | 毎週月曜 04:17 JST |
| npm / Composer audit | 上記3箇所の lockfile。開発用依存も含む（扱いは下記） | PR、main の push、毎日 04:23 JST、手動 |
| 既存のソース・ZIP・WordPress セキュリティ検査 | テーマとプラグイン | main への push、PR、毎週月曜 04:37 JST、手動 |

ソース／WordPress／ブラウザーの検証は PR に対して実行し、ブランチへの単独 push では重複起動しません。main への push は別途検証します。GitHub Actions の無料枠とランナー使用量のため、同一変更の二重実行を避けます。

GitHub Actions の cron は UTC に換算して記述しています。実行時刻は目安で、
GitHub 側の混雑等で遅延することがあります。

GitHub-hosted runnerの共有送信元がDocker Hubの匿名pull制限に達すると、PHP/WordPress検査はコード実行前に落ちます。テスト専用の `scripts/ci/prefetch-images.sh` は Docker公式イメージのAmazon ECR Publicミラーを先に取得し、元の `php:...`・`mariadb:lts`・`phpmyadmin:latest`・`composer:2`・`wordpress:phpX.Y`・`wordpress:cli-phpX.Y` タグとしてローカルに登録します。許可した9タグに限定し、WordPressのビルド時に不要なDocker Hubへのリクエストが発生しないようにします。ミラーが利用できない場合は既存のDocker Hub経路へ戻ります。配布物には影響しません。別レジストリの利用でも必ずイメージの出所と更新内容を確認してください。

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
  外部のサーバーからも読み込みません。動画プレーヤー（背景の無音自動再生を含む）は明示設定時に接続し、YouTubeのサムネイルは編集者の操作で取り込みます。更新確認・ZIP取得では、WordPressサーバーから固定のGitHub配布先へ接続します。
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
自前配布では `Update URI` が必須なので、WordPress.org掲載用の「Update URI禁止」だけを
テスト用adapterで除外します。公式WP-CLIの `after_wp_load` hookで
`Style_CSS_Header_Check` を委譲し、AnimeWPの期待する正確なヘッダー1行だけを
その検査のメモリ上の入力から除きます。配布ファイルや他の検査は変更しません。
未知のURI、欠落・重複ヘッダー、他の必須項目不足、CLIの実行失敗は引き続き失敗します。
実際にインストールしたTheme Checkに対する回帰テストで、この範囲を確認します。
WP-CLI からの通常の Plugin Check は静的検査です。wp-env 内で動くことだけを根拠に、
動的な侵入テストやすべての認可テストまで完了したとは扱いません。

`npm run test:wp` は別途、実WordPressへHTTP要求を送り、権限・nonce、下書きの取り込み、旧設定とGlobal Stylesの保持、標準ページ表示を確認します。CIはWordPress 6.6/PHP 8.0とWordPress 7.1/PHP 8.3で実行し、空の結果・不正な結果・PHPの実行失敗も失敗扱いにします。

## GitHub Releasesからの更新配布

2.0.1から、更新JSON、WordPress側の更新クライアント、Releaseワークフローを実装しています。
配布先はこのリポジトリのRaw JSONとGitHub Releasesです。S3、R2、別の更新サーバー、
WordPressサイトに保存するGitHubトークンは不要です。公開配布にはリポジトリのpublic設定が必要です。
このコードのマージ自体は、リポジトリの公開設定を変更しません。

| 対象 | ソース | mainの更新JSON | Releaseのインストール用ZIP |
| --- | --- | --- | --- |
| テーマ | `themes/animewp/` | `wp-theme.json` | `animewp-X.Y.Z.zip` |
| 任意のブロックプラグイン | `plugins/animewp-blocks/` | `wp-plugin.json` | `animewp-blocks-X.Y.Z.zip` |

JSON取得先は `raw.githubusercontent.com` の
`nanophate/animewp/main/wp-theme.json` と `nanophate/animewp/main/wp-plugin.json` に固定します。
一つのJSONは一つのコンポーネントを表し、`schema_version`、`status`、種類、slugを持ちます。
初期状態は `status: unpublished` で、更新候補を返しません。
公開済み情報には版番号、必要なWordPress・PHP版、確認対象のWordPress版、名前、変更内容、
固定ZIP URL、SHA-256、Releaseの公開日時（UTC）を含めます。
開発中のソースが次の版へ進んでも、公開済みJSONは直近の配布版を保ちます。

### WordPress側の動作

外部PHPライブラリーは同梱せず、WordPress Coreの更新フィルターとHTTP・キャッシュAPIを使います。
両ZIPには `shared/distribution-updater.php` の同じ実装をコピーし、
`python3 shared/sync-updater.py --check` で一致を確認します。
変更時は共通ソースを編集し、同スクリプトを `--check` なしで実行して両コピーを同期します。
実装を変更して配布する際は、共通ソース内の実装版番号とクラス名も進めます。
両コンポーネントが異なる版でも、新しい実装を一度だけ登録します。

- 2.0.1以降のテーマかプラグインの一方が有効なら、2.0.1以降へ導入済みの両方を確認できます。2.0.0以前の相手にはUpdate URIがないため、初回はそれぞれ手動ZIPで置き換えます。
- 両方とも無効なら更新コードはロードされません。手動ZIPで更新するか、一方を有効化します。
- `Update URI` は同名のWordPress.org配布物による誤上書きを防ぎ、更新取得はPHPのフィルターが担当します。
- サイトの本文、テンプレート、既存のデザイン設定を更新確認だけで書き換えません。更新用キャッシュはDBへ保存します。
- WordPressサーバーからGitHubへ通信します。訪問者向けにGitHubのJS/CSS・フォントを読み込む処理はありません。
- WordPress標準の自動更新設定を尊重します。このコードから無人更新を強制的に有効化しません。

成功した情報は1時間、失敗は5分キャッシュします。通信に失敗した場合は、
最後に正常取得した公開情報を最大7日間利用します。明示的な `unpublished` は古い候補も取り下げます。
「ダッシュボード → 更新 → もう一度確認」は短期キャッシュを消して再取得します。
WordPress自体の定期更新確認とGitHub側のキャッシュがあるため、公開直後の即時表示は保証しません。
通常の管理画面を通信エラーで止めず、適用に必要な検証ができない場合は更新処理だけを止めます。
更新処理固有の診断文は英語です。画面やボタンはWordPressの言語設定に従います。

JSONは型、コンポーネント、安定版 `X.Y.Z`、必要環境、公開日時、SHA-256、配布先を検証します。
ZIPのURLは同じowner/repository・同じ版のタグ・正しいZIP名に固定し、認証情報、クエリー、
別ポート、別ホストや別リポジトリは受け付けません。ダウンロード時はGitHubのHTTPS配布ストレージへの
リダイレクトだけを許可し、ダウンロード後のSHA-256が一致してからWordPressへ渡します。
WordPress・PHPの最低要件を満たさない場合もインストールを止めます。

SHA-256はZIPとJSONの対応や破損・差し替えを検出するものです。
同じリポジトリのJSONとZIPの両方を書き換えられる権限の侵害に対する署名ではありません。
リポジトリの権限、レビュー、アカウント保護は別途維持します。

### 通常の公開は main／タグから自動実行

**public リポジトリでは、新しい版番号の変更を main にマージすると正式Releaseまで自動で進みます。**
通常運用で `Run workflow` を押す必要はありません。リリース対象の版番号を含むPRのマージを公開の意思決定として扱います。
事前に Settings → Actions → General → Workflow permissions の
`Allow GitHub Actions to create and approve pull requests` を有効にして保存します。
この許可自体は自動承認・自動マージを有効にするものではありません。

1. テーマ、プラグイン、各block.json、readmeと導入例の版番号を同じ新しい `X.Y.Z` に揃え、
   両コンポーネントのreadme.txtにその版のChangelogを追加し、PRでレビューします。
2. mainにマージすると、そのコミットのソース・WordPress・依存監査・ブラウザー試験を実行します。
3. 全検証を通してから2つのZIPとSHA256SUMSを作り、固定SHAの候補artifactを保存します。
4. 最後のジョブが新規タグとDraftを作り、添付したバイト列を再取得・検証します。
5. publicの場合は **同じ実行内で** 正式Releaseに進み、認証なしでも両ZIPのハッシュを確認します。
6. 検証済みの `wp-theme.json` と `wp-plugin.json` だけを同じコミットにした
   `release/feeds-vX.Y.Z` ブランチとmain向けPRを作成します。mainへ直接書き込みません。
7. PRにCI実行の承認が表示されたら `Approve workflows to run` を押し、必須CIと2ファイル差分を確認して通常どおりマージします。
   **このマージでWordPress向け更新配信が始まります。Release公開だけではJSONは変わりません。**

手元や別のツールでmainに取り込まれたコミットへ新しい `vX.Y.Z` タグをpushする場合も、自動公開します。
ビルド対象は常に **タグが指すコミット** で、公開処理には固定したmainのコードを使います。
タグの移動・削除・不正な版番号・mainに含まれないコミットは公開しません。
タグのpushで使われるワークフロー定義はそのタグの版です。この自動化を含むコミットにタグを付けてください。
既存の古いタグには新しいYAMLが遡って適用されるわけではありません。

`GITHUB_TOKEN` で作成したタグから別の `push.tags` 実行は連鎖起動しないため、
`scripts/release_automation.py` は既存の `release.py` によるDraft検証を完了した後、
同じジョブで正式公開と更新PR作成へ続けます。PAT・別のGitHub App・追加のsecretは不要です。
最初のタグ作成前にも公開済みJSONの版を確認し、古い実行からの巻き戻しを拒否します。

すでに版のタグが存在する通常のmain pushは自動公開をスキップします。
したがって、版番号を変えない保守PRや更新JSON用PRをマージしてもリリースを増やしません。
両JSONを `unpublished` にして配信を取り下げた場合も、次の通常マージが勝手に再公開することはありません。
未公開Draftを含む既存タグを再開するときだけ、次の復旧操作を使います。
リポジトリがprivateの場合は、新規main／タグ起動でもDraftまでで停止します。

### 既存タグの公開・失敗時の復旧

Actions → `Release` → `Run workflow` で **Branchはmain**、既存タグ（例: `v2.0.2`）を指定します。
`publish=true` は検証・公開・更新PR作成まで再開し、既定の `false` はDraftの検証にとどめます。
新規main／タグ起動では公開が自動で、手動起動の `publish` 設定とは区別します。
タグはmain由来であることを再確認し、既存ZIPの異なるバイト列への差し替えは拒否します。

既存の `v2.0.2` はこの自動化より前のタグなので、この設定のマージだけでは公開しません。
その候補を使う場合はmainから一度だけ明示的に再開します。起動のためにタグを削除・付け直したり、
既存アセットを上書きしたりしません。次の新しい版からは上記の自動手順で進めます。

配布先には正式ReleaseのインストールZIPだけを使い、prerelease、latestの移動リンク、
GitHubのSource code ZIP、検証用ZIPは指定しません。
最初の導入はReleaseから手動でZIPをアップロードします。WordPress.orgへの登録・検索結果への掲載は行いません。

### 失敗・再実行・取り下げ

- CIやビルドが失敗した場合は、タグ・Release・JSONを更新しません。
- タグ作成後やアップロード途中で失敗した場合は、失敗ジョブを再実行するか、既存タグを指定して `Release` を手動実行します。
  同じコミット・同じアセットなら再利用できます。異なるファイルは上書きせず、新しい版を用意します。
- Release公開後に匿名ダウンロードが失敗した場合、JSONは以前のままです。配布先を確認して同じタグを再実行します。
- mainがPR作成中に進んだ場合、または `release/feeds-vX.Y.Z` の既存ブランチが
  元のmainと異なる場合は、上書きせず停止します。通常のPR操作でブランチを
  更新／作り直し、同じタグで再実行します。強制pushや保護の迂回はしません。
- `GITHUB_TOKEN` にPR作成が許可されていない場合、検証済みブランチが残ることがあります。
  Settings → Actions → General で許可するか、同ブランチから手動PRを開いてください。
  既存PRが開いていて内容が完全一致する場合、再実行ではそのPRを再利用します。
- Releaseを公開後、PRが未マージの間は両JSONは古い値（または`unpublished`）のままです。
  不完全な配信を避けるため、自動マージは行いません。二つのJSONを一緒にマージしてください。
- 古い版へのJSONの巻き戻し、同じ版の別ハッシュへの差し替え、テーマとプラグインで異なる公開版は拒否します。
- 配布停止が必要なら、両JSONを初期形式の `status: unpublished` にする変更をレビューしてmainへ反映します。
  クライアントが再取得した後は更新候補を取り下げます。インストール済みコードの自動削除は行いません。

初回導入と2.0.0以前からの移行は、updaterを含む新しいZIPを手動で置き換えます。
更新はテーマとプラグインそれぞれに適用され、一つのトランザクションではありません。
前後の版の組合せを維持し、検証環境で更新・表示・編集を確認してから本番へ適用します。
DBに保存した本文やサイトエディターのテンプレートはファイル更新後も保持します。
保存済みテンプレートが初期ファイルより優先する点はREADMEとINSTALL-ja.txtを参照してください。

Dependabot はこの開発リポジトリの依存関係を更新するもので、
本番サイトに入れた別のプラグインや WordPress core を網羅して監査するものではありません。
本番側のインベントリと既知脆弱性を確認する場合は WPScan 等を別の検査として運用します。
また、CodeQL は現在 PHP を対応言語に含めていません。

## 参考資料

Dependabot options reference、Dependabot on Actions、Actions schedule、
npm audit、Composer audit、WordPress の Update URIと更新フィルター、
GitHub Releases、Plugin Check、Theme Check CLI、CodeQL の公式資料を参照してください。
参照先 URL はこの変更の PR 本文に記載します。
