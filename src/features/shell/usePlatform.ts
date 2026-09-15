// Platform detection for shortcut labels only (⌘ vs Ctrl). The handlers
// accept both modifiers regardless, so a misdetect only mislabels.
import { useEffect, useState } from 'react'

export function usePlatform() {
  const [isMac, setIsMac] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Prefers Client Hints; navigator.platform is deprecated and frozen to
  // 'Win32' in newer Chrome, so it can no longer be trusted on its own.
  useEffect(() => {
    const checkPlatform = () => {
      const hinted = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform?.toLowerCase() ?? ''
      const userAgent = navigator.userAgent.toLowerCase()
      const legacy = typeof navigator.platform === 'string' ? navigator.platform.toLowerCase() : ''
      const mac = hinted.includes('mac') || legacy.includes('mac') || userAgent.includes('macintosh') || userAgent.includes('mac os x')
      const mobile = window.innerWidth < 768 || /android|iphone|ipad|ipod/i.test(userAgent)
      setIsMac(mac)
      setIsMobile(mobile)
    }
    checkPlatform()
    window.addEventListener('resize', checkPlatform)
    return () => window.removeEventListener('resize', checkPlatform)
  }, [])

  return { isMac, isMobile }
}
