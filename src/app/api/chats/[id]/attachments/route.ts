import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { uploadChatAttachment } from '@/lib/cloudinary'
import type { ChatAttachment } from '@/types/circle-chat'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
])
const MAX_IMAGE_BYTES = 8  * 1024 * 1024
const MAX_DOC_BYTES   = 15 * 1024 * 1024

/**
 * POST /api/chats/[id]/attachments  (multipart/form-data)
 * Upload a photo/document to a DM conversation. Same validation + Cloudinary
 * flow as circle attachments, gated on conversation participation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const form      = await request.formData()
    const file      = form.get('file') as File | null
    const kindRaw   = String(form.get('kind') ?? '')
    const caption   = (form.get('caption') as string | null)?.trim() || null
    const replyToId = (form.get('replyToId') as string | null) || null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const kind: 'image' | 'document' = kindRaw === 'image' ? 'image' : 'document'

    if (kind === 'image') {
      if (!IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
      if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image must be 8 MB or smaller' }, { status: 413 })
    } else {
      if (!DOC_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported document type' }, { status: 415 })
      if (file.size > MAX_DOC_BYTES) return NextResponse.json({ error: 'Document must be 15 MB or smaller' }, { status: 413 })
    }

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient() as any

    const { data: participation } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()
    if (!participation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const bytes    = Buffer.from(await file.arrayBuffer())
    const dataUri  = `data:${file.type};base64,${bytes.toString('base64')}`
    const uploaded = await uploadChatAttachment(dataUri, kind, file.name)

    const attachment: ChatAttachment = {
      kind,
      url:          uploaded.secureUrl,
      publicId:     uploaded.publicId,
      name:         file.name,
      mimeType:     file.type,
      size:         uploaded.bytes ?? file.size,
      width:        uploaded.width,
      height:       uploaded.height,
      thumbnailUrl: uploaded.thumbnailUrl,
    }

    const now = new Date().toISOString()
    const { data: message, error } = await admin
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id:       user.id,
        content:         caption,
        message_type:    kind,
        reply_to_id:     replyToId,
        attachment,
        created_at:      now,
      })
      .select('id, sender_id, content, created_at')
      .single()

    if (error || !message) {
      console.error('DM attachment insert error:', error)
      return NextResponse.json({ error: 'Failed to send attachment' }, { status: 500 })
    }

    await admin
      .from('conversations')
      .update({ last_message: kind === 'image' ? '📷 Photo' : `📄 ${file.name}`, last_message_at: now, last_sender_id: user.id })
      .eq('id', conversationId)
    await admin
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    return NextResponse.json({
      message: {
        id: message.id, senderId: message.sender_id, content: message.content,
        createdAt: message.created_at, isOwn: true, type: kind,
        attachment, location: null, replyTo: null, reactions: [],
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/chats/[id]/attachments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
