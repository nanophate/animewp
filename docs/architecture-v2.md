# AnimeWP v2 の構成

この文書は、テーマと任意の補助プラグインを2.0.1へ揃えた構成を説明します。今後の製品案は [overhaul-plan.md](overhaul-plan.md)、最初のv2レビューは [review-2026-10.md](review-2026-10.md)、追加検証は [verification-2.0.1.md](verification-2.0.1.md) を参照してください。

## テーマとプラグインの境界

`themes/animewp` は親テーマを必要としないブロックテーマです。標準の投稿、固定ページ、検索、アーカイブ、サイトエディターのテンプレートを提供します。本文、画像、メニュー、配色、書体は WordPress 標準のブロックと Global Styles を基本にします。

`plugins/animewp-blocks` は任意です。既存の Panel、Text Group、Media、Video に、Carousel、Video Card、Backdrop、Decoration を加えた8ブロックと、ブロックへ付ける Motion 拡張を提供します。テーマだけで使える基本ページの見本も用意しています。追加ブロックを必要とする見本は、そのブロックが登録されているときに表示します。

テーマやプラグインを有効化しただけでは、ページ、公開状態、メニュー、ホームページ設定を書き換えません。見本の取り込みは管理者の明示操作で下書きを作ります。サイトエディターで保存されたテンプレートや共通パーツはデータベース側が優先されるため、テーマファイルを更新しても利用者の保存内容を一括置換しません。

## ソースの責任範囲

| 場所 | 内容 |
| --- | --- |
| `themes/animewp/theme.json`、`styles`、`assets` | 色・書体・余白の役割、スタイル、テーマの表示資産 |
| `themes/animewp/templates`、`parts`、`patterns` | 標準ページ、共通パーツ、組み合わせ用パターン |
| `themes/animewp/examples` | 生成済みの区画10種・ページ5種と、案内ページ2種 |
| `themes/animewp/inc` | 見本の下書き取り込み、表示補助、旧設定の互換処理 |
| `plugins/animewp-blocks/src/blocks` | 独自8ブロックの編集・保存・公開側コード |
| `plugins/animewp-blocks/src/motion` | 標準・独自ブロックに共通の Motion 属性、編集、公開側コード |
| `plugins/animewp-blocks/src/shared`、`includes` | 動画プロバイダー、共通表示処理、PHP の認可・URL処理など |
| `scripts` | ビルド方針、見本生成、翻訳、資産・ZIP検査 |
| `shared/distribution-updater.php` | 両ZIPへ同期する、外部ライブラリーなしのWordPress更新クライアント |
| `tests` | 静的検査、保存互換性、フロントエンド回帰、実 WordPress 統合試験 |
| `.github` | Dependabot、通常CI、日次依存監査、週次検査、ブラウザー試験、Release作成 |

## 保存データと表示

独自ブロックは保存済み HTML と内側の標準ブロックを保ちます。属性や保存関数を変更するときは、以前の保存内容を読み直すテストと必要な deprecation を追加します。プラグイン停止時には追加機能は止まりますが、保存 HTML を削除する処理はありません。

Motion はコメント内のブロック属性へ設定を保存し、公開時のレンダリングでクラスやデータ属性を追加します。Motion 拡張は標準ブロックの登録前に読み込み、標準ブロックの属性として認識させます。保存 HTML 自体を Motion 用に書き換えないことと、設定がコメントから失われないことを、それぞれ検査します。

通常の動画カードは、ポスターとリンクを先に表示し、再生時にプレーヤーを開きます。ダイアログ機能が使えない場合は元のリンクを使えます。Backdrop で表示中の動画を背景再生する設定を選んだ場合は、背景表示時に動画の配信元へ接続します。編集者による YouTube サムネイル取り込みは別の明示操作です。

## ビルドとインストール用 ZIP

npm は開発ツールに限り、配布コードは自作の JS / CSS と WordPress 本体の提供する部品を使います。`src` を編集し、`@wordpress/scripts` で `build` を生成します。生成した `build` は Git に保存しません。

`scripts/build-policy.cjs` は本番ビルドで実際に出力されるモジュールを確認し、npm ライブラリーの混入を拒否します。結合済みモジュール、遅延チャンク、CSS/Sass の取り込みも対象です。WordPress の提供する外部依存はバンドルへコピーしません。

`scripts/package.py` はテーマとプラグインを別々の ZIP にし、SHA-256 を生成します。プラグインの必須ファイルは各 `block.json` の `file:` 参照、対応する `.asset.php`、Motion のエントリー、翻訳と更新クライアントから導出します。開発用の node_modules やテスト環境はインストール ZIP へ入れません。プラグイン自身の編集用 src は、ビルド済みコードと一緒に同梱します。リポジトリ全体のソースアーカイブとは別の ZIP です。

現在の検査はテーマ・プラグインの版番号が一致することを要求します。初回の配布自動化も共通の版番号・タグで設計し、WordPress 側では各コンポーネントの更新を独立して適用します。別々に版番号を進める場合は、この検査と配布フローを変更します。

## 検査の層

| 層 | 確認内容 |
| --- | --- |
| 静的・ビルド | 構文、メタデータ、外部参照、既知の秘密情報形式、資産、同梱依存、必須ファイル、ZIP再現性 |
| 保存互換性 | WordPress `6.6-branch` / `7.1-branch` のエディタースクリプトを使った独自ブロックと Motion 付き標準ブロックの保存・再読込 |
| JS 回帰 | jsdom 内の DOM、イベント、タイマー、エラー伝播、コンパイル後 CSS の契約 |
| PHP / WordPress | PHP 8.0 / 8.3 の構文、PHPCS、Plugin Check、Theme Check、実 WordPress の権限・nonce・下書き・設定保持・HTTP表示 |
| 依存監査 | lockfile 全体と実行時依存の監査、開発ツールの既知 advisory の範囲・期限確認 |
| 実ブラウザー・ZIP | Chromium / Firefox / WebKitの操作、旧Releaseからの置換、WordPress標準の更新通知・適用、保存データの保持 |

jsdomの回帰試験とは別に、Playwrightと使い捨てWordPressでブラウザー・ZIP更新を確認します。WebKitはSafari実機そのものではなく、支援技術、実際の外部動画サービスの再生、運用先固有の組合せは別途確認します。

## 更新配信の状態

2.0.1はWordPressの標準更新フィルター、HTTP、キャッシュ、アップグレーダーAPIを使います。両ZIPが同じ実装を持ち、両方ロードされた場合は新しい実装を一度だけ登録します。テーマだけ、または別テーマとプラグインだけでも動作します。両コンポーネントが無効なら更新コードはロードされません。

固定JSONの検証、必要環境、取得先、ZIPのSHA-256を確認してから標準アップグレーダーへ渡します。JSONはReleaseのZIP公開確認後にのみ進めます。`main`への新バージョンのマージで検証済みDraftを作り、公開はpublicリポジトリかつ明示的な`publish=true`実行が条件です。初期JSONは`status: unpublished`です。詳細と復旧手順は [maintenance.md](maintenance.md) を参照してください。
