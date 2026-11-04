import { useLayoutEffect } from 'react'

import { CustomRules } from './components/CustomRules'
import { Features } from './components/Features'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { AppCta } from './components/AppCta'

export function App() {
  useLayoutEffect(() => {
    if (!location.hash) return
    const target = document.getElementById(location.hash.slice(1))
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' })
    else window.scrollTo(0, 0)
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
