/**
 * Contact and site-policy pages. They use the default page template, so the
 * text keeps the readable content width and lines up with the page title.
 * Only core blocks: both work without AnimeWP Blocks.
 *
 * The wording is a starting point to check and edit, not legal advice.
 */
'use strict';
const sections = require( './_sections' );

module.exports = ( helpers ) => {
	const { b } = helpers;
	const s = sections( helpers );
	const gap = { style: { spacing: { margin: { top: 'var:preset|spacing|50' } } } };
	const heading = ( content, anchor ) => b( 'core/heading', { content, level: 2, anchor, fontSize: 'large', ...gap } );
	const note = ( title, text ) =>
		b( 'core/group', { className: 'is-style-animewp-soft-panel', layout: { type: 'default' } }, [
			b( 'core/paragraph', { content: '<strong>' + title + '</strong>' } ),
			s.paragraph( text ),
		] );
	const list = ( items ) => b( 'core/list', {}, items.map( ( content ) => b( 'core/list-item', { content } ) ) );
	const question = ( summary, answer ) => b( 'core/details', { summary, className: 'is-style-animewp-details' }, [ s.paragraph( answer ) ] );

	const desk = ( kicker, title, text, address ) =>
		b( 'core/column', {}, [
			b( 'core/group', { className: 'is-style-animewp-frame', style: { dimensions: { minHeight: '100%' } }, layout: { type: 'flex', orientation: 'vertical', justifyContent: 'stretch' } }, [
				s.label( kicker ),
				b( 'core/heading', { content: title, level: 3 } ),
				s.paragraph( text ),
				s.buttons( [ [ 'メールで問い合わせる', true ] ] ),
				s.caption( address ),
			] ),
		] );
	// Buttons from s.buttons link to '#'; contact buttons get a mailto address to replace.
	const withMail = ( column, address ) => {
		column.innerBlocks[ 0 ].innerBlocks[ 3 ].innerBlocks[ 0 ].attributes.url = 'mailto:' + address;
		return column;
	};

	const contact = {
		slug: 'contact-page',
		title: 'お問い合わせのページ',
		description: '問い合わせ窓口・よくあるご質問・フォームの置き場所をまとめた固定ページです。メールアドレスと文面を差し替えてください。',
		categories: [ 'animewp-example-pages' ],
		blocks: [
			b( 'core/paragraph', { content: 'お問い合わせの前に、よくあるご質問をご確認ください。内容に合った窓口へご連絡いただくと、ご案内がスムーズです。', className: 'is-style-animewp-lead' } ),
			heading( 'よくあるご質問', 'faq' ),
			question( '放送・配信の日時を知りたい', '最新の放送・配信情報は「放送・配信」ページでお知らせしています。地域や配信サービスによって日時が異なります。' ),
			question( '画像をSNSのアイコンに使ってもよいですか', '作品の画像・映像の転載や加工はご遠慮ください。公式に配布している素材がある場合は、その利用条件に従ってください。' ),
			question( 'イベントやグッズについて知りたい', '決まり次第、お知らせでご案内します。販売店・会場ごとのお問い合わせは、各窓口へお願いします。' ),
			question( 'サイトの表示がおかしい', 'ブラウザーを最新の状態にして、再読み込みをお試しください。改善しない場合は、下記の窓口へお使いの端末とブラウザー名をお知らせください。' ),
			heading( 'お問い合わせ窓口', 'desk' ),
			b( 'core/columns', { style: { spacing: { blockGap: { left: 'var:preset|spacing|40' } } } }, [
				withMail( desk( 'MEDIA', '取材・掲載のご相談', '報道・メディア関係の方の、取材や画像掲載のご依頼はこちらへ。', 'press@example.com' ), 'press@example.com' ),
				withMail( desk( 'GENERAL', '作品・サイトについて', '作品やこのサイトについてのご意見・ご要望はこちらへ。', 'info@example.com' ), 'info@example.com' ),
			] ),
			s.caption( '※お返事までに数日かかる場合があります。内容によってはお答えできないこともあります。' ),
			heading( 'フォームを置く場合', 'form' ),
			note( 'この位置にフォームを追加できます', 'お使いのフォームプラグインのブロックを、この案内と置き換えてください。送信先と、送られた個人情報の扱いを「ご利用について」のページに記載してから公開します。' ),
		],
	};

	const topics = [
		[ 'copyright', '著作権について' ],
		[ 'images', '画像・映像の利用について' ],
		[ 'links', 'リンクについて' ],
		[ 'environment', '推奨環境' ],
		[ 'privacy', '個人情報の取り扱い' ],
		[ 'cookies', 'Cookieとアクセス解析' ],
		[ 'disclaimer', '免責事項' ],
	];
	const title = ( anchor ) => topics.find( ( topic ) => topic[ 0 ] === anchor )[ 1 ];

	const legal = {
		slug: 'legal-page',
		title: 'ご利用についてのページ',
		description: '著作権・画像の利用・リンク・推奨環境・個人情報・免責事項をまとめた固定ページです。運営の実情に合わせて内容を確認してください。',
		categories: [ 'animewp-example-pages' ],
		blocks: [
			note( 'この文章は見本です', '運営者や使うサービスに合わせて、公開前に必ず内容を確認・修正してください。法的な判断が必要な場合は専門家にご相談ください。' ),
			b( 'core/paragraph', { content: 'このサイトをご利用いただく前に、以下の内容をご確認ください。ご利用いただいた時点で、これらに同意いただいたものとします。', className: 'is-style-animewp-lead', ...gap } ),
			s.label( 'CONTENTS' ),
			list( topics.map( ( [ anchor, text ] ) => '<a href="#' + anchor + '">' + text + '</a>' ) ),

			heading( title( 'copyright' ), 'copyright' ),
			s.paragraph( 'このサイトに掲載している文章・画像・映像・音声などの著作権は、作品の権利者または正当な権利を持つ者に帰属します。私的な利用の範囲を超えて、複製・転載・改変・配布することを禁止します。' ),

			heading( title( 'images' ), 'images' ),
			list( [ 'SNSのアイコンやヘッダー、壁紙などへの画像の使用はご遠慮ください。', '画像・映像の切り抜き、加工、AIの学習データとしての利用を禁止します。', '公式に配布している素材は、各素材に記載の条件の範囲でご利用ください。' ] ),

			heading( title( 'links' ), 'links' ),
			s.paragraph( 'このサイトへのリンクは、トップページへのリンクであれば原則として自由です。ただし、作品や権利者の信用を損なうサイトからのリンクはお断りします。画像ファイルへの直接のリンクはご遠慮ください。' ),

			heading( title( 'environment' ), 'environment' ),
			s.paragraph( '次のブラウザーの最新版でご覧ください。JavaScript を有効にしてください。' ),
			list( [ 'パソコン：Chrome、Edge、Firefox、Safari', 'スマートフォン：iOS の Safari、Android の Chrome' ] ),

			heading( title( 'privacy' ), 'privacy' ),
			s.paragraph( 'お問い合わせなどで受け取った氏名・メールアドレスなどの個人情報は、ご連絡への対応のためにのみ使用し、法令に基づく場合を除いて第三者に提供しません。' ),

			heading( title( 'cookies' ), 'cookies' ),
			s.paragraph( 'このサイトでは、利用状況を把握するためにアクセス解析ツールを使うことがあります。データは Cookie を使って匿名で収集され、個人を特定するものではありません。Cookie はブラウザーの設定で無効にできます。' ),
			s.caption( '※動画を再生すると、動画サービスに接続し、そのサービスの Cookie が使われる場合があります。' ),

			heading( title( 'disclaimer' ), 'disclaimer' ),
			s.paragraph( '掲載内容には十分に注意していますが、正確性や安全性を保証するものではありません。このサイトの利用によって生じた損害について、責任を負いかねます。掲載内容は予告なく変更・削除することがあります。' ),

			b( 'core/separator', { className: 'is-style-wide', ...gap } ),
			s.caption( '© 原作者名／出版社名・作品名製作委員会' ),
			s.caption( '制定日：2026年10月1日' ),
		],
	};

	return [ contact, legal ];
};
