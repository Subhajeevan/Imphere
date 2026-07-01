import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { uploadChatAttachment } from '@/lib/cloudinary'
import type { ChatAttachment } from '@/types/circle-chat'

// ── Allowed types & limits ────────────────────────────────────────────────────

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
])

const MAX_IMAGE_BYTES = 8  * 1024 * 1024   // 8 MB
const MAX_DOC_BYTES   = 15 * 1024 * 1024   // 15 MB

/**
 * POST /api/circles/[id]/attachments  (multipart/form-data)
 *   file      – the upload (required)
 *   kind      – 'image' | 'document'
 *   caption   – optional text
 *   replyToId – optional message id being replied to
 *
 * Validates membership, file type and size server-side, uploads to Cloudinary,
 * then inserts an image/document message. Realtime delivers it to the circle.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circleId } = await params

    const form    = await request.formData()
    const file    = form.get('file') as File | null
    const kindRaw = String(form.get('kind') ?? '')
    const caption = (form.get('caption') as string | null)?.trim() || null
    const replyToId = (form.get('replyToId') as string | null) || null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const kind: 'image' | 'document' = kindRaw === 'image' ? 'image' : 'document'

    // Type + size validation
    if (kind === 'image') {
      if (!IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Image must be 8 MB or smaller' }, { status: 413 })
      }
    } else {
      if (!DOC_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported document type' }, { status: 415 })
      }
      if (file.size > MAX_DOC_BYTES) {
        return NextResponse.json({ error: 'Document must be 15 MB or smaller' }, { status: 413 })
      }
    }

    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('impact_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })

    // Upload to Cloudinary as a base64 data URI
    const bytes   = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${bytes.toString('base64')}`
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

    const admin = await createAdminClient() as any
    const { data: message, error } = await admin
      .from('circle_messages')
      .insert({
        circle_id:    circleId,
        author_id:    user.id,
        content:      caption,
        message_type: kind,
        reply_to_id:  replyToId,
        attachment,
      })
      .select('id')
      .single()

    if (error || !message) {
      console.error('attachment message insert error:', error)
      return NextResponse.json({ error: 'Failed to send attachment' }, { status: 500 })
    }

    return NextResponse.json({ messageId: message.id, attachment }, { status: 201 })
  } catch (err) {
    console.error('POST /api/circles/[id]/attachments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
