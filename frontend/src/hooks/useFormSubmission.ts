'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import { ApiError } from '@/services/apiClient'
import type { FieldErrors } from '@/types/auth'

const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong. Please try again.'

type FormValues = Readonly<Record<string, string>>

interface FormSubmission {
  readonly isPending: boolean
  readonly fieldErrors: FieldErrors
  readonly formError: string | null
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

const readValues = (form: HTMLFormElement): FormValues => {
  const entries = Array.from(new FormData(form).entries())
  return Object.fromEntries(
    entries.flatMap(([name, value]) => (typeof value === 'string' ? [[name, value]] : [])),
  )
}

/** Runs `submit` with the form values and maps API errors to per-field and form-level messages. */
export const useFormSubmission = (
  submit: (values: FormValues) => Promise<void>,
  fieldNames: readonly string[],
): FormSubmission => {
  const [isPending, setIsPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const showError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      console.error('Form submission failed', error)
      setFormError(UNEXPECTED_ERROR_MESSAGE)
      return
    }
    const ownFieldErrors = Object.fromEntries(
      Object.entries(error.fieldErrors).filter(([field]) => fieldNames.includes(field)),
    )
    setFieldErrors(ownFieldErrors)
    setFormError(Object.keys(ownFieldErrors).length > 0 ? null : error.message)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)
    setFieldErrors({})
    setFormError(null)
    try {
      await submit(readValues(event.currentTarget))
    } catch (error) {
      showError(error)
    } finally {
      setIsPending(false)
    }
  }

  return { isPending, fieldErrors, formError, handleSubmit }
}
