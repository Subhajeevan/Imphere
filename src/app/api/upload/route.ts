import { createClient } from '@/lib/supabase/server'
import { generateUploadSignature, UploadPresetType } from '@/lib/cloudinary'
import { NextResponse } from 'next/server'

/**
 * POST /api/upload
 * Generate a signed upload URL for client-side Cloudinary uploads
 *
 * Body: { preset: UploadPresetType, publicId?: string }
 * Returns: { signature, timestamp, apiKey, cloudName, folder }
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient() as any as any as any
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preset, publicId } = body as {
      preset: UploadPresetType
      publicId?: string
    }

    // Validate preset
    const validPresets: UploadPresetType[] = ['PROFILE', 'CHALLENGE', 'POST', 'CIRCLE']
    if (!preset || !validPresets.includes(preset)) {
      return NextResponse.json(
        { error: 'Invalid upload preset' },
        { status: 400 }
      )
    }

    // Generate signed upload credentials
    const uploadParams = generateUploadSignature(preset, publicId)

    return NextResponse.json(uploadParams)
  } catch (error) {
    console.error('Upload signature error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 }
    )
  }
}
