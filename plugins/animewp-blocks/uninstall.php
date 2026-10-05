<?php
/** Saved post content remains the user's content after uninstall. */
namespace Animewp\Blocks;

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// This plugin has no stored options, tables, or generated posts to remove.
