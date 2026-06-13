'use client'

import { useEffect, useState, useCallback } from 'react'
import { mockImpactCircleChats } from '@/lib/mock-data'

export interface ChatMessage {
  id: string
  author: string
  authorRank: string
  content: string
  timestamp: string
  isMine?: boolean
}

export interface RosterMember {
  id: string
  displayName: string
  rank: string
  isActive: boolean
}

const defaultCircleId = 'green'

function getCircleChat(circleId?: string) {
  return mockImpactCircleChats[circleId ?? defaultCircleId] ?? mockImpactCircleChats[defaultCircleId]
}

export function useCircleChat(circleId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getCircleChat(circleId).messages)
  const [roster, setRoster] = useState<RosterMember[]>(() => getCircleChat(circleId).roster)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const circleChat = getCircleChat(circleId)
    setMessages(circleChat.messages)
    setRoster(circleChat.roster)
    setIsLoading(true)

    const timer = window.setTimeout(() => {
      setIsLoading(false)
    }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [circleId])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return

    setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}`,
        author: 'You',
        authorRank: 'Principal',
        content: content.trim(),
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMine: true,
      },
    ])
  }, [])

  return {
    roster,
    messages,
    isLoading,
    sendMessage,
  }
}
