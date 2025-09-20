'use client'

import { useEffect } from 'react'

export function MixedContentDetector() {
  useEffect(() => {
    console.log('🔒 === MIXED CONTENT DETECTOR ACTIVE ===')
    console.log('Current page URL:', window.location.href)
    console.log('Protocol:', window.location.protocol)
    
    // Check if we're on HTTPS
    if (window.location.protocol !== 'https:') {
      console.warn('⚠️ Page is not served over HTTPS!')
      return
    }

    // Monitor all resource loads
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ('name' in entry && typeof entry.name === 'string') {
          if (entry.name.startsWith('http://')) {
            console.error('❌ HTTP RESOURCE DETECTED:', entry.name)
            console.error('Entry type:', entry.entryType)
            console.error('Full details:', entry)
          }
        }
      }
    })

    // Observe all resource types
    try {
      observer.observe({ entryTypes: ['resource', 'navigation', 'fetch'] })
    } catch {
      // Some entry types might not be supported
      try {
        observer.observe({ entryTypes: ['resource'] })
      } catch {
        console.warn('Performance observer not fully supported')
      }
    }

    // Check all existing images
    const images = document.getElementsByTagName('img')
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img.src && img.src.startsWith('http://')) {
        console.error('❌ HTTP IMAGE:', img.src)
      }
      if (img.currentSrc && img.currentSrc.startsWith('http://')) {
        console.error('❌ HTTP IMAGE (currentSrc):', img.currentSrc)
      }
    }

    // Check all existing scripts
    const scripts = document.getElementsByTagName('script')
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i]
      if (script.src && script.src.startsWith('http://')) {
        console.error('❌ HTTP SCRIPT:', script.src)
      }
    }

    // Check all existing links (stylesheets)
    const links = document.getElementsByTagName('link')
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      if (link.href && link.href.startsWith('http://')) {
        console.error('❌ HTTP LINK:', link.href)
        console.error('Link rel:', link.rel)
      }
    }

    // Check all iframes
    const iframes = document.getElementsByTagName('iframe')
    for (let i = 0; i < iframes.length; i++) {
      const iframe = iframes[i]
      if (iframe.src && iframe.src.startsWith('http://')) {
        console.error('❌ HTTP IFRAME:', iframe.src)
      }
    }

    // Monitor XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
      if (typeof url === 'string' && url.startsWith('http://')) {
        console.error('❌ HTTP XHR REQUEST:', url)
      }
      return originalXHROpen.call(this, method, url, async ?? true, username, password)
    }

    // Monitor fetch requests
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const url = args[0]
      if (typeof url === 'string' && url.startsWith('http://')) {
        console.error('❌ HTTP FETCH REQUEST:', url)
      }
      return originalFetch.apply(this, args)
    }

    // Check for form actions
    const forms = document.getElementsByTagName('form')
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i]
      if (form.action && form.action.startsWith('http://')) {
        console.error('❌ HTTP FORM ACTION:', form.action)
      }
    }

    // Log all external resources for analysis
    console.log('🔍 === RESOURCE AUDIT ===')
    
    // Get all resources from performance API
    const resources = performance.getEntriesByType('resource')
    const externalResources = resources.filter(r => 
      'name' in r && !r.name.includes(window.location.hostname)
    )
    
    if (externalResources.length > 0) {
      console.log('External resources loaded:')
      externalResources.forEach(r => {
        console.log(`- ${r.name}`)
      })
    }

    // Check meta tags
    const metaTags = document.getElementsByTagName('meta')
    for (let i = 0; i < metaTags.length; i++) {
      const meta = metaTags[i]
      if (meta.content && meta.content.includes('http://')) {
        console.warn('⚠️ Meta tag with HTTP content:', meta.name || (meta as any).property, meta.content)
      }
    }

    console.log('🔒 === MIXED CONTENT CHECK COMPLETE ===')
    console.log('If no HTTP resources were logged above, mixed content is not the issue.')

    // Cleanup
    return () => {
      XMLHttpRequest.prototype.open = originalXHROpen
      window.fetch = originalFetch
      observer.disconnect()
    }
  }, [])

  return null
}