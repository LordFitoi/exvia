import type { ProfileStep } from '@/types/profile'

/** What the completion card asks the rider to do for each missing step. */
export const STEP_PROMPTS: Record<ProfileStep, string> = {
  avatar: 'Add a profile photo',
  description: 'Write a short bio',
  blood_type: 'Add your blood type',
  emergency_contact: 'Add an emergency contact',
  vehicle: 'Add a vehicle to your garage',
}
