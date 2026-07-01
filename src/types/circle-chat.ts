/**
 * Shared types for the enhanced Circle Chat.
 *
 * A single `CircleChatMessage` shape powers every kind of message via the
 * `type` discriminator. New kinds (voice, video, call, ai_summary) can be added
 * to `MessageType` and given an optional payload field without touching the
 * existing render path — bubbles fall back to text/unsupported gracefully.
 */

// ── Message kinds ─────────────────────────────────────────────────────────────

export type MessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'location'
  | 'poll'
  | 'announcement'
  | 'system'
  // Reserved for future phases (schema already tolerant):
  | 'voice'
  | 'video'

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏'] as const
export type QuickReaction = (typeof QUICK_REACTIONS)[number]

// ── Attachment payloads ───────────────────────────────────────────────────────

/** Image or document stored on Cloudinary. */
export interface ChatAttachment {
  kind: 'image' | 'document'
  url: string
  publicId: string
  name: string
  mimeType: string
  size: number            // bytes
  width?: number          // images
  height?: number         // images
  thumbnailUrl?: string   // images / previewable docs
  /** Reserved for future media kinds. */
  durationSec?: number    // voice / video
}

/** A shared location, rendered as a tappable map card → Google Maps. */
export interface ChatLocation {
  lat: number
  lng: number
  label?: string          // e.g. "Live location" or a place name
  address?: string
  /** 'live' = current GPS, 'pin' = a point chosen on the map. */
  source: 'live' | 'pin'
}

// ── Polls ─────────────────────────────────────────────────────────────────────

export interface PollOption {
  id: string
  text: string
}

export interface ChatPoll {
  id: string
  question: string
  options: PollOption[]
  allowMultiple: boolean
  closesAt: string | null
  /** option id → vote count */
  tallies: Record<string, number>
  totalVotes: number
  /** option ids the current user has voted for */
  myVotes: string[]
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export interface ReactionGroup {
  emoji: string
  count: number
  /** whether the current user is part of this reaction group */
  mine: boolean
}

// ── Reply preview ─────────────────────────────────────────────────────────────

export interface ReplyPreview {
  id: string
  authorName: string
  /** short text or a label like "📷 Photo" / "📍 Location" for non-text */
  excerpt: string
}

// ── The unified message ───────────────────────────────────────────────────────

export interface CircleChatMessage {
  id: string
  circleId: string
  type: MessageType
  content: string | null

  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  authorRole: 'principal' | 'steward' | 'member'

  createdAt: string
  isMine: boolean

  // Optional, type-specific payloads
  attachment?: ChatAttachment | null
  location?: ChatLocation | null
  poll?: ChatPoll | null

  // Threading
  replyTo?: ReplyPreview | null

  // Moderation / highlighting
  isPinned: boolean
  isAnnouncement: boolean

  // Social
  reactions: ReactionGroup[]

  /** true for optimistic messages that haven't been confirmed by the server */
  pending?: boolean
}

// ── Composer state (what the input bar is about to send) ──────────────────────

export interface PendingReply {
  id: string
  authorName: string
  excerpt: string
}

// ── Roster (reused from the existing chat) ────────────────────────────────────

export interface CircleRosterMember {
  id: string
  displayName: string
  avatarUrl: string | null
  role: 'principal' | 'steward' | 'member'
  isActive: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function roleLabel(role: string): string {
  if (role === 'principal') return 'Principal'
  if (role === 'steward') return 'Steward'
  return 'Member'
}

/** Short label used in reply previews / search results for non-text messages. */
export function messageExcerpt(msg: Pick<CircleChatMessage, 'type' | 'content' | 'attachment'>): string {
  if (msg.content && msg.content.trim()) return msg.content.trim()
  switch (msg.type) {
    case 'image':        return '📷 Photo'
    case 'document':     return `📄 ${msg.attachment?.name ?? 'Document'}`
    case 'location':     return '📍 Location'
    case 'poll':         return '📊 Poll'
    case 'announcement': return '📢 Announcement'
    case 'voice':        return '🎤 Voice message'
    case 'video':        return '🎬 Video'
    default:             return 'Message'
  }
}

export function googleMapsUrl(loc: Pick<ChatLocation, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`
}
