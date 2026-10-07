/** The ten section examples (animewp：区画の見本), shown in their plain look. */
'use strict';
const sections = require( './_sections' );

module.exports = ( helpers ) => {
	const s = sections( helpers );
	const category = [ 'animewp-examples' ];
	const item = ( slug, title, description, blocks ) => ( { slug, title, description, categories: category, viewportWidth: 1280, blocks } );
	return [
		item( 'example-key-visual', 'キービジュアル：切り替わる画像とコピー', 'カバー画像をフェードで切り替えるカルーセル。番号で画像を選べます。', s.keyVisual() ),
		item( 'example-introduction', '作品紹介：画像と見出し', '画像とリード文を左右に並べる紹介の区画。', s.introduction() ),
		item( 'example-story', 'ストーリー：縦書きの言葉と本文', '短い縦書き見出し、あらすじ、開閉できる各話の紹介。', s.story() ),
		item( 'example-movie', '映像：背景が切り替わる動画一覧', '動画カードのカルーセル。背景レイヤーが表示中の映像に合わせて切り替わります。', s.movie() ),
		item( 'example-characters', 'キャラクター：サムネイルで切り替え', 'イラストと紹介文。下のサムネイルで人物を切り替えます。', s.characters() ),
		item( 'example-credits', 'スタッフ・キャスト：2列の一覧', '役職と名前を表で並べる区画。', s.credits() ),
		item( 'example-music', '音楽：ジャケットと配信リンク', 'カード2枚。ポインターを合わせると浮き上がります。', s.music() ),
		item( 'example-on-air', '放送・配信：日時の表', '放送局・配信サービスと日時の表、注意書き、ボタン。', s.onAir() ),
		item( 'example-news', 'お知らせ：最新記事の一覧', '投稿の最新記事を日付付きで並べ、一覧へのボタンを添えます。', s.news() ),
		item( 'example-closing', '締めくくり：濃い色の案内', '濃い色の区画で、次の行動（フォロー・放送情報）を案内します。', s.closing() ),
	];
};
