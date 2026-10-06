/**
 * Run WordPress's own editor scripts (wp-includes/js/dist) in a jsdom window,
 * then load one plugin build into that registry.
 *
 * The WordPress copy comes from wp-env (Docker), so the harness uses exactly the
 * block serializer and validator the configured WordPress version ships.
 */
'use strict';
const os = require( 'node:os' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { JSDOM, VirtualConsole } = require( 'jsdom' );

const ORIGIN = 'http://localhost:8888';
const ROOT = path.resolve( __dirname, '../..' );
const NEEDED = [ 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n', 'wp-data', 'wp-block-library' ];

function wordpressDir() {
	if ( process.env.ANIMEWP_WP_DIR ) {
		return process.env.ANIMEWP_WP_DIR;
	}
	// wp-env keeps each project under ~/.wp-env (or $WP_ENV_HOME); its compose file mounts this repo.
	const home = process.env.WP_ENV_HOME || path.join( os.homedir(), '.wp-env' );
	const match = ( fs.existsSync( home ) ? fs.readdirSync( home ) : [] )
		.map( ( name ) => path.join( home, name ) )
		.find( ( dir ) => {
			const compose = path.join( dir, 'docker-compose.yml' );
			return fs.existsSync( compose ) && fs.readFileSync( compose, 'utf8' ).includes( ROOT + '/' );
		} );
	if ( ! match ) {
		throw new Error( 'WordPress not found. Run `npm run env:start` first, or set ANIMEWP_WP_DIR.' );
	}
	return path.join( match, 'WordPress' );
}

/** Script dependency graph from wp-includes/assets/script-loader-packages.php. */
function scriptGraph( wpDir ) {
	const source = fs.readFileSync( path.join( wpDir, 'wp-includes/assets/script-loader-packages.php' ), 'utf8' );
	// Vendor handles are registered in script-loader.php, not the package map.
	const graph = { 'react-dom': [ 'react' ], 'react-jsx-runtime': [ 'react' ] };
	// One-line (6.6) or pretty-printed (7.x) PHP arrays.
	for ( const match of source.matchAll( /'([a-z0-9-]+)\.js'\s*=>\s*array\(\s*'dependencies'\s*=>\s*array\(([^)]*)\)/g ) ) {
		graph[ 'wp-' + match[ 1 ] ] = [ ...match[ 2 ].matchAll( /'([^']+)'/g ) ].map( ( dep ) => dep[ 1 ] );
	}
	return graph;
}

function scriptFile( wpDir, handle ) {
	const dist = path.join( wpDir, 'wp-includes/js/dist' );
	if ( handle.startsWith( 'wp-' ) ) {
		return path.join( dist, handle.slice( 3 ) + '.js' );
	}
	return path.join( dist, 'vendor', handle + '.js' );
}

function loadOrder( graph ) {
	const order = [];
	const seen = new Set();
	const visit = ( handle ) => {
		if ( seen.has( handle ) ) {
			return;
		}
		seen.add( handle );
		( graph[ handle ] || [] ).forEach( visit );
		order.push( handle );
	};
	NEEDED.forEach( visit );
	return order;
}

const scriptErrors = [];

function createWindow() {
	// Editor logs (deprecation notices, React warnings) stay out of stdout.
	const virtualConsole = process.env.ANIMEWP_HARNESS_DEBUG ? new VirtualConsole().sendTo( console ) : new VirtualConsole();
	// Only uncaught script exceptions fail a run; jsdom also reports CSS it cannot parse.
	virtualConsole.on( 'jsdomError', ( error ) => {
		if ( error.type === 'unhandled-exception' || ( error.detail && error.detail instanceof Error ) ) {
			scriptErrors.push( error );
		}
	} );
	const dom = new JSDOM( '<!doctype html><html><body></body></html>', {
		url: ORIGIN + '/wp-admin/post.php',
		pretendToBeVisual: true,
		// Scripts run as <script> elements, so top-level declarations become
		// window globals exactly as in a browser (WordPress 7.x vendor files rely on it).
		runScripts: 'dangerously',
		virtualConsole,
	} );
	const { window } = dom;
	window.matchMedia = () => ( { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } );
	window.eval( 'window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };' );
	window.eval( 'window.IntersectionObserver = window.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} };' );
	return window;
}

function run( window, file ) {
	const script = window.document.createElement( 'script' );
	script.textContent = fs.readFileSync( file, 'utf8' ) + '\n//# sourceURL=' + file;
	window.document.head.appendChild( script );
	if ( scriptErrors.length ) {
		const error = scriptErrors.splice( 0 )[ 0 ];
		throw new Error( file + ': ' + ( error.detail && error.detail.stack ? error.detail.stack : error.message ) );
	}
}

function installWordPress() {
	const wpDir = wordpressDir();
	const window = createWindow();
	const order = loadOrder( scriptGraph( wpDir ) );
	for ( const handle of order ) {
		run( window, scriptFile( wpDir, handle ) );
	}
	window.wp.blockLibrary.registerCoreBlocks();
	const version = /\$wp_version = '([^']+)'/.exec( fs.readFileSync( path.join( wpDir, 'wp-includes/version.php' ), 'utf8' ) )[ 1 ];
	return { window, wp: window.wp, version };
}

/**
 * Load a plugin directory. Two layouts are supported:
 * - built:  build/blocks/<name>/index.js (current)
 * - legacy: assets/providers.js + assets/editor.js + blocks/<name>/block.json (≤ 1.3.0 source)
 */
function loadPlugin( dir, window ) {
	const built = path.join( dir, 'build/blocks' );
	if ( fs.existsSync( built ) ) {
		for ( const name of fs.readdirSync( built ).sort() ) {
			const file = path.join( built, name, 'index.js' );
			if ( fs.existsSync( file ) ) {
				run( window, file );
			}
		}
		return 'built';
	}
	const legacy = path.join( dir, 'assets/editor.js' );
	if ( ! fs.existsSync( legacy ) ) {
		throw new Error( 'No build/ or legacy assets/editor.js in ' + dir + ' (run npm run build first)' );
	}
	const keys = [ 'apiVersion', 'name', 'title', 'category', 'icon', 'description', 'keywords', 'attributes', 'supports', 'textdomain' ];
	const metadata = fs
		.readdirSync( path.join( dir, 'blocks' ) )
		.sort()
		.map( ( name ) => {
			const json = JSON.parse( fs.readFileSync( path.join( dir, 'blocks', name, 'block.json' ), 'utf8' ) );
			return Object.fromEntries( keys.filter( ( key ) => key in json ).map( ( key ) => [ key, json[ key ] ] ) );
		} );
	window.eval( 'window.animewpBlocksMetadata = ' + JSON.stringify( metadata ) + ';' );
	run( window, path.join( dir, 'assets/providers.js' ) );
	run( window, legacy );
	return 'legacy';
}

module.exports = { ORIGIN, installWordPress, loadPlugin };
