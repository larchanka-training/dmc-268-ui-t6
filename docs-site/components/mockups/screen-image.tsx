import { ImageZoom } from 'fumadocs-ui/components/image-zoom'
import screens from './screens.json'

export type ShotName = keyof typeof screens

interface ScreenImageProps {
  /** A picture in public/screens, taken from /mockups/<name> by `pnpm --dir docs-site shots`. */
  name: ShotName
  /** Short description of what the picture shows; also the caption under it. */
  caption: string
  /** The widest the card gets, in pixels; by default the picture's own width. */
  maxWidth?: number
  /** Center the caption, as under the wide dashboard screens. */
  centerCaption?: boolean
}

/**
 * A picture of the dashboard. Width and height are set, so the page does not jump while it loads,
 * and the card has the dashboard background, so a picture still on its way shows as a dark card,
 * not a white box. Click or tap opens it zoomed in on the same page.
 */
export function ScreenImage({ name, caption, maxWidth, centerCaption = false }: ScreenImageProps) {
  const { src, width, height } = screens[name]
  return (
    <figure className="not-prose my-6" style={{ maxWidth: maxWidth ?? width }}>
      <ImageZoom src={src} alt={caption} zoomInProps={{ src, alt: caption }}>
        <img
          alt={caption}
          className="block h-auto w-full rounded-xl border border-fd-border bg-[#090d18] shadow-lg"
          decoding="async"
          height={height}
          loading="lazy"
          src={src}
          width={width}
        />
      </ImageZoom>
      <figcaption
        className={`mt-2 text-sm text-fd-muted-foreground${centerCaption ? ' text-center' : ''}`}
      >
        {caption}
      </figcaption>
    </figure>
  )
}
