# 更新配布と定期セキュリティ検査

## この変更の適用先

この設定は PR #1 の `overhaul-phases` にある依存関係を対象とします。
この PR を `overhaul-phases` に取り込んだ後、PR #1 を `main` へマージします。
定期実行と通常の Dependabot 更新 PR は、設定が既定ブランチに入ってから有効になります。

## 自動化する検査

| 検査 | 対象 | タイミング |
| --- | --- | --- |
| Dependabot version updates | GitHub Actions、ルートと `tests/serialization` の npm、`tests/security` の Composer | 毎週月曜 04:17 JST |
| npm / Composer audit | 上記3箇所の lockfile。開発用依存も含む | PR、main の push、毎日 04:23 JST、手動 |
| 既存のソース・ZIP・WordPress セキュリティ検査 | テーマとプラグイン | push、PR、毎週月曜 04:37 JST、手動 |

GitHub Actions の cron は UTC に換算して記述しています。実行時刻は目安で、
GitHub 側の混雑等で遅延することがあります。

npm の high / critical と、Composer の既知脆弱性で audit を失敗させます。
npm の low / moderate、Composer の abandoned package はログで確認できます。
依存関係は lockfile から監査し、このジョブで install や audit fix は行いません。
監査サービスに接続できない場合も、成功扱いにはしません。

Dependabot の通常更新は npm / Composer の minor・patch をまとめ、major は個別 PR にします。
GitHub Actions の更新は一つのグループにします。自動マージは設定していません。
リポジトリ設定で Dependency graph、Dependabot alerts、Dependabot security updates も有効にしてください。
security updates は通常更新の週次スケジュールとは別に機能します。
YAML の追加だけでリポジトリ側の security updates 設定を切り替えることはできません。

既存の `npm run test:security` は PHPCS の WordPress セキュリティルール、
Plugin Check の security category、Theme Check を実行します。
Plugin Check は実行成功と ERROR findings の両方を判定し、
Theme Check は CLI の終了コードを尊重します。
WP-CLI からの通常の Plugin Check は静的検査です。wp-env 内で動くことだけを根拠に、
動的な侵入テストやすべての認可テストまで完了したとは扱いません。

## WordPress に AnimeWP の更新を表示する設計

この PR が導入するのは依存更新と定期検査です。以下は更新配布機能の実装方針です。

現在の配布単位を維持します。

| 対象 | ソース | リリースのインストール用 ZIP |
| --- | --- | --- |
| テーマ | `themes/animewp/` | `animewp-X.Y.Z.zip` |
| プラグイン | `plugins/animewp-blocks/` | `animewp-blocks-X.Y.Z.zip` |

GitHub のソース ZIP、検証用 ZIP、リポジトリ全体をインストールに使いません。
リリース公開前にビルド、既存 CI、`scripts/package.py`、ZIP のハッシュ検査を通し、
タグと両パッケージの Version ヘッダーが一致することを確認します。
正式 Release とインストール用 ZIP がそろった版だけを配布対象とします。
draft、prerelease、未公開ブランチや単なるタグを更新候補にしません。

WordPress には Plugin Update Checker (PUC) または独自の更新フィルタを導入し、
最新版、必要な PHP / WordPress バージョン、対象 ZIP の URL を提供します。
`Update URI` は WordPress.org の同名パッケージによる誤上書き防止にも使いますが、
そのヘッダーだけでは GitHub の更新検出機能は付きません。

この monorepo で PUC の GitHub 接続を使う場合は、次の処理が必要です。

- テーマとプラグインを別々に登録する。テーマの更新を任意のブロックプラグインの有効化に依存させない。
- それぞれのインストール用 asset 名を厳密に指定する。
  `animewp-.*.zip` のようなパターンでは、プラグイン用・検証用の ZIP も一致し得る。
- インストール用 asset が欠けたとき、リポジトリ全体の Source ZIP、tag、branch へフォールバックしない。
  asset 必須の設定に加え、検出戦略を正式 Release に限定する。
- PUC の GitHub 接続は通常、リポジトリ直下からヘッダーを探す。
  コンポーネントごとのバージョンや必要 PHP / WordPress バージョンを正確に渡すため、
  サブディレクトリに対応したアダプタか、パッケージ別の更新 JSON を用意する。
- 更新コードを含まない旧版には、最初の一回だけ新しい ZIP を手動導入する。
  停止中のコンポーネントも監視する必要があれば、常時動作する専用 updater を使う。

### 非公開リポジトリの認証

自分が管理する WordPress サイトには、対象リポジトリだけに限定した
fine-grained PAT の `Contents: read` をサーバー環境変数などから渡す構成が使えます。
トークンは Git、配布 ZIP、ブラウザーへ出る URL に含めず、
認証先とダウンロード時のリダイレクトも制限します。

第三者へ配布する場合は、開発者の PAT を各サイトへ配布しません。
公開してよい配布物だけを置く別の公開配布先、またはサーバー側で認証する更新サービスを使います。
非公開リポジトリの内容を公開する変更は、配布方針を決めたうえで別途行います。

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
GitHub Release Asset API、Plugin Check、Theme Check CLI、CodeQL の公式資料を参照してください。
参照先 URL はこの変更の PR 本文に記載します。
