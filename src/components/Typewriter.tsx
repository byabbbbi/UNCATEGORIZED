import { useEffect, useState } from 'react'

interface Props {
  text: string
  msPerChar?: number
  className?: string
  onDone?: () => void
}

export function Typewriter({ text, msPerChar = 30, className, onDone }: Props) {
  const [n, setN] = useState(0)

  useEffect(() => {
    setN(0)
    if (!text) return
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setN(i)
      if (i >= text.length) {
        window.clearInterval(id)
        onDone?.()
      }
    }, msPerChar)
    return () => window.clearInterval(id)
  }, [text, msPerChar, onDone])

  return <span className={className}>{text.slice(0, n)}</span>
}
