import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../sections/Hero'
import { About } from '../sections/About'
import { WhatIDo } from '../sections/WhatIDo'
import { Work } from '../sections/Work'
import { OneSip } from '../sections/OneSip'
import { Toolkit } from '../sections/Toolkit'
import { Vision } from '../sections/Vision'
import { Collaborate } from '../sections/Collaborate'
import { Contact } from '../sections/Contact'
import { Ticker } from '../components/Ticker'
import { scrollToTarget } from '../lib/smooth'
import { settle } from '../lib/gate'

export default function Home() {
  const { hash } = useLocation()
  // Arriving from a project page with /#section: the page mounts late and its
  // scroll height grows, so an early jump clamps short. Re-apply the jump each
  // frame until the position actually sticks, then let the route veil lift.
  useEffect(() => {
    if (!hash) return
    const id = (() => {
      try {
        return decodeURIComponent(hash.slice(1))
      } catch {
        return hash.slice(1)
      }
    })()
    let raf = 0
    let tries = 0
    const step = () => {
      const el = document.getElementById(id)
      if (!el) {
        if (++tries < 120) raf = requestAnimationFrame(step)
        else settle()
        return
      }
      scrollToTarget(el, true)
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      const want = el.getBoundingClientRect().top + window.scrollY - margin
      if (Math.abs(window.scrollY - want) <= 2 || ++tries >= 120) {
        settle()
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      settle()
    }
  }, [hash])

  return (
    <main>
      <Hero />
      <Ticker />
      <About />
      <WhatIDo />
      <Work />
      <OneSip />
      <Toolkit />
      <Vision />
      <Collaborate />
      <Contact />
    </main>
  )
}
