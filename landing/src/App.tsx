import { CustomRules } from './components/CustomRules'
import { Features } from './components/Features'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { Waitlist } from './components/Waitlist'

export function App() {
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
        <Waitlist />
      </main>
      <Footer />
    </>
  )
}
