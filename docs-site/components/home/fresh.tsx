import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '../logo'
import { DOC_PAGES, LEAD, SLOGAN, type DocPage } from './pages'
import { PrimaryLink, SecondaryLink } from './primary-link'
import { HeroGlass } from './hero-glass'
import f from './fresh.module.css'

/*
 * Home variants 7 to 14: home-6 (badge, slogan, subtitle, two buttons, six tiles) with one or two
 * light touches each, borrowed from the landing, the dashboard login page, Mintlify or Linear.
 */

const shell = 'relative isolate mx-auto w-full max-w-[960px] px-4 pt-24 pb-24'
const lead = 'mt-4 text-base text-fd-muted-foreground'
const plainTitle =
  'mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance text-fd-foreground sm:text-5xl'

function Badge({ variant = 'pill' }: { variant?: 'pill' | 'dot' | 'docs' }) {
  if (variant === 'dot') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgb(96_165_250/25%)] bg-[rgb(96_165_250/8%)] px-3 py-1 text-xs font-medium text-[#93c5fd]">
        <span className="size-1.5 rounded-full bg-[var(--glow)]" aria-hidden />
        Reviewer documentation
      </span>
    )
  }
  if (variant === 'docs') {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] text-[var(--glow)] uppercase">
        Documentation
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-fd-muted-foreground">
      <Logo size={14} className="text-fd-foreground" />
      Reviewer documentation
    </span>
  )
}

function Buttons({ align = 'center' }: { align?: 'center' | 'start' }) {
  return (
    <div className={`mt-8 flex flex-wrap gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
      <PrimaryLink />
      <SecondaryLink href="/docs" label="Introduction" />
    </div>
  )
}

type TileStyle = 'plain' | 'tinted' | 'spot' | 'top' | 'row'

function FreshTile({ page, look }: { page: DocPage; look: TileStyle }) {
  const Icon = page.icon
  const box =
    'group rounded-[10px] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]'
  const arrow = (
    <ArrowRight
      className="size-4 shrink-0 text-fd-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
      aria-hidden
    />
  )
  const title = <span className="block text-sm font-medium text-fd-foreground">{page.title}</span>
  const text = <span className="mt-1 block text-[13px] text-fd-muted-foreground">{page.text}</span>

  if (look === 'top') {
    return (
      <Link href={page.href} className={`${box} flex flex-col p-5`}>
        <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
          <Icon className="size-4 text-[var(--glow)]" aria-hidden />
        </span>
        <span className="mt-4 flex items-center gap-1.5">
          {title}
          {arrow}
        </span>
        {text}
      </Link>
    )
  }
  if (look === 'row') {
    return (
      <Link
        href={page.href}
        className="group flex items-start gap-3 border-t border-[var(--border)] py-4 transition-colors"
      >
        <Icon
          className="mt-0.5 size-4 shrink-0 text-fd-muted-foreground group-hover:text-[var(--glow)]"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          {title}
          {text}
        </span>
        {arrow}
      </Link>
    )
  }
  const icon =
    look === 'tinted' || look === 'spot' ? (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[rgb(96_165_250/10%)]">
        <Icon className="size-4 text-[var(--glow)]" aria-hidden />
      </span>
    ) : (
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--glow)]" aria-hidden />
    )
  return (
    <Link href={page.href} className={`${box} ${look === 'spot' ? f.spot : ''} flex gap-3 p-4`}>
      {icon}
      <span className="relative min-w-0 flex-1">
        {title}
        {text}
      </span>
      <span className="relative mt-0.5">{arrow}</span>
    </Link>
  )
}

function Tiles({ look, cols = 3 }: { look: TileStyle; cols?: 2 | 3 }) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : ''} ${look === 'row' ? 'gap-y-0 sm:gap-x-10' : ''}`}
    >
      {DOC_PAGES.map((page) => (
        <FreshTile key={page.href} page={page} look={look} />
      ))}
    </div>
  )
}

/** 7. The landing hero: WebGL glass strips behind the hero and the landing type scale. */
export function HomeGlass() {
  return (
    <main className={shell}>
      <div className={f.glass}>
        <HeroGlass textSelector="#home-hero" />
      </div>
      <div id="home-hero" className="flex flex-col items-center text-center">
        <Badge />
        <h1 className={`${f.landingTitle} mt-6`}>{SLOGAN}</h1>
        <p className={`${lead} max-w-xl text-balance text-[#cbd5e1]`}>{LEAD}</p>
        <Buttons />
      </div>
      <div className="mt-24">
        <Tiles look="plain" />
      </div>
    </main>
  )
}

/** 8. The login page: a large logo mark over the title, the tiles in one card with dividers. */
export function HomeLoginCard() {
  return (
    <main className={shell}>
      <div className="flex flex-col items-center text-center">
        <Logo size={40} className="text-fd-foreground" />
        <div className="mt-5">
          <Badge />
        </div>
        <h1 className={plainTitle}>{SLOGAN}</h1>
        <p className={`${lead} max-w-xl text-balance`}>{LEAD}</p>
        <Buttons />
      </div>
      <div className="mt-16 grid overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-2 lg:grid-cols-3">
        {DOC_PAGES.map((page) => {
          const Icon = page.icon
          return (
            <Link
              key={page.href}
              href={page.href}
              className="group -mt-px -ml-px flex gap-3 border-t border-l border-[var(--border)] p-5 transition-colors hover:bg-[var(--surface-2)]"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-[var(--glow)]" aria-hidden />
              <span>
                <span className="block text-sm font-medium text-fd-foreground">{page.title}</span>
                <span className="mt-1 block text-[13px] text-fd-muted-foreground">{page.text}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

/** 9. Refined details: a dot badge, icons in tinted squares, a sliding arrow on hover. */
export function HomeTinted() {
  return (
    <main className={shell}>
      <div className="flex flex-col items-center text-center">
        <Badge variant="dot" />
        <h1 className={plainTitle}>{SLOGAN}</h1>
        <p className={`${lead} max-w-xl text-balance`}>{LEAD}</p>
        <Buttons />
      </div>
      <div className="mt-16">
        <Tiles look="tinted" />
      </div>
    </main>
  )
}

/** 10. A soft grid texture behind the hero, fading out from the top. */
export function HomeGrid() {
  return (
    <main className={shell}>
      <div className={f.grid} aria-hidden />
      <div className="flex flex-col items-center text-center">
        <Badge />
        <h1 className={plainTitle}>{SLOGAN}</h1>
        <p className={`${lead} max-w-xl text-balance`}>{LEAD}</p>
        <Buttons />
      </div>
      <div className="mt-20">
        <Tiles look="plain" />
      </div>
    </main>
  )
}

/** 11. Grain and a blue glow (the landing hero fallback) plus a spotlight hover on tiles. */
export function HomeGrain() {
  return (
    <main className={shell}>
      <div className={f.grain} aria-hidden />
      <div className="flex flex-col items-center text-center">
        <Badge variant="dot" />
        <h1 className={`${f.landingTitle} mt-6`}>{SLOGAN}</h1>
        <p className={`${lead} max-w-xl text-balance text-[#cbd5e1]`}>{LEAD}</p>
        <Buttons />
      </div>
      <div className="mt-20">
        <Tiles look="spot" />
      </div>
    </main>
  )
}

/** 12. Mintlify: light band at the top, airy spacing, tiles with the icon on top, two columns. */
export function HomeMintlify() {
  return (
    <main className={`${shell} max-w-[820px] pt-28`}>
      <div className={f.band} aria-hidden />
      <div className="flex flex-col items-center text-center">
        <Badge />
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.035em] text-balance text-fd-foreground sm:text-[2.75rem]">
          {SLOGAN}
        </h1>
        <p className={`${lead} max-w-lg text-balance`}>{LEAD}</p>
        <Buttons />
      </div>
      <div className="mt-20">
        <Tiles look="top" cols={2} />
      </div>
    </main>
  )
}

/** 13. Linear: text starts right away, left aligned, tiles as quiet rows with thin dividers. */
export function HomeLinear() {
  return (
    <main className={`${shell} pt-16`}>
      <Badge variant="docs" />
      <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-fd-foreground sm:text-4xl">
        {SLOGAN}
      </h1>
      <p className={`${lead} max-w-xl`}>{LEAD}</p>
      <Buttons align="start" />
      <div className="mt-14">
        <Tiles look="row" cols={2} />
      </div>
    </main>
  )
}

/** 14. Linear and Mintlify: left aligned hero with the large mark, tiles split into two groups. */
export function HomeGrouped() {
  const groups = [
    { name: 'Get started', pages: DOC_PAGES.slice(0, 3) },
    { name: 'Reference', pages: DOC_PAGES.slice(3) },
  ]
  return (
    <main className={`${shell} pt-20`}>
      <div className={f.band} aria-hidden />
      <div className="flex items-center gap-3">
        <Logo size={32} className="text-fd-foreground" />
        <Badge />
      </div>
      <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-fd-foreground sm:text-5xl">
        {SLOGAN}
      </h1>
      <p className={`${lead} max-w-xl`}>{LEAD}</p>
      <Buttons align="start" />
      {groups.map((group) => (
        <section key={group.name} className="mt-14">
          <h2 className="text-xs font-medium tracking-[0.08em] text-fd-muted-foreground uppercase">
            {group.name}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.pages.map((page) => (
              <FreshTile key={page.href} page={page} look="tinted" />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
