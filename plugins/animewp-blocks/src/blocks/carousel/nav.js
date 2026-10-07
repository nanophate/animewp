/** Editor-only picture of the controls the view script adds on the site. */
import { safeText } from '../../shared/sanitize';

function Arrow( { direction, label, style } ) {
	return (
		<span className={ 'animewp-carousel__arrow is-' + direction }>
			{ style === 'icon' && (
				<span className="animewp-carousel__chevron" />
			) }
			{ style === 'line' && direction === 'prev' && (
				<span className="animewp-carousel__line" />
			) }
			{ style !== 'icon' && (
				<span className="animewp-carousel__arrow-text">{ label }</span>
			) }
			{ style === 'line' && direction === 'next' && (
				<span className="animewp-carousel__line" />
			) }
		</span>
	);
}

export function NavPreview( { attributes: a } ) {
	if ( a.navStyle === 'none' && a.showDots === false ) {
		return null;
	}
	return (
		<div className="animewp-carousel__nav" aria-hidden="true">
			{ a.navStyle !== 'none' && (
				<Arrow
					direction="prev"
					style={ a.navStyle }
					label={ safeText( a.prevLabel, '前へ', 40 ) }
				/>
			) }
			{ a.showDots !== false && (
				<span className="animewp-carousel__dots">
					<span
						className="animewp-carousel__dot"
						aria-current="true"
					/>
					<span className="animewp-carousel__dot" />
					<span className="animewp-carousel__dot" />
				</span>
			) }
			{ a.navStyle !== 'none' && (
				<Arrow
					direction="next"
					style={ a.navStyle }
					label={ safeText( a.nextLabel, '次へ', 40 ) }
				/>
			) }
		</div>
	);
}
