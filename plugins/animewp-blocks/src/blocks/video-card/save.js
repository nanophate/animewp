/**
 * Fully static: without the plugin the card is still a linked poster with its
 * caption. The view script opens the link in a player window instead.
 */
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { frameStyle } from './frame';
import { cardStyle, labels, plainText, playTarget, poster } from './markup';

export default function save( { attributes: a } ) {
	const target = playTarget( a );
	const image = poster( a );
	const text = labels( a );
	const frame = (
		<span className="animewp-video-card__frame" style={ frameStyle( a ) }>
			{ image && (
				<img src={ image } alt="" loading="lazy" decoding="async" />
			) }
			{ target && (
				<span className="animewp-video-card__play" aria-hidden="true" />
			) }
		</span>
	);
	return (
		<figure { ...useBlockProps.save( { style: cardStyle( a ) } ) }>
			{ target ? (
				<a
					className="animewp-video-card__link"
					{ ...target }
					data-close-label={ text.close }
					aria-label={ (
						text.play +
						' ' +
						plainText( a.title || a.label )
					).trim() }
				>
					{ frame }
				</a>
			) : (
				frame
			) }
			{ ( a.label || a.title ) && (
				<figcaption className="animewp-video-card__caption">
					{ a.label && (
						<RichText.Content
							tagName="span"
							className="animewp-video-card__label"
							value={ a.label }
						/>
					) }
					{ a.title && (
						<RichText.Content
							tagName="span"
							className="animewp-video-card__title"
							value={ a.title }
						/>
					) }
				</figcaption>
			) }
		</figure>
	);
}
