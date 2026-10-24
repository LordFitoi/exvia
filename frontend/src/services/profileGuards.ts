import { isRecord } from '@/services/typeGuards'
import { PROFILE_STEPS } from '@/types/profile'
import type {
  EmergencyContact,
  Profile,
  ProfileCompletion,
  ProfileStep,
  SharedProfile,
  SharedVehicle,
  Vehicle,
} from '@/types/profile'

const isProfileStep = (value: unknown): value is ProfileStep => PROFILE_STEPS.some((step) => step === value)

const isCompletion = (value: unknown): value is ProfileCompletion =>
  isRecord(value) &&
  typeof value.percentage === 'number' &&
  Array.isArray(value.missing) &&
  value.missing.every(isProfileStep)

export const isEmergencyContact = (value: unknown): value is EmergencyContact =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.phone_number === 'string' &&
  typeof value.relationship === 'string'

const isSharedVehicle = (value: unknown): value is SharedVehicle =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.brand === 'string' &&
  typeof value.model === 'string' &&
  (value.year === null || typeof value.year === 'number') &&
  typeof value.color === 'string'

export const isVehicle = (value: unknown): value is Vehicle =>
  isSharedVehicle(value) && 'license_plate' in value && typeof value.license_plate === 'string'

export const isSharedProfile = (value: unknown): value is SharedProfile =>
  isRecord(value) &&
  typeof value.username === 'string' &&
  (value.avatar === null || typeof value.avatar === 'string') &&
  typeof value.description === 'string' &&
  Array.isArray(value.vehicles) &&
  value.vehicles.every(isSharedVehicle)

export const isProfile = (value: unknown): value is Profile =>
  isRecord(value) &&
  (value.avatar === null || typeof value.avatar === 'string') &&
  typeof value.description === 'string' &&
  typeof value.blood_type === 'string' &&
  Array.isArray(value.emergency_contacts) &&
  value.emergency_contacts.every(isEmergencyContact) &&
  Array.isArray(value.vehicles) &&
  value.vehicles.every(isVehicle) &&
  isCompletion(value.completion)
