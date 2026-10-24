'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'

import { ApiError } from '@/services/apiClient'
import { uploadAvatar } from '@/services/profileApi'

const UPLOAD_FAILED_MESSAGE = 'The photo could not be uploaded. Check your connection and try again.'

export interface AvatarUpload {
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly isUploading: boolean
  readonly error: string | null
  readonly openPicker: () => void
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
}

/** Picks an image with a hidden file input and uploads it as the profile photo. */
export const useAvatarUpload = (onUploaded: () => void): AvatarUpload => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPicker = () => inputRef.current?.click()

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const image = input.files?.[0]
    // Cleared so choosing the same file again after a failure still fires a change.
    input.value = ''
    if (!image) return
    setIsUploading(true)
    setError(null)
    try {
      await uploadAvatar(image)
      onUploaded()
    } catch (failure) {
      console.error('Could not upload the profile photo', failure)
      const isApiError = failure instanceof ApiError
      setError(isApiError ? (failure.fieldErrors.avatar ?? failure.message) : UPLOAD_FAILED_MESSAGE)
    } finally {
      setIsUploading(false)
    }
  }

  return { inputRef, isUploading, error, openPicker, handleChange }
}
