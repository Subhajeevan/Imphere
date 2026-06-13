'use client'

import { useEffect, useState } from 'react'

export interface CreatedCircle {
  id: string
  name: string
  avatar_url?: string | null
  category: string
  member_count: number
  eminence_score: number
  weeklyRank: number
  isJoined?: boolean
  userRank?: number
  description?: string
}

const STORAGE_KEY = 'imphere-created-circles'

export function useCreatedCircles() {
  const [createdCircles, setCreatedCircles] = useState<CreatedCircle[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCreatedCircles(JSON.parse(stored) as CreatedCircle[])
      }
    } catch {
      setCreatedCircles([])
    } finally {
      setIsLoaded(true)
    }
  }, [])

  return { createdCircles, isLoaded }
}

export function saveCreatedCircle(circle: CreatedCircle) {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const existing = stored ? (JSON.parse(stored) as CreatedCircle[]) : []
    const updated = [circle, ...existing.filter((item) => item.id !== circle.id)]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore failures in mock mode
  }
}
