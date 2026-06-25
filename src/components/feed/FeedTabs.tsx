'use client'

import { cn } from '@/lib/utils'

export type FeedTab = 'for-you' | 'believing' | 'challenges'

interface FeedTabsProps {
  activeTab: FeedTab
  onChange: (tab: FeedTab) => void
}

const tabs: { id: FeedTab; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'believing', label: 'Believing' },
  { id: 'challenges', label: 'Challenges' },
]

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
  return (
    <div className="sticky top-0 lg:top-0 z-40 bg-background border-b border-border transition-colors duration-300">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 py-4 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
