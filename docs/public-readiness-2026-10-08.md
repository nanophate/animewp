# PR #11 マージ後の公開前レビュー — 2026-10-08

## 判断と現在の状態

**PR #11 は修正・検証してマージ済みです。リポジトリの public 化は保留を推奨します。**

今回確認した配布コードに、高重大度の認可迂回・任意コード実行・非権限利用者による SSRF の根拠は見つかりませんでした。履歴と取得できた過去の配布物・ログから検出された秘密情報候補も、元ファイルとの照合で検証用ハッシュと判定できました。一方、main の保護と更新 JSON の反映手順、管理画面側のセキュリティ設定確認が残っています。開発用依存の既知脆弱性も解消済みではありません。

**2026-10-09 追記:** 所有者が過去のコミット内の個人メールアドレスの公開を許容したため、P-01 は公開を妨げる事項から除外します。Git 履歴の書き換えは不要です。また `main` の保護ルールに必須チェック9件の設定が確認できますが、private の現在は GitHub API が `protected: false` を返しています。公開後に実際の強制状態を再確認します。この追記は public 化や Release 公開の承認ではありません。

| 項目 | 確認した状態 |
| --- | --- |
| PR | [#11][pr11] — merged |
| 対象 main | [`9720ea42b1f310a3d582d0e91d95e3b6f107f834`][main] |
| 対象の Git tree | `a7c994bd9c3f3cf0c4b9b595a0ce1fdc1306a72e` |
| リポジトリ | **private** |
| 新しい配布候補 | `v2.0.2`、上記 main の **Draft Release** |
| 更新 JSON | `wp-theme.json` / `wp-plugin.json` とも **`unpublished`** |
| 公開・破壊的操作 | visibility 変更、正式 Release 公開、既存タグ移動、過去のログ・資産削除、履歴改変は行っていない |
| 監査用変更 | `codex/public-readiness-audit` のみ。main の配布コードには追加していない |

このレポートは上記 main と下記の監査時点の証拠を対象にします。今後 main、権限、Release 資産が変わった場合は、その差分を再確認します。

## 1. PR #11 で直したことと検証

元の PR は、カルーセルの読み上げ名、日本語見出しと余白、ヘッダー／サイドバーの表示とアンカー移動を改善する変更でした。レビューで次を追加修正しました。

- 不正な `%` を含む URL fragment で `decodeURIComponent()` が例外にならないようにし、初回のスクロール補正が resize で繰り返されないようにした。
- 600px 以下で WordPress の管理バーが画面上方へスクロールした後、固定ヘッダーに不要な 46px の隙間が残る問題を直した。アンカー位置とスクロール余白も同じ基準にそろえた。
- 実ブラウザーでヘッダー・アンカーとカルーセルの accessible name を確認する回帰ケースを追加した。
- 既存の `v2.0.1` を差し替えず、テーマ、プラグイン、block metadata、キャッシュ版、導入例、変更履歴を **2.0.2** にそろえた。
- Release の単体試験で署名を無効にする設定は、試験が作る一時 Git リポジトリだけに限定した。

修正後の PR head は `984851e5930449e9bb203cab29dade91c3e8e643`。18 個の checks が成功したことを確認し、その head を指定してマージしました。失敗ジョブの単純な再実行で合格扱いにしたものではありません。

| 検証 | 結果と範囲 |
| --- | --- |
| PR で確認した checks | **18 checks 成功**。GitHub 上の required checks 設定とは区別する |
| マージ後 main | Source、Dependency audit、Browser、Release の全 workflow 成功 |
| Release の全体 | **13 jobs 成功** — [実行記録][release-run] |
| WordPress 統合試験 | WP 6.6 / PHP 8.0 と WP 7.1 / PHP 8.3 の各構成で **204 / 204** |
| 保存済みブロック | 各 WP 構成で保存済み 7 文書と生成 3,627 ケースを確認。無効ブロック化する差分なし |
| 今回追加したブラウザー回帰 | 12 ケース × 4 構成 = **48 / 48**。PR と push の両方で成功 |
| ブラウザー構成 | Chromium 2 環境、Firefox、WebKit |
| 既存サイトからの更新 | 実際の v1.3.0 ZIP から 2.0.2 へ更新し、本文・テンプレート・Global Styles・フォント・フロントページ設定の保持を確認 |
| ネイティブ更新 | WordPress のテーマ／プラグイン更新と、ハッシュ不一致 ZIP の拒否を確認 |
| 静的・配布検査 | PHP lint、PHPCS、Plugin Check、範囲を限定した Theme Check adapter、ソース・素材・パッケージ検査が成功 |

CI の `6.6` 構成の実体は 6.6.10、`7.1` 構成は 7.1.4-alpha-64164 でした。WebKit による確認は実機 Safari / iOS の確認とは区別します。実機、全 screen reader、利用者の本番サイトや全プラグイン組合せを検証したものではありません。

## 2. 公開する前に判断・対応する事項

| ID | 優先度 | 確認した事実 | 次に必要なこと |
| --- | --- | --- | --- |
| P-01 | **解決：公開許容** | 1 件の個人メールアドレスが **19 コミット**の author / committer と **52 Actions runs の head_commit metadata** に残っている | 2026-10-09 に所有者が公開を許容。履歴は書き換えない。公開前の追加対応は不要 |
| P-02 | **公開準備** | 保護ルールの必須チェック9件は設定済みだが、private の main は依然 `protected: false`。private の rulesets は Pro または public が必要との 403 | public 化の直後にルールが実際に強制されることを確認し、Firefox のチェック漏れと force push・削除禁止・タグ保護を点検する |
| P-03 | **公開準備** | Release は検証後に両更新 JSON を main へ直接コミットする | 必須 PR 保護を設ける場合、JSON を通常のレビュー経由で反映する手順／実装を整備する。保護の迂回はしない |
| P-04 | **設定確認** | Dependabot alerts、security updates、fork PR の実行承認、Actions の既定権限、secret scanning / push protection 等の管理設定は connector から確認できない | GitHub の設定画面で実際の状態を確認する。YAML があることだけで有効と扱わない |
| P-05 | **既知リスクの保守** | 開発用 npm に high 4 件、critical 2 件が残っており、期限つきの既存例外で受容している | 下記の更新経路を個別に検証し、直った例外を削除する。未対応分の受容を再確認する |
| P-06 | **修正推奨・Low** | 動画 URL の PHP / JS 解釈に差があり、重複 query で動画とサムネイルが食い違い、配列風 query で PHP 警告が出る | PHP を既存 JS の解釈に合わせ、共通の境界ケースで確認する。配布するなら新しい版を使う |
| P-07 | **保守** | Dependabot #3 は現在の main に置き換えられた可能性が高く、#6 / #10 は別途検証が必要 | 不要な PR の整理、DOM major 更新、Actions major 更新をそれぞれ現在の main で評価する |

### 個人メールアドレスの扱い

実アドレスはこの文書や監査成果物に転載していません。影響するコミットと Actions run の ID は付属の証跡 JSON に記録しています。今後の Git 設定を noreply に変えても、過去のコミットに記録されたアドレスは消えません。[GitHub の説明][email-docs]

さらに、取得した 161 runs の metadata のうち 52 件の `head_commit.author.email` / `head_commit.committer.email` に同じアドレスが残っています。代表の run `37769994552` は PR #11 修正前の `0223141` を指し、Git の commit metadata と実際に一致しました。Git 履歴を変更するだけでは、既存の Actions metadata の扱いまで解決したことにはできません。[GitHub の workflow run API][run-api-docs]

2026-10-09 に所有者がこのアドレスの公開を許容しています。したがって、メールアドレスだけを理由とした履歴の書き換え、配布用リポジトリの分離、関連する Actions 履歴の削除は不要です。今後のコミットで noreply を使うかどうかは別途選べます。

### main の保護と JSON 配布

WordPress が取得する JSON は main 上にあります。JSON と ZIP の両方を書き換えられる権限の侵害を、同じ JSON 内の SHA-256 では防げません。レビューとブランチ／タグ保護は、利用中の WordPress へ配るコードの信頼性に直接関係します。

一方で、現行の Release writer は main へ直接書くため、必須 PR の保護を有効にすれば反映が拒否される構成になり得ます。その場合は正常に停止し、通常の PR で検証済みの両 JSON を一緒に反映してから再開するのが現在の文書化された方針です。自動で JSON 用 PR を作る処理はまだ実装されていません。Release job の environment reviewer による承認も設定されていません。[現行の更新配布手順][maintenance]

契約上、private の rulesets API は Pro または public を要求して拒否します。2026-10-09 の `branches/main` 応答には設定された必須チェック9件が表示されますが、同時に `protected: false` です。設定の保存と強制状態は別と考え、public 化直後に保護の有効性を確認します。必要なチェックのうち Firefox 7.1 / PHP 8.3 は未指定のため追加します。今回、課金・公開設定の変更は行っていません。

## 3. Git 履歴の監査

[監査実行][history-run]は `codex/public-readiness-audit` 上で行い、main、既存の他ブランチ、タグ、GitHub の PR head / merge refs を取得しました。shallow clone、参照の前後変化、欠落 object、Git の整合性を確認しています。対象 main は実行中も固定して検証しました。

| 項目 | 件数・結果 |
| --- | --- |
| 取得可能な Git refs | **26** — heads 5、PR refs 14、tags 7 |
| 到達可能な commit | **52** |
| blob / tree / tag object | **787 / 438 / 1** |
| object 合計 | **1,278**、9,634,844 bytes |
| Gitleaks の全履歴 patch 検査 | **0 findings** |
| 全到達 object の文字列検査 | **0 findings** |
| 追加のプライバシー候補 | 95 レコード。上記の個人メール以外は bot / 公開上流の連絡先、例示・回帰テストの URL 等と照合 |
| binary blob | 6。下記の画像 2 版・翻訳 4 版として別途確認 |
| Git 内 archive / LFS pointer / submodule | **0 / 0 / 0** |

Gitleaks は **8.30.1** を公式バイナリ、チェックサム、固定した設定で検証して実行しました。リポジトリ内の ignore、baseline、allow コメントによって検査を省略しません。上流の既知プレースホルダー等の rule 固有の扱いは維持しています。scanner 実行時にはリポジトリ認証情報を渡していません。[検査プログラム](../tests/security/public-history-audit.py)

履歴検査には当時の監査用ブランチも含みます。後続の triage とこのレポートのコミットは検査後の追加で、main のコードは変えていません。これらの追加ファイルは別途レビューしています。到達不能になったサーバー object、削除済みのコピー、外部 fork までは GitHub の参照一覧から取得できません。

### 履歴中の binary

- `themes/animewp/screenshot.png` の 2 版を目視した。どちらもダミーのテーマ紹介画像で、私的な管理画面・URL・人物の写り込みは見当たらなかった。PNG の metadata は色空間と寸法に限られ、text chunks、GPS、作成者、末尾の余剰データはなかった。
- `plugins/animewp-blocks/languages/animewp-blocks-ja.mo` の 4 版は、同時点の PO とカタログが一致した。各 146 / 222 / 292 / 295 件。連絡先、内部 host、ローカルパス、代表的な秘密値のパターンは見つからず、余剰の末尾データもなかった。

## 4. PR・既存 Release・Actions の監査

リポジトリを public にすると、現在のソースだけでなく過去の Actions の実行履歴・ログも見られるようになります。既存の正式 Release 5 件も公開範囲に入るため、今回の `v2.0.2` を Draft にしておくだけでは過去の資料は隠れません。[GitHub の visibility 説明][visibility-docs]

2026-10-08 **12:55:08 UTC** を起点に一覧を確定し、GET のみで残存するデータを収集しました。リダイレクト先へ GitHub の認証ヘッダーを渡さず、アーカイブのパス・種別・サイズ・展開量を検証しました。private な原本はジョブ終了時に消し、場所・分類・ハッシュだけのレポートを保存しています。[収集プログラム](../tests/security/public-surface-audit.py)

| 対象 | 結果 |
| --- | --- |
| PR とコメント | 11 PR、2 issue comments。取得された review / commit comment 等も対象 |
| 既存の正式 Release | **5 件、添付 29 個**をダウンロード・照合・検査 |
| Actions の一覧 | **161 runs** |
| 完了済みログ | **157 run attempts** を取得・検査 |
| Actions artifacts | **128 個**を取得・検査 |
| 検査用の text views | **7,039**。archive members 6,389 |
| 取得の欠落 | **0 coverage gaps** |
| 秘密情報パターン | **10 findings**。下記のとおり全件を検証用ファイルハッシュと照合 |
| プライバシー候補 | 3,449 レコード = binary / visual 2,860、email 586、userinfo URL 3 |
| 定義した GitHub attachment URL / private IP・内部 host の候補 | 0。任意のリンク先へはアクセスしていない |

メール候補 586 レコードのうち 161 件は Actions 実行の metadata です。この一覧 API の commit 情報も照合し、上記 P-01 の個人メール 52 runs を確認しました。

メール候補 586 レコードのうち、**549 レコードは直接または原本との対応を確認**しました。PR 本文の例示、WordPress 試験の `.invalid` アドレス、連絡先ページの予約済み example domain、公開済み上流の連絡先が該当します。1 件は PNG の圧縮 IDAT 内の偶然の文字列一致で、テキスト metadata はなく、画像もテスト用画面と確認しました。userinfo URL の 3 件は、古い source ZIP にある provider の URL 拒否試験と対応しています。

ログについては **102 runs / 384 jobs の全文**を追加で読み、886 回のメール文字列がすべて npm の `glob` 廃止警告に出る同じ公開メンテナ連絡先と一致しました。この全文検査に未知のメール・個人メールはありません。archive 内のメール候補 413 レコードのうち 376 件は run / attempt / byte 数 / 出現数で全文と対応しました。**残る 37 件（8 runs）は、同じ実行の全文を確認したものの、archive 内の個々の member との byte 単位の対応付けは未確定**です。8 runs とも取得元・追加確認した jobs は attempt 1 で一致しており、別の再実行を見たことによる差ではありません。全候補の直接照合が完了したとは扱いません。

最初の収集は Actions のダウンロード API に渡す Accept の不整合で 415 が出ました。Release asset と Actions の API を区別し、回帰テストを追加したうえで再収集しました。上表は修正後の完全に取得できた実行の値です。取得失敗を成功扱いにしたものではありません。

### 10 件の検出候補の実体

対象は `animewp-verification-1.2.1.zip`（asset `612691713`）と `animewp-1.3.0-verification.zip`（asset `613399693`）でした。インストール用 ZIP ではなく、過去の検証結果をまとめた ZIP です。

| JSON 内の対象 | findings | 元ファイルとの照合 |
| --- | ---: | --- |
| Theme Check の environment 記録内の `checks/class-escaping-check.php` | 4 | 公式 WordPress/theme-check の blob `f233d27f15eeb0f6124ab237b906d0c52d20fcb7` の SHA-256 と一致 |
| release manifest の `assets/images/animewp-key-visual-a.svg` | 2 | 実際の同名素材の SHA-256 と一致 |
| release manifest の `assets/images/animewp-key-visual-b.svg` | 2 | 実際の同名素材の SHA-256 と一致 |
| release manifest の `inc/design-tokens.json` | 2 | `v1.3.0` の同名設定ファイルの SHA-256 と一致 |

照合は JSON scalar のハッシュと JSON key のハッシュも比較し、単に「64 文字だからハッシュだろう」と判断したものではありません。[専用 triage の記録][triage-run]と付属の証跡 JSON に、10 件それぞれの位置と元ファイルの検証情報を残しています。

**元の Gitleaks 検出 10 件は消していません。** 監査と triage のジョブ表示は検出候補があるため failure のままです。その後の手動判定で全件を false positive と分類したのであり、配布用 CI の合格と同じ意味ではありません。ignore の追加や redaction の緩和はしていません。

### 監査範囲の限界

- 監査時に実行中だった main Browser と監査ブランチの Source / Browser は一覧から明示的に除外した。後に各 workflow の成功を確認した。現在の監査自身や後続 triage のログは、機微な値を出さないコードと実ログを別途レビューした。後続の全ログを同じ一括収集へ入れたものではない。
- read-only の `GITHUB_TOKEN` は Draft Release の一覧を返さないため、`v2.0.1` と `v2.0.2` の Draft は既存の正規アクセスから別途 metadata と候補／実添付のハッシュを確認した。Draft を見るために監査 job の権限を write に広げてはいない。[GitHub の Draft 一覧の仕様][release-api-docs]
- 2,860 件の binary / visual レコードは重複する成果物も含む。文字列検査は OCR やすべての画像の目視、第三者の権利の証明にはならない。今回のコード素材、履歴中の画像、現在のブラウザー代表画面は別に確認した。
- 削除・期限切れの過去データ、編集前の本文、非公開の review draft、GitHub 側のキャッシュ、外部 fork は網羅できない。今回列挙され、取得対象になったデータには未取得の gap はなかった。
- wiki、Discussions、Pages はリポジトリ metadata では無効。本番 WordPress、他プラグイン、利用者が後から登録する画像・動画・認証情報はこの監査の対象外。

## 5. 配布コードと素材

### 権限と入力処理

YouTube poster の REST POST は `upload_files` と Core の REST 認証に保護されています。スターター作成・復元・プレビューは用途別 nonce と必要な capability を確認し、新規投稿は draft、既存本文は自動置換しません。SQL は固定の option と prepared query を使い、ロックの解放は所有値を確認しています。旧フォント設定のリセットは固定した自前 option に限定されています。

Motion の属性は enum・数値範囲に正規化し、Core の HTML tag processor を使用します。配布 JS に `eval`、`new Function`、`document.write`、`innerHTML` 等の危険な実装の根拠は見つかりませんでした。プレーヤー URL は固定した provider と検証済み ID から構成しています。activation / deactivation / uninstall によって保存済み投稿を削除する処理はありません。

### 外部通信

動画カードは再生時、YouTube poster は編集者の取得操作時に通信します。**`follow-video` 背景を明示して使った場合はページ表示時に通信します。** この動作は編集画面と README に説明があります。ユーザー指定の画像・動画と GitHub の更新通信も別に存在します。「すべての外部通信が再生クリック後」という説明にはできません。

### 確認した Low の不具合

[`includes/video-providers.php`][provider-php] は PHP の `parse_str()`、[`src/shared/providers.js`][provider-js] は `URLSearchParams.get()` を使います。

| 入力条件 | JS / PHP の差 |
| --- | --- |
| 同じ `v` を 2 回指定 | JS は最初の動画、PHP は後の動画の poster |
| `v[]=...` | PHP は拒否するが Array to string conversion の警告も出る |
| 正常な v と `t[]=1` / `start[x]=1` | JS は開始位置 0、PHP は警告を出して拒否 |
| 空の `start` と `t=12` | JS は 12、PHP は 0 |
| 数字だけの fragment | JS は拒否、PHP は開始位置として受理 |

実 WP 6.6 / PHP 8.0 の disposable 環境で REST を通し、未ログインは 401、Subscriber / Contributor は 403、いずれも警告・外向き HTTP なしと確認しました。Author / Administrator など `upload_files` を持つ利用者だけが処理へ進みます。外向き通信を遮断して検証し、private IP、userinfo、偽の YouTube suffix host は拒否され、無効 URL では HTTP は発生せず、添付数も変わりませんでした。

このため、確認した影響は権限を持つ編集者の警告・応答／ログ汚染とサムネイルの不一致です。認証迂回や任意ホストへの SSRF と判断する根拠はありません。保存済みブロックの動作を保つため、まず PHP を JS の最初の scalar 値・優先順位に合わせる修正を勧めます。

### ZIP と素材

テーマ ZIP は 97 ファイル、プラグイン ZIP は 154 ファイルでした。`.git`、`node_modules`、`vendor`、tests や workflow は配布しません。GPL 全文は root / theme / plugin で一致しています。プラグインは自作ソース 67 ファイルも同梱します。外部 npm コードや npm 由来 CSS が production chunk に入ることは build policy で拒否しています。

フォントファイルは 0、テーマ SVG 7 個とプラグイン SVG 6 個には script、foreignObject、外部 href、DTD / entity はありません。テーマの素材 manifest は 8 ファイルすべてハッシュが一致し、プラグインの 6 形状は個別に検査しました。プラグイン素材を manifest に加えると、将来の確認を自動化しやすくなります。

現在の screenshot は 1200 × 900 のダミー紹介画像です。README と manifest は素材をオリジナルとして GPL で提供する旨を宣言しています。今回確認したのはその宣言・内容・ハッシュの整合性で、第三者の権利を独立に証明したものではありません。

## 6. 依存関係と継続的な検査

今回の Release の実監査では、production と分類される npm、serialization 用 npm、Composer は既知 advisory 0 件でした。一方、root の開発用 npm は **low 1、moderate 8、high 4、critical 2** の unique advisories が残っています。npm の metadata に出る 45 個の影響パッケージ・推移的レコードとは数え方が異なります。

high / critical の 6 件はすべて既存の例外で、見直し期限は **2027-01-08** です。今回例外を増やしたり期限を延長したりしていません。CI 成功は既存方針に適合したという意味で、脆弱性が修正されたという意味ではありません。[受容記録][accepted]

| Advisory | 現在の対象 | 修正版・対応経路 |
| --- | --- | --- |
| [GHSA-v5rq-49vh-5v5c](https://github.com/advisories/GHSA-v5rq-49vh-5v5c) | `@simple-git/argv-parser 1.1.1`、Critical | 2.0.1。simple-git 4.0.2 が取り込む |
| [GHSA-x6jw-m9v5-85vh](https://github.com/advisories/GHSA-x6jw-m9v5-85vh) | `simple-git 3.36.0`、Critical | 4.0.1。関連修正も含め 4.0.2 を評価する |
| [GHSA-g4wm-2vf7-vfgr](https://github.com/advisories/GHSA-g4wm-2vf7-vfgr) | `simple-git 3.36.0`、High | 4.0.0。上と同じ互換性対応が必要 |
| [GHSA-858h-whjf-mvg5](https://github.com/advisories/GHSA-858h-whjf-mvg5) | `simple-git 3.36.0`、High | 4.0.0。上と同じ互換性対応が必要 |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces 3.0.3`、High | 監査時点で修正版なし。上流または置き換え経路を継続確認 |
| [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq) | `serialize-javascript 6.0.2`、High | 7.0.3。copy-webpack-plugin 経由の更新とビルド・保存形式を検証する |

監査時点で直近の WordPress 開発ツールは `@wordpress/env 11.17.0` と `@wordpress/scripts 36.1.0` で、main はすでにそれらを使用しています（[env の registry](https://registry.npmjs.org/%40wordpress%2Fenv/latest)、[scripts の registry](https://registry.npmjs.org/%40wordpress%2Fscripts/latest)）。wp-env のコードは callable な `require('simple-git')` を 2 箇所で使っており、4 系は named export に変わるため、無検証の override では壊れます。[simple-git の変更履歴](https://github.com/steveukx/git-js/blob/main/simple-git/CHANGELOG.md)も参照してください。serializer の major も依存元の範囲外です。`npm audit fix --force` が提案する古い WordPress ツールへの downgrade は解決策として採用しません。

公開 fork の PR は、テストするビルドスクリプトや設定を変更できます。「リポジトリ内の入力だから信頼済み」とは扱えません。現行 CI は read-only のテスト権限、GitHub-hosted runner、checkout の資格情報非保存、package cache 無効、`pull_request_target` / `workflow_run` を使わない構成です。Release は自分の実行で main 由来の候補を作り、PR の artifact を再利用しません。ブラウザー試験の旧 ZIP 取得には read-only の `github.token` を一時的に使うため、「全テストが token を一切持たない」とも表現できません。

### 定期実行の現在の範囲

| 機能 | 設定上のタイミング | 守備範囲 |
| --- | --- | --- |
| Dependabot version updates | 毎週月曜 04:17 JST | npm、Composer、GitHub Actions の更新 PR |
| npm / Composer audit | 毎日 04:23 JST、PR、main push、手動 | lockfile の既知 advisory。新規・期限切れ・範囲外の重大な dev finding も拒否 |
| Source / WP / package checks | 毎週月曜 04:37 JST、push、PR、手動 | ソース・配布物・WP の統合とセキュリティ検査 |
| Browser / ZIP upgrade | push、PR、手動、Release | 実ブラウザー、既存 ZIP、WP の native update |
| 今回の全履歴・過去成果物監査 | **private の監査ブランチでの一回限り** | 継続 secret-scan workflow を main に導入したわけではない |

GitHub の現在の説明では、SHA だけで固定した Actions は Dependabot の脆弱性アラート対象になりません。SHA pin は維持しつつ、version update PR と上流の security / release 情報を確認する必要があります。日次 npm / Composer audit が Actions の脆弱性まで検査しているとは扱いません。[GitHub の secure use reference][actions-security-docs]

### 既存 Dependabot PR の整理

- [#3](https://github.com/nanophate/animewp/pull/3)：main の linkify-it 5.0.2、markdown-it 14.3.2、各系統の修正版 minimatch に置き換えられた可能性が高い。差分を再比較して不要なら閉じる／作り直す。
- [#6](https://github.com/nanophate/animewp/pull/6)：jsdom 24.1.3 → 30.1.2。現在の serialization audit は 0 件で、6 件の重大 advisory の修正ではない。DOM と保存済みブロックの検証をして別途判断する。
- [#10](https://github.com/nanophate/animewp/pull/10)：checkout / setup-node / upload-artifact / download-artifact の major 更新。提案 SHA が公式 Release と一致することは確認した。3 箇所の checkout の版コメントを直し、現在の main で候補 artifact と digest の扱いを確認する。

これらの PR を今回まとめてマージしてはいません。

## 7. Draft 2.0.2 と更新配布の確認

[Release 実行][release-run]は全 13 jobs 成功し、tag `v2.0.2` は監査対象 main と一致しています。Draft ID は `406821507`。ログでは `PUBLISH: false` と live feeds 未変更を確認しました。

| 資産 | bytes | SHA-256 |
| --- | ---: | --- |
| `animewp-2.0.2.zip` | 519,323 | `45874fb6678dcb73bc3a1759685f9a63dd63069fde92788b49884d975ed27008` |
| `animewp-blocks-2.0.2.zip` | 604,009 | `7caeadc1cb92d3b58ff262f57e89cc198e0d7e0c363da37a44f5efd7b932e562` |
| `SHA256SUMS` | 175 | `1f1867bba4bd3006bcefbb8d0bb5f468fc96e4b5ccb12709a4ba89603306f9e7` |

候補 artifact を実際にダウンロードして照合し、Release job も添付した実資産を再取得して同じハッシュを確認しました。既存 `v2.0.1` Draft とその資産は差し替えていません。

ローカルでは node_modules を別 worktree への symlink で参照していたため、plugin ZIP の webpack module ID と対応する asset version hash が CI と異なりました。9 JS の構文木の差は module 定義と require 引数の数値 20 個だけで、対応する ID を正規化すると全 9 ファイルが byte 単位で一致しました。`shared/providers.js` については loader の相対パスから実際に CI の ID 840 と local の ID 319 を再現しています。依存ハンドル、実行ロジック、文字列、その他の収録ファイルに差はありません。任意のディレクトリ配置で ZIP が常に byte 単位で一致するという保証とは区別します。

updater はコンポーネント・slug・安定版番号・必要環境・日時・固定 URL・SHA-256 を検証し、JSON のサイズと取得時間を制限します。ZIP は同一 repo・同一版の正式な資産 URL に限定し、認証情報付き URL や別 host を拒否、許可した GitHub 配布ストレージへの HTTPS redirect とダウンロード量を制限し、ハッシュ一致後に WP へ渡します。失敗で管理画面全体を止めず、検証できない更新は止める動作です。[共通 updater][updater]

本方式で S3 / R2 や WP 側の GitHub token は不要ですが、匿名での配布には public な repo と正式 Release が必要です。現在は private + Draft + unpublished なので、実際の匿名更新が可能になったとは言えません。正式公開時の workflow は匿名ダウンロードと hash 確認を通してから JSON を反映します。

最初の導入と 2.0.0 以前からの移行は、updater を含む ZIP の手動インストールが必要です。2.0.1 以降のどちらか一方が有効なら対応版の両コンポーネントを確認します。両方とも無効なら PHP 更新コードは動きません。WP 標準の自動更新設定を勝手に有効化する処理はありません。

## 8. 次の作業の順序

1. **個人メールを履歴・Actions metadata とともに公開するか決める。** 不可の場合は公開用リポジトリ分離と履歴・関連情報整理の影響を比較し、方針確定後に実行する。
2. **保護と公開操作の手順を確定する。** main の required review / checks、force push・タグ保護、fork PR 承認、read-only の Actions 既定権限、Dependabot / secret scanning の実設定を確認する。JSON の反映は保護と両立する PR 経路にする。
3. **Low の URL 解釈不一致を修正する。** PHP / JS の共通ケース、権限拒否、無効 URL の HTTP なしを確認する。配布コードを変える場合は既存 2.0.2 のタグ・ZIPを差し替えず、新版の候補を作る。
4. **依存更新を個別に進める。** #10、serializer の更新経路、wp-env / simple-git の互換性、braces の上流対応、#3 / #6 の整理。期限つき例外と公開 fork の入力リスクを再確認する。
5. **公開対象を最終確認する。** この監査後に増えた差分・ログ・成果物と、過去の検証用 ZIP を今後も公開対象として残すかを確認する。機械検査・目視の限界を踏まえ、ここで public 化を判断する。
6. **公開する判断をした後に実行する。** visibility と保護の設定、対象タグの `publish=true`、匿名 ZIP 照合、両 JSON のレビュー反映、検証用 WP での手動導入・更新確認の順に進める。

今回の完了範囲は、PR #11 のマージ、マージ後候補の検証、公開前監査と残作業の具体化です。public 化の承認や、上記の未実施作業が完了したことを意味しません。

## 証拠・参照

- [機械可読の監査証跡と検出候補の照合](public-readiness-evidence-2026-10-08.json)
- [PR #11][pr11]、[対象 main][main]、[PR Browser][pr-browser]、[Release][release-run]
- [履歴・GitHub surfaces の実行][history-run]、[古い検証用資産の triage][triage-run]
- [現行の保守・公開手順][maintenance]、[依存リスク受容記録][accepted]
- [GitHub: repository visibility][visibility-docs]
- [GitHub: commit email][email-docs]
- [GitHub: Release API][release-api-docs]
- [GitHub: Actions secure use][actions-security-docs]
- [Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)
- [WordPress/theme-check](https://github.com/WordPress/theme-check)

[pr11]: https://github.com/nanophate/animewp/pull/11
[main]: https://github.com/nanophate/animewp/commit/9720ea42b1f310a3d582d0e91d95e3b6f107f834
[pr-browser]: https://github.com/nanophate/animewp/actions/runs/37777763016
[release-run]: https://github.com/nanophate/animewp/actions/runs/37778644364
[history-run]: https://github.com/nanophate/animewp/actions/runs/37780327732
[triage-run]: https://github.com/nanophate/animewp/actions/runs/37781266990
[maintenance]: https://github.com/nanophate/animewp/blob/9720ea42b1f310a3d582d0e91d95e3b6f107f834/docs/maintenance.md
[accepted]: https://github.com/nanophate/animewp/blob/9720ea42b1f310a3d582d0e91d95e3b6f107f834/tests/security/npm-audit-accepted.json
[provider-php]: https://github.com/nanophate/animewp/blob/9720ea42b1f310a3d582d0e91d95e3b6f107f834/plugins/animewp-blocks/includes/video-providers.php
[provider-js]: https://github.com/nanophate/animewp/blob/9720ea42b1f310a3d582d0e91d95e3b6f107f834/plugins/animewp-blocks/src/shared/providers.js
[updater]: https://github.com/nanophate/animewp/blob/9720ea42b1f310a3d582d0e91d95e3b6f107f834/shared/distribution-updater.php
[visibility-docs]: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility
[email-docs]: https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address
[release-api-docs]: https://docs.github.com/en/rest/releases/releases#list-releases
[run-api-docs]: https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run
[actions-security-docs]: https://docs.github.com/en/actions/reference/security/secure-use
