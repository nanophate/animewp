<?php
/**
 * The component inserter is powered by fragments of already registered
 * WordPress patterns, not duplicate templates or separately maintained HTML.
 * This suite runs inside isolated wp-env (never on the production website).
 */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}
$results = array();
$check = static function ( string $label, bool $condition ) use ( &$results ): void {
	$results[] = array( 'test' => $label, 'pass' => $condition );
};
$registry = WP_Block_Patterns_Registry::get_instance();
$blocks = WP_Block_Type_Registry::get_instance();
$catalog = animewp_component_catalog();
$check( '40 reusable parts are defined', 40 === count( $catalog ) );
$check( 'component categories are registered', array_reduce(
	array( 'animewp-components', 'animewp-layout-parts', 'animewp-scene-parts' ),
	static fn ( $pass, $slug ) => $pass && WP_Block_Pattern_Categories_Registry::get_instance()->is_registered( $slug ),
	true
) );
$standalone_roots = array(
	'core/group', 'core/columns', 'core/cover', 'core/details',
	'core/table', 'core/buttons', 'core/navigation', 'core/paragraph', 'core/social-links',
	'animewp/carousel', 'animewp/video-card'
);
$source_cache = array();
$expected_count = 0;
foreach ( $catalog as $slug => $definition ) {
	$registered_name = 'animewp/' . $slug;
	$source_name = $definition['source'];
	if ( ! array_key_exists( $source_name, $source_cache ) ) {
		$source_cache[ $source_name ] = animewp_component_source_blocks( $source_name, $registry );
	}
	$node = animewp_component_node( $source_cache[ $source_name ], $definition['path'] );
	$available = is_array( $node )
		&& ( $node['blockName'] ?? null ) === $definition['block']
		&& animewp_component_blocks_available( $node, $blocks );
	$pattern = $registry->get_registered( $registered_name );
	$check( 'source availability matches inserter ' . $slug, $available === is_array( $pattern ) );
	if ( ! $available ) {
		continue; // Optional AnimeWP Blocks sources are omitted when disabled.
	}
	++$expected_count;
	$check( 'part remains individually insertable ' . $slug, in_array( $definition['block'], $standalone_roots, true )
		&& ! empty( $pattern['inserterEnabled'] )
		&& in_array( $definition['category'], $pattern['categories'] ?? array(), true ) );
	$check( 'part is byte-identical to shared source ' . $slug, $pattern['content'] === serialize_block( $node ) );
	$roundtrip = parse_blocks( $pattern['content'] );
	$check( 'part is a valid self-contained block ' . $slug,
		1 === count( $roundtrip )
		&& $roundtrip[0]['blockName'] === $definition['block']
		&& '' !== trim( serialize_block( $roundtrip[0] ) )
	);
}
$check( 'at least the Core-only reusable parts remain available', $expected_count >= 20 );
$check( 'Core-only content remains valid without optional blocks', animewp_component_blocks_available(
	array( 'blockName' => 'core/group', 'innerBlocks' => array(
		array( 'blockName' => 'core/paragraph', 'innerBlocks' => array() ),
	) ),
	$blocks
) );
$check( 'missing plugin dependencies are not offered in the inserter', ! animewp_component_blocks_available(
	array( 'blockName' => 'core/group', 'innerBlocks' => array(
		array( 'blockName' => 'animewp/not-installed', 'innerBlocks' => array() ),
	) ),
	$blocks
) );
$check( 'Core cover can be sourced from a generated plugin-container example',
	is_array( animewp_component_node(
		animewp_component_source_blocks( 'animewp/example-key-visual', $registry ),
		array( 0, 0, 0 )
	) )
);
$official = $registry->get_registered( 'animewp/footer-official' );
$check( 'complete footer pattern is registered for editors', is_array( $official ) && ! empty( $official['content'] ) );
// Theme pattern files can contain leading/trailing formatting whitespace.
// Only actual blocks count toward the independent, editable Cover root.
$footer_tree = is_array( $official ) ? parse_blocks( trim( $official['content'] ) ) : array();
$check( 'official footer uses an editable Cover background', 1 === count( $footer_tree )
	&& 'core/cover' === ( $footer_tree[0]['blockName'] ?? '' )
	&& 'contrast' === ( $footer_tree[0]['attrs']['overlayColor'] ?? '' )
	&& ! isset( $footer_tree[0]['attrs']['url'] ) );
$check( 'official footer includes Site Logo and Core Social Icons',
	is_array( $official )
	&& false !== strpos( $official['content'], '<!-- wp:site-logo ' )
	&& false !== strpos( $official['content'], '<!-- wp:social-links ' )
	&& 4 === substr_count( $official['content'], '<!-- wp:social-link ' ) );
$check( 'official footer includes legal and production placeholders',
	is_array( $official )
	&& false !== strpos( $official['content'], '制作会社名' )
	&& false !== strpos( $official['content'], 'プライバシーポリシー' ) );
$check( 'official footer remains a single reusable parsed block', 1 === count( $footer_tree )
	&& '' !== trim( serialize_block( $footer_tree[0] ) ) );
$check( 'invalid nested path fails closed', null === animewp_component_node(
	array( array( 'blockName' => 'core/group', 'innerBlocks' => array() ) ),
	array( 0, 55 )
) );
$home = $registry->get_registered( 'animewp/home-intro' );
$check( 'home introduction is available in the inserter', is_array( $home )
	&& ( ! isset( $home['inserterEnabled'] ) || true === $home['inserterEnabled'] ) );
WP_CLI::line( wp_json_encode( array( 'registered' => $expected_count, 'results' => $results ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
foreach ( $results as $result ) {
	if ( ! $result['pass'] ) {
		WP_CLI::halt( 1 );
	}
}
