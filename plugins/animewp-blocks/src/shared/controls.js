/**
 * Thin wrappers over Core controls that clamp and validate before saving.
 * Labels arrive already translated so string extraction sees literals.
 */
import {
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { enumValue, numberValue } from './sanitize';

export function Range( {
	attributes,
	setAttributes,
	name,
	label,
	min,
	max,
	fallback,
	step = 1,
	help,
} ) {
	return (
		<RangeControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ label }
			help={ help }
			value={ numberValue( attributes[ name ], min, max, fallback ) }
			min={ min }
			max={ max }
			step={ step }
			onChange={ ( value ) =>
				setAttributes( {
					[ name ]: numberValue( value, min, max, fallback ),
				} )
			}
		/>
	);
}

export function Select( {
	attributes,
	setAttributes,
	name,
	label,
	options,
	fallback,
	help,
} ) {
	return (
		<SelectControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ label }
			help={ help }
			value={ enumValue(
				attributes[ name ],
				options.map( ( option ) => option.value ),
				fallback
			) }
			options={ options }
			onChange={ ( value ) => setAttributes( { [ name ]: value } ) }
		/>
	);
}

export function Toggle( { attributes, setAttributes, name, label, help } ) {
	return (
		<ToggleControl
			__nextHasNoMarginBottom
			label={ label }
			help={ help }
			checked={ attributes[ name ] === true }
			onChange={ ( value ) => setAttributes( { [ name ]: !! value } ) }
		/>
	);
}
