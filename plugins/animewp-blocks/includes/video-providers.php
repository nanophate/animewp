<?php
/**
 * Server-side twin of src/shared/providers.js: accepts the same YouTube and
 * Vimeo page URLs and nothing else. tests/providers.test.js covers the JS side;
 * keep the two in step.
 */

namespace Animewp\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function video_start_seconds( string $value ): ?int {
	if ( '' === $value ) {
		return 0;
	}
	if ( preg_match( '/^\d+$/', $value ) ) {
		return min( 86400, (int) $value );
	}
	if ( ! preg_match( '/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/', $value, $match ) || '' === $match[0] ) {
		return null;
	}
	return min( 86400, (int) ( $match[1] ?? 0 ) * 3600 + (int) ( $match[2] ?? 0 ) * 60 + (int) ( $match[3] ?? 0 ) );
}

/**
 * @return array{provider:string,id:string,start:int}|null
 */
function video_provider( string $source, string $value ): ?array {
	$value = trim( $value );
	if ( ! preg_match( '#^https://#i', $value ) || preg_match( '/[\\\\\x00-\x20\x7f<>"`]/', $value ) ) {
		return null;
	}
	$parts = wp_parse_url( $value );
	if ( ! $parts || isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['port'] ) || empty( $parts['host'] ) ) {
		return null;
	}
	$host = strtolower( $parts['host'] );
	$path = $parts['path'] ?? '';
	parse_str( $parts['query'] ?? '', $query );
	$fragment = $parts['fragment'] ?? '';
	$start = video_start_seconds( (string) ( $query['start'] ?? $query['t'] ?? preg_replace( '/^t=/', '', $fragment ) ) );
	if ( null === $start ) {
		return null;
	}
	$id = '';
	if ( 'youtube' === $source ) {
		if ( 'youtu.be' === $host ) {
			$id = substr( $path, 1 );
		} elseif ( in_array( $host, array( 'youtube.com', 'www.youtube.com', 'm.youtube.com' ), true ) ) {
			if ( '/watch' === $path ) {
				$id = (string) ( $query['v'] ?? '' );
			} elseif ( preg_match( '#^/(?:embed|shorts|live)/([A-Za-z0-9_-]{11})/?$#', $path, $match ) ) {
				$id = $match[1];
			}
		} elseif ( in_array( $host, array( 'www.youtube-nocookie.com', 'youtube-nocookie.com' ), true ) && preg_match( '#^/embed/([A-Za-z0-9_-]{11})/?$#', $path, $match ) ) {
			$id = $match[1];
		}
		if ( ! preg_match( '/^[A-Za-z0-9_-]{11}$/', $id ) ) {
			return null;
		}
	} elseif ( 'vimeo' === $source ) {
		if ( in_array( $host, array( 'vimeo.com', 'www.vimeo.com' ), true ) && preg_match( '#^/(\d{1,12})/?$#', $path, $match ) ) {
			$id = $match[1];
		} elseif ( 'player.vimeo.com' === $host && preg_match( '#^/video/(\d{1,12})/?$#', $path, $match ) ) {
			$id = $match[1];
		}
		// Private and unlisted links use another authorization model; keep them as links.
		if ( '' === $id || isset( $query['h'] ) ) {
			return null;
		}
	} else {
		return null;
	}
	return array( 'provider' => $source, 'id' => $id, 'start' => $start );
}

/** Site-relative path for a same-site image, or '' (mirrors localPosterUrl in sanitize.js). */
function local_media_path( string $value ): string {
	$value = trim( $value );
	if ( '' === $value || preg_match( '/[\\\\\x00-\x20\x7f<>"`]/', $value ) ) {
		return '';
	}
	if ( str_starts_with( $value, '/' ) && ! str_starts_with( $value, '//' ) ) {
		return $value;
	}
	$parts = wp_parse_url( $value );
	$home  = wp_parse_url( home_url() );
	if ( ! $parts || empty( $parts['host'] ) || strtolower( $parts['host'] ) !== strtolower( $home['host'] ?? '' ) || ( $parts['port'] ?? null ) !== ( $home['port'] ?? null ) ) {
		return '';
	}
	return ( $parts['path'] ?? '/' ) . ( isset( $parts['query'] ) ? '?' . $parts['query'] : '' );
}
