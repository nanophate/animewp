# Code scanning 指摘の対応判断（2026-10-10）

確認元: 所有者が提示した `main` の Code scanning 一覧（24 Open）。
レビュー対象: `a94c94768da8519726fd37826a89146e0850ebd2`。
以下の番号は PR 番号ではなく、Code scanning の alert 番号です。
個別アラートのデータフロー画面は未取得のため、一覧と実際のソース・呼出先から判断しています。

## 判断一覧

| Alert | 指摘 | 対応 |
| --- | --- | --- |
| #1–#21 | `actions/cache-poisoning/poisonable-step` | 対象4ワークフローの共有キャッシュ権限をなくす |
| #22 | `panel/deprecated.js` の多文字除去 | 処理は維持。旧保存形式の文字数判定であり、サニタイザーとしては使用しない |
| #23 | `panel/markup.js` の多文字除去 | 処理は維持。結果の `.length` のみで固定クラスを選ぶ |
| #24 | `video-card/markup.js` の多文字除去 | 処理は維持。確認した呼出先はエスケープされる JSX の `aria-label` のみ。実出力のテストを追加 |

## 修正: 共有 Actions キャッシュの権限

[check.yml](../.github/workflows/check.yml)、[browser.yml](../.github/workflows/browser.yml)、
[dependency-audit.yml](../.github/workflows/dependency-audit.yml)、[release.yml](../.github/workflows/release.yml)
のトップレベルに `cache-mode: none` を指定しました。

これらは共有キャッシュを必要としていません。`package-manager-cache: false` は
setup-node のキャッシュ使用を止めるだけなので、実行コードに与えるキャッシュアクセス自体も
なくします。Release 呼出元と再利用される3ワークフローで同じ制限にします。
ジョブが `cache-mode` を上書きして権限を再取得しないことは
[test_workflow_cache.py](../tests/test_workflow_cache.py) で回帰確認します。
このテストは確認済み YAML の表記を守るためのもので、汎用 YAML バリデーターではありません。

ソース参照の検証、タグの不変性、既存のトークン権限、ZIP のハッシュ照合、通常 PR の
保護ルールは維持します。同一実行の Release 候補・QA 成果物はキャッシュではないため、
artifact のアップロード／ダウンロードは維持します。不要なキャッシュ削除や権限追加は行いません。
この変更はキャッシュ汚染経路を狭めるもので、サプライチェーン全体の安全性を保証するものではありません。

## 変更しない: 文字数と読み上げ名の処理

### Panel（#22、#23）

[現在の panelClass](../plugins/animewp-blocks/src/blocks/panel/markup.js) と
[旧版の panelClass](../plugins/animewp-blocks/src/blocks/panel/deprecated.js) では、
タグ風の文字列を除いた結果から `.length` だけを取り出し、1～40 の範囲かどうかで
固定の `animewp-panel--vertical-heading` クラスを選択しています。
除去結果の文字列を HTML 出力に使う処理ではありません。

正規表現を HTML パーサーに置き換えると、実体参照の復号や UTF-16 の数え方が変わり、
保存済みの縦書きクラスと一致しなくなる可能性があります。特に `deprecated.js` は
旧投稿を読み込むための固定した保存実装です。警告を消すためだけに変更しません。

### Video card（#24）

[plainText](../plugins/animewp-blocks/src/blocks/video-card/markup.js) は
タグ風の文字列の除去後に実体参照を復号するため、出力に `<` や引用符が残ることがあります。
**HTML サニタイザーではなく、安全な HTML 文字列を返すという契約もありません。**

レビュー時に確認した呼出先は [save.js](../plugins/animewp-blocks/src/blocks/video-card/save.js)
の `aria-label` です。ここは JSX の属性として WordPress の保存シリアライザーに渡され、
出力時の属性エスケープが境界です。`innerHTML`、`dangerouslySetInnerHTML`、RawHTML や
HTML 文字列連結へ渡していません。`plainText` の実装変更による保存属性の変化を避けます。

追加した [実ブラウザーテスト](../tests/browser/security-boundaries.spec.js) は、登録済みの
実ブロックの `getSaveContent` を使用します。動画リンクは引用符・実体参照・タグ風の文字列を
与え、保存 HTML を不活性な template 内で解析して、読み上げ名が文字列のまま保持され、
リンクにイベント属性や要素が増えないことを確認します。テスト文字列はページへ挿入しません。
Panel は現在／旧版それぞれの保存処理を通し、40文字境界、実体参照、絵文字、旧不透明度の
`px` 表記を維持することを確認します。

これらは指摘されたヘルパーの用途を確認するテストであり、任意の投稿 HTML、
RichText のキャプション全体、サーバー側の権限制御や KSES を包括的に検証するものではありません。
文字列の出力先を変更する場合、plainText を他の処理で再利用する場合、または
保存シリアライザーを変更する場合は、この判断を再レビューしてください。

## 検証とアラートの扱い

通常のソース・保存互換性・WordPress セキュリティ・実 ZIP 更新・ブラウザー・依存監査に
追加テストを接続します。ローカルの構文確認や GitHub の解析ジョブの正常終了だけをもって
Code scanning の残件数がゼロとは判断しません。マージ後に `main` の再解析結果を確認します。

#22–#24 は意図を記録して処理を維持するため、アラートが残ってもこの PR の未実装修正を
意味しません。リポジトリからの除外、ルール単位の抑制、アラートの一括却下は行いません。
必要なら所有者が個別アラートでこの根拠を確認したうえで分類してください。

Dependabot Vulnerabilities の12件は今回の画像に詳細がなく、この PR の対象外です。
既存の依存脆弱性の受容リスト・期限・重要度判定は変更しません。修正済みとも扱いません。
版番号・タグ・Release・更新 JSON は変更せず、この PR を作るだけで公開は開始しません。
