import { useEffect, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 5200)
    return () => window.clearTimeout(timer)
  }, [toast])

  return { toast, setToast }
}
