import { useLayoutEffect } from 'react'

import { CustomRules } from './components/CustomRules'
import { Features } from './components/Features'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { AppCta } from './components/AppCta'

export function App() {
  // После коммита, но до покраски: цель уже в DOM, а instant обходит глобальный smooth-scroll.
  useLayoutEffect(() => {
    if (!location.hash) return
    const target = document.getElementById(location.hash.slice(1))
    if (!target) {
      window.scrollTo(0, 0)
      return
    }
    target.scrollIntoView({ block: 'start', behavior: 'instant' })
    const fontReady = document.fonts.ready

    let cancelled = false
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown']
    const stopWatching = () => {
      cancelled = true
      for (const type of events) window.removeEventListener(type, stopWatching)
    }
    for (const type of events) window.addEventListener(type, stopWatching, { passive: true })
    void fontReady.then(() => {
      if (!cancelled) target.scrollIntoView({ block: 'start', behavior: 'instant' })
      stopWatching()
    })
    return stopWatching
  }, [])

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <span id="top" />
        <Hero />
        <HowItWorks />
        <Features />
        <CustomRules />
        <AppCta />
      </main>
      <Footer />
    </>
  )
}
