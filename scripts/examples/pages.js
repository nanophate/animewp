/**
 * Three full pages built from the same sections, each with a different look:
 * the structure stays the same, only the motion and decoration change.
 */
'use strict';
const sections = require( './_sections' );

module.exports = ( helpers ) => {
	const s = sections( helpers );
	const page = ( look ) => [ s.keyVisual( look ), s.introduction( look ), s.story( look ), s.movie( look ), s.characters( look ), s.credits( look ), s.onAir( look ), s.news( look ), s.closing( look ) ];
	const category = [ 'animewp-example-pages' ];
	return [
		{
			slug: 'page-basic',
			title: '見本ページ：テーマだけで作る',
			description: '補助プラグインなしで使える区画だけで組んだ作品紹介ページ。',
			categories: category,
			viewportWidth: 1280,
			blocks: [ s.introduction(), s.story(), s.credits(), s.music(), s.onAir(), s.news(), s.closing() ],
		},
		{ slug: 'page-simple', title: '見本ページ：シンプル', description: '動きのない白黒の作品紹介ページ。すべての区画を含みます。', categories: category, viewportWidth: 1280, blocks: page( 'plain' ) },
		{ slug: 'page-blur', title: '見本ページ：ぼかしから現れる', description: '同じ区画が、ぼかしから鮮明になりながら順に現れます。タイトルは1文字ずつ表示されます。', categories: category, viewportWidth: 1280, blocks: page( 'blur' ) },
		{ slug: 'page-drift', title: '見本ページ：花びらが舞う', description: '同じ区画に、ゆっくり浮かぶ花びらとパララックスを加えた見本です。', categories: category, viewportWidth: 1280, blocks: page( 'drift' ) },
	];
};
