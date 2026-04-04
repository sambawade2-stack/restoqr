import { useEffect, useRef, useCallback } from 'react'

const ACTIVITY_EVENTS  = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
const IDLE_THRESHOLD   = 3_000 // inactif après 3s sans interaction

/**
 * Polls a callback every `interval` ms using setInterval (no drift).
 *
 * @param {Function} callback      - async function to call
 * @param {number}   interval      - ms entre les polls (défaut 5s)
 * @param {boolean}  immediate     - exécuter immédiatement au montage
 * @param {boolean}  alwaysRefresh - si true, ignore le filtre d'inactivité (cuisine / serveur)
 */
export function usePolling(callback, interval = 5_000, immediate = true, alwaysRefresh = false) {
  const savedCallback = useRef(callback)
  const lastActivity  = useRef(Date.now())
  const running       = useRef(false)

  useEffect(() => { savedCallback.current = callback }, [callback])

  const tick = useCallback(async () => {
    if (running.current) return // évite les chevauchements
    const idle = alwaysRefresh || (Date.now() - lastActivity.current >= IDLE_THRESHOLD)
    if (!idle) return
    running.current = true
    try { await savedCallback.current() }
    finally { running.current = false }
  }, [alwaysRefresh])

  useEffect(() => {
    const onActivity = () => { lastActivity.current = Date.now() }
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

    if (immediate) tick()
    const id = setInterval(tick, interval)

    return () => {
      clearInterval(id)
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
    }
  }, [tick, interval, immediate])
}
