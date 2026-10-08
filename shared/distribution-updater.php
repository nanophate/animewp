<?php
/**
 * AnimeWP native distribution updater. Canonical source; synchronize the two
 * distributable copies with python3 shared/sync-updater.py. No external library.
 *
 * Increment the implementation class/version when changing this protocol's
 * implementation. The newest loaded implementation registers the hooks once,
 * after both plugins and the active theme have had a chance to load their copy.
 */
namespace AnimeWP\Distribution;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( __NAMESPACE__ . '\\Updater_1_0_0', false ) ) {
	final class Updater_1_0_0 {
		const HOME = 'https://github.com/nanophate/animewp';
		const FEED = 'https://raw.githubusercontent.com/nanophate/animewp/main/wp-';
		const CACHE = 'animewp_distribution_v1_feed_';
		const GOOD = 'animewp_distribution_v1_good_';
		const PLUGIN = 'animewp-blocks/animewp-blocks.php';

		public static function register(): void {
			add_filter( 'update_plugins_github.com', array( __CLASS__, 'plugin_update' ), 10, 4 );
			add_filter( 'update_themes_github.com', array( __CLASS__, 'theme_update' ), 10, 4 );
			add_filter( 'plugins_api', array( __CLASS__, 'plugin_info' ), 10, 3 );
			add_filter( 'themes_api', array( __CLASS__, 'theme_info' ), 10, 3 );
			add_filter( 'upgrader_pre_download', array( __CLASS__, 'download' ), 100, 4 );
			// WordPress's "Check again" must also refresh our short-lived cache.
			add_action( 'delete_site_transient_update_plugins', static function () { delete_site_transient( self::CACHE . 'plugin' ); } );
			add_action( 'delete_site_transient_update_themes', static function () { delete_site_transient( self::CACHE . 'theme' ); } );
		}

		public static function slug( string $type ): string {
			return 'theme' === $type ? 'animewp' : 'animewp-blocks';
		}

		public static function uri( string $type ): string {
			return self::HOME . '/tree/main/' . ( 'theme' === $type ? 'themes/animewp' : 'plugins/animewp-blocks' );
		}

		/** Validate before either caching data or placing it in native UI responses. */
		public static function validate( $data, string $type ): ?array {
			if ( ! in_array( $type, array( 'theme', 'plugin' ), true ) || ! is_array( $data ) ||
				1 !== ( $data['schema_version'] ?? null ) || $type !== ( $data['type'] ?? null ) ||
				self::slug( $type ) !== ( $data['slug'] ?? null ) ) {
				return null;
			}
			if ( 'unpublished' === ( $data['status'] ?? null ) ) {
				return array( 'schema_version' => 1, 'status' => 'unpublished', 'type' => $type, 'slug' => self::slug( $type ) );
			}
			if ( 'published' !== ( $data['status'] ?? null ) ) {
				return null;
			}
			foreach ( array( 'version', 'name', 'requires', 'requires_php', 'tested', 'homepage', 'download_url', 'sha256', 'last_updated' ) as $key ) {
				if ( ! isset( $data[ $key ] ) || ! is_string( $data[ $key ] ) || '' === $data[ $key ] ) {
					return null;
				}
			}
			if ( strlen( $data['version'] ) > 30 || ! preg_match( '/\A(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\z/', $data['version'] ) ||
				self::HOME !== $data['homepage'] || ! preg_match( '/\A[a-f0-9]{64}\z/', $data['sha256'] ) || strlen( $data['name'] ) > 200 ) {
				return null;
			}
			$package = self::HOME . '/releases/download/v' . $data['version'] . '/' . self::slug( $type ) . '-' . $data['version'] . '.zip';
			// Exact equality rejects alternate hosts/repos/assets, userinfo, ports,
			// queries, fragments, traversal and mismatched tag/asset versions.
			if ( $package !== $data['download_url'] ) {
				return null;
			}
			foreach ( array( 'requires', 'requires_php', 'tested' ) as $key ) {
				if ( ! preg_match( '/\A[0-9]{1,4}\.[0-9]{1,4}(?:\.[0-9]{1,4})?\z/', $data[ $key ] ) ) {
					return null;
				}
			}
			// In PHP 8, createFromFormat() throws for a null byte rather than
			// returning false. Reject malformed input before calling the parser.
			if ( ! preg_match( '/\A[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\z/', $data['last_updated'] ) ) {
				return null;
			}
			$date = \DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i:s\Z', $data['last_updated'], new \DateTimeZone( 'UTC' ) );
			if ( ! $date || $date->format( 'Y-m-d\TH:i:s\Z' ) !== $data['last_updated'] || ! is_array( $data['sections'] ?? null ) ) {
				return null;
			}
			foreach ( array( 'description', 'changelog' ) as $section ) {
				if ( ! isset( $data['sections'][ $section ] ) || ! is_string( $data['sections'][ $section ] ) || strlen( $data['sections'][ $section ] ) > 24000 ) {
					return null;
				}
				$data['sections'][ $section ] = wp_kses_post( $data['sections'][ $section ] );
			}
			$data['sections'] = array_intersect_key( $data['sections'], array_flip( array( 'description', 'changelog' ) ) );
			$data['name'] = sanitize_text_field( $data['name'] );
			return $data;
		}

		/** A failed request never emits a notice or replaces native screens. */
		public static function metadata( string $type ): ?array {
			$cached = get_site_transient( self::CACHE . $type );
			if ( false === $cached ) {
				$response = wp_safe_remote_get( self::FEED . $type . '.json', array(
					'timeout' => 5, 'redirection' => 0, 'limit_response_size' => 65536,
					'headers' => array( 'Accept' => 'application/json' ),
				) );
				$cached = null;
				if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
					$body = wp_remote_retrieve_body( $response );
					if ( strlen( $body ) <= 65536 ) {
						$decoded = json_decode( $body, true, 16 );
						$cached = JSON_ERROR_NONE === json_last_error() ? self::validate( $decoded, $type ) : null;
					}
				}
				if ( $cached ) {
					set_site_transient( self::CACHE . $type, $cached, HOUR_IN_SECONDS );
					if ( 'published' === $cached['status'] ) {
						update_site_option( self::GOOD . $type, array( 'time' => time(), 'data' => $cached ) );
					} else {
						delete_site_option( self::GOOD . $type );
					}
				} else {
					set_site_transient( self::CACHE . $type, array( 'error' => true ), 5 * MINUTE_IN_SECONDS );
				}
			}
			$valid = self::validate( $cached, $type );
			if ( $valid ) {
				return 'published' === $valid['status'] ? $valid : null;
			}
			$good = get_site_option( self::GOOD . $type );
			if ( is_array( $good ) && isset( $good['time'], $good['data'] ) && is_int( $good['time'] ) &&
				$good['time'] <= time() && $good['time'] >= time() - 7 * DAY_IN_SECONDS ) {
				$valid = self::validate( $good['data'], $type );
				return $valid && 'published' === $valid['status'] ? $valid : null;
			}
			return null;
		}

		private static function compatible( array $data ): bool {
			return is_wp_version_compatible( $data['requires'] ) && is_php_version_compatible( $data['requires_php'] );
		}

		private static function update_data( string $type ): ?array {
			$data = self::metadata( $type );
			if ( ! $data ) {
				return null;
			}
			return array(
				'id' => self::uri( $type ), 'slug' => self::slug( $type ), 'theme' => self::slug( $type ),
				'version' => $data['version'], 'url' => self::HOME,
				'package' => self::compatible( $data ) ? $data['download_url'] : '',
				'requires' => $data['requires'], 'requires_php' => $data['requires_php'], 'tested' => $data['tested'],
			);
		}

		public static function plugin_update( $update, $headers, $file, $locales ) {
			if ( self::PLUGIN !== $file || self::uri( 'plugin' ) !== ( $headers['UpdateURI'] ?? '' ) ) {
				return $update;
			}
			return self::update_data( 'plugin' ) ?? $update;
		}

		public static function theme_update( $update, $headers, $stylesheet, $locales ) {
			if ( 'animewp' !== $stylesheet || self::uri( 'theme' ) !== ( $headers['UpdateURI'] ?? '' ) ) {
				return $update;
			}
			return self::update_data( 'theme' ) ?? $update;
		}

		private static function information( $result, $action, $args, string $type ) {
			if ( $type . '_information' !== $action || ! is_object( $args ) || self::slug( $type ) !== ( $args->slug ?? '' ) ) {
				return $result;
			}
			$data = self::metadata( $type );
			if ( ! $data ) {
				return $result;
			}
			$information = array(
				'name' => $data['name'], 'slug' => $data['slug'], 'version' => $data['version'],
				'author' => 'nanophate', 'homepage' => self::HOME, 'external' => true,
				'download_link' => self::compatible( $data ) ? $data['download_url'] : '',
				'requires' => $data['requires'], 'requires_php' => $data['requires_php'], 'tested' => $data['tested'],
				'last_updated' => $data['last_updated'], 'sections' => $data['sections'],
			);
			if ( 'theme' === $type ) {
				$installed = wp_get_theme( 'animewp' );
				$information['description'] = $data['sections']['description'];
				$information['rating'] = 0;
				$information['num_ratings'] = 0;
				// Core's information modal previews the already installed theme;
				// no remote demo, ratings or screenshots are supplied by the feed.
				$information['preview_url'] = $installed->exists() ? add_query_arg( 'wp_theme_preview', 'animewp', home_url( '/' ) ) : home_url( '/' );
				$information['screenshot_url'] = $installed->get_screenshot() ?: '';
			}
			return (object) $information;
		}

		public static function plugin_info( $result, $action, $args ) {
			return self::information( $result, $action, $args, 'plugin' );
		}

		public static function theme_info( $result, $action, $args ) {
			return self::information( $result, $action, $args, 'theme' );
		}

		/** Only GitHub's HTTPS release storage may receive its signed redirect query. */
		private static function redirect_allowed( string $url ): bool {
			if ( preg_match( '/[\\\\\x00-\x20\x7f]/', $url ) ) {
				return false;
			}
			$parts = wp_parse_url( $url );
			return is_array( $parts ) && 'https' === ( $parts['scheme'] ?? '' ) &&
				in_array( $parts['host'] ?? '', array( 'release-assets.githubusercontent.com', 'objects.githubusercontent.com' ), true ) &&
				! isset( $parts['user'] ) && ! isset( $parts['pass'] ) &&
				! isset( $parts['port'] ) && ! isset( $parts['fragment'] );
		}

		/** Download first, verify SHA-256, then let native WP_Upgrader unpack it. */
		public static function download( $reply, $package, $upgrader, $extra ) {
			$type = self::PLUGIN === ( $extra['plugin'] ?? '' ) ? 'plugin' : ( 'animewp' === ( $extra['theme'] ?? '' ) ? 'theme' : null );
			if ( ! $type && is_string( $package ) && preg_match( '#\Ahttps://github\.com/nanophate/animewp/releases/download/v[0-9.]+/(animewp-blocks|animewp)-[0-9.]+\.zip\z#', $package, $match ) ) {
				$type = 'animewp' === $match[1] ? 'theme' : 'plugin';
			}
			if ( ! $type || is_wp_error( $reply ) ) {
				return $reply;
			}
			if ( ( isset( $extra['plugin'] ) && self::PLUGIN !== $extra['plugin'] ) ||
				( isset( $extra['theme'] ) && 'animewp' !== $extra['theme'] ) ||
				( isset( $extra['type'] ) && $type !== $extra['type'] ) ) {
				return new \WP_Error( 'animewp_update_target', 'This AnimeWP release does not match the update target.' );
			}
			$data = self::metadata( $type );
			if ( ! $data || $data['download_url'] !== $package ) {
				return new \WP_Error( 'animewp_update_metadata', 'AnimeWP could not verify this update package. Check for updates again and retry.' );
			}
			if ( ! self::compatible( $data ) ) {
				return new \WP_Error( 'animewp_update_requirements', 'This AnimeWP update requires a newer WordPress or PHP version.' );
			}
			// Another downloader must not bypass verification. It retains ownership
			// of any file it returned; this updater only deletes its own temp files.
			if ( false !== $reply ) {
				$hash = is_string( $reply ) && is_file( $reply ) && is_readable( $reply ) ? hash_file( 'sha256', $reply ) : false;
				return is_string( $hash ) && hash_equals( $data['sha256'], $hash )
					? $reply : new \WP_Error( 'animewp_update_checksum', 'AnimeWP update checksum verification failed.' );
			}
			if ( ! function_exists( 'wp_tempnam' ) ) {
				require_once ABSPATH . 'wp-admin/includes/file.php';
			}
			$temp = wp_tempnam( $data['slug'] . '.zip' );
			if ( ! $temp ) {
				return new \WP_Error( 'animewp_update_temp', 'AnimeWP could not create a temporary download file.' );
			}
			$url = $package;
			$error = new \WP_Error( 'animewp_update_download', 'AnimeWP could not download the verified release package.' );
			for ( $attempt = 0; $attempt < 4; $attempt++ ) {
				$response = wp_safe_remote_get( $url, array( 'timeout' => 30, 'redirection' => 0, 'stream' => true, 'filename' => $temp, 'limit_response_size' => 64 * MB_IN_BYTES ) );
				if ( is_wp_error( $response ) ) {
					break;
				}
				$status = wp_remote_retrieve_response_code( $response );
				if ( in_array( $status, array( 301, 302, 303, 307, 308 ), true ) ) {
					$next = wp_remote_retrieve_header( $response, 'location' );
					if ( ! is_string( $next ) || ! self::redirect_allowed( $next ) ) {
						break;
					}
					$url = $next;
					continue;
				}
				if ( 200 === $status && is_readable( $temp ) ) {
					$hash = hash_file( 'sha256', $temp );
					if ( is_string( $hash ) && hash_equals( $data['sha256'], $hash ) ) {
						return $temp;
					}
					$error = new \WP_Error( 'animewp_update_checksum', 'AnimeWP update checksum verification failed.' );
				}
				break;
			}
			wp_delete_file( $temp );
			return $error;
		}
	}
}

$GLOBALS['animewp_distribution_implementations_v1']['1.0.0'] = __NAMESPACE__ . '\\Updater_1_0_0';
if ( empty( $GLOBALS['animewp_distribution_bootstrap_v1'] ) ) {
	$GLOBALS['animewp_distribution_bootstrap_v1'] = true;
	add_action( 'after_setup_theme', static function () {
		if ( ! empty( $GLOBALS['animewp_distribution_active_v1'] ) ) {
			return;
		}
		$implementations = $GLOBALS['animewp_distribution_implementations_v1'];
		uksort( $implementations, 'version_compare' );
		$implementation = end( $implementations );
		$implementation::register();
		$GLOBALS['animewp_distribution_active_v1'] = $implementation;
	}, 99 );
}
