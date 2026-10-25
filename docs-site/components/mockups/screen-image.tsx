import { ImageZoom } from 'fumadocs-ui/components/image-zoom'
import { basePath } from '@/lib/shared'
import screens from './screens.json'

export type ShotName = keyof typeof screens

interface ScreenImageProps {
  /** A picture in public/screens, taken from /mockups/<name> by `pnpm --dir docs-site shots`. */
  name: ShotName
  /** What the picture shows, for screen readers; says something the caption does not. */
  alt: string
  /** The caption under the picture. */
  caption: string
  /** A second caption line, for example a note on the wording shown in the picture. */
  note?: string
  /** Center the caption, as under the wide dashboard screens. */
  centerCaption?: boolean
}

/**
 * A picture of the dashboard. Width and height are set, so the page does not jump while it loads,
 * and the card has the dashboard background, so a picture still on its way shows as a dark card,
 * not a white box. Click or tap opens it zoomed in on the same page.
 */
export function ScreenImage({ name, alt, caption, note, centerCaption = false }: ScreenImageProps) {
  const { width, height } = screens[name]
  // A plain <img> does not get the base path from Next.js; screens.json keeps it out.
  const src = `${basePath}${screens[name].src}`
  return (
    <figure className="not-prose my-6" style={{ maxWidth: width }}>
      <ImageZoom src={src} alt={alt} zoomInProps={{ src, alt }}>
        <img
          alt={alt}
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
        {note === undefined ? null : <span className="mt-1 block">{note}</span>}
      </figcaption>
    </figure>
  )
}
