import { useEffect, useState } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mq = matchMedia("(max-width: 768px)")
    const onChange = () => {
      setIsMobile(mq.matches)
    }
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
