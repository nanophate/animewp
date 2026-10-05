# animewp

作品紹介サイトを標準Gutenbergで編集する、単独インストール可能なWordPressブロックテーマです。親テーマや有料ビルダーは必要ありません。

- `themes/animewp/`：通常の投稿・固定ページ・検索・アーカイブと、再利用できる3構成のLP、ヘッダー、セクションのパターン。
- `plugins/animewp-blocks/`：任意の装飾パネル、回転する文字グループ、画像と本文、動画ダイアログ。テーマだけでも利用できます。
- [INSTALL-ja.txt](INSTALL-ja.txt)：ZIP導入、初期編集、更新、停止時の手順。
- [設計](docs/architecture.md) と [任意ブロックの仕様](plugins/animewp-blocks/README.md)。

有効化時にページ、メニュー、公開状態、ホーム設定を変更しません。見本は管理画面でプレビューした後、必要なものだけ新規下書きに取り込みます。同じ見本を再実行すると作成済みページを開きます。本文・画像は見本なので、公開前に自分の内容へ差し替えてください。

外部フォント・解析・外部素材を同梱しません。利用者が入力した画像・動画のURLを表示すると、その配信元へブラウザーが接続します。標準ブロックとブロックのスタイル設定を基本にし、独自ブロックも保存HTMLと内側の標準ブロックを残します。

## 対象と確認範囲

最低対象はWordPress 6.6 / PHP 8.0です。実際のZIPで **WordPress 6.6 / PHP 8.0.30** と **WordPress 7.1.2 / PHP 8.3.35** を確認しました。各版の試験結果は検証記録にまとめています。

iframe編集画面の保存・再読込、ZIP更新後の編集保持、補助プラグイン削除・再導入、代表的なプラグイン併用、狭幅・キーボード操作の範囲と未実施項目は[検証記録](docs/verification.md)に記載しています。

## ソース検査

Python 3.10以上、Node.js、PHP CLIを用意して、リポジトリのルートで実行します。Pythonの追加パッケージやnpm依存の導入は不要です。

```sh
python3 scripts/validate.py
```

PHP・JavaScript・Pythonの構文、JSON、メタデータ、必須テンプレート、属性の既定値、外部参照、よく使われる秘密情報の形式、SVG、ZIP構成と再現性を検査します。秘密情報検査は既知形式の検出であり、あらゆる秘密情報の不存在を証明するものではありません。

別ランタイムでPHPを検査する場合だけ、`python3 scripts/validate.py --skip-php`を利用できます。出力にPHPを省略したことが表示されます。`tests/wp-smoke.php`はデータを書き換えるため、使い捨てのWordPressデータベース専用です。

外部参照の例外は機械用JSONスキーマ、SVGのXML名前空間、同梱GPL全文、明示操作後だけ使う動画プロバイダーの許可済みURLです。テスト用URLはインストールZIPに入りません。ローカルQA環境と生成物はソース監査・配布対象から除外します。

## 配布ZIPの作成

```sh
python3 scripts/validate.py
python3 scripts/package.py
```

`artifacts/releases/`へ次を生成します。番号は各パッケージのVersionヘッダーから読み取ります。

- `animewp-1.2.0.zip`：最上位フォルダーは`animewp/`のみ。
- `animewp-blocks-1.2.0.zip`：最上位フォルダーは`animewp-blocks/`のみ。
- `SHA256SUMS`：2つのZIPのSHA-256。

ファイル順、ZIP日時、権限、格納方式を固定しています。同じソースなら環境の更新日時に左右されず同じZIPになります。各ZIPは格納方式を使い、圧縮ライブラリの違いによる出力差を避けます。ソースやQA環境を含むリポジトリ全体をWordPressへアップロードしないでください。

書き込みなしの確認は`python3 scripts/package.py --check`、出力先変更は`--output <出力先>`です。ハッシュは出力先で確認できます。

```sh
cd artifacts/releases
shasum -a 256 -c SHA256SUMS
```

GitHub ActionsはPHP 8.0/8.3の構文検査と同じソース・パッケージ検査を実行します。checkout actionは確認したコミットSHAへ固定し、権限を読み取りに限定しています。CIは実WordPressの操作試験を代替せず、公開・リリース作成も行いません。

## ライセンス

GPL-2.0-or-later。全文は[LICENSE](LICENSE)です。見本のSVGはこのキット用の独自図版です。

## 1.2.0

白・黒・グレーのシンプルな土台を維持します。追加の配色スキンや着せ替え画面はありません。色は標準Global Styles、各ブロックの色設定、追加CSSから調整します。既存の色・書体・本文を有効化や更新だけで変更しません。

WordPress標準Font Libraryの追加書体を利用でき、任意の3用途（英字・大見出し／短いアクセント／等幅文字）にも割り当てられます。書体数の上限は設けません。標準ブロックで編集できる余白の大きいホーム、画像付きフッター、作品紹介、人物プロフィール、放送表、音楽、書籍・商品、手動SNSカードを追加しました。

[1.2の仕様と対応表](docs/v1.2-design.md)、[検証結果](docs/verification.md)、[画像の来歴・容量・ハッシュ](themes/animewp/assets-manifest.json)。
