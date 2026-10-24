import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isEmergencyContact, isProfile, isSharedProfile, isVehicle } from '@/services/profileGuards'
import type {
  EmergencyContact,
  NewContact,
  NewVehicle,
  Profile,
  ProfileChanges,
  SharedProfile,
  Vehicle,
} from '@/types/profile'

const PROFILE_PATH = '/api/auth/profile/'
const USERS_PATH = '/api/auth/users/'
const CONTACTS_PATH = `${PROFILE_PATH}contacts/`
const VEHICLES_PATH = `${PROFILE_PATH}vehicles/`
const AVATAR_FIELD = 'avatar'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const unexpectedResponse = (): ApiError => new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)

const readProfile = (payload: unknown): Profile => {
  if (!isProfile(payload)) throw unexpectedResponse()
  return payload
}

/** The caller's profile with its contacts, vehicles and completion. */
export const fetchProfile = async (): Promise<Profile> => readProfile(await requestJsonAuthorized(PROFILE_PATH))

/** Changes the description and blood type of the caller's profile. */
export const updateProfile = async (changes: ProfileChanges): Promise<Profile> =>
  readProfile(await requestJsonAuthorized(PROFILE_PATH, { method: 'PATCH', body: changes }))

/** Replaces the caller's profile photo with an image file. */
export const uploadAvatar = async (image: File): Promise<Profile> => {
  const body = new FormData()
  body.append(AVATAR_FIELD, image)
  return readProfile(await requestJsonAuthorized(PROFILE_PATH, { method: 'PATCH', body }))
}

export const createContact = async (contact: NewContact): Promise<EmergencyContact> => {
  const created = await requestJsonAuthorized(CONTACTS_PATH, { method: 'POST', body: contact })
  if (!isEmergencyContact(created)) throw unexpectedResponse()
  return created
}

export const updateContact = async (id: number, contact: NewContact): Promise<EmergencyContact> => {
  const updated = await requestJsonAuthorized(`${CONTACTS_PATH}${id}/`, { method: 'PATCH', body: contact })
  if (!isEmergencyContact(updated)) throw unexpectedResponse()
  return updated
}

export const deleteContact = async (id: number): Promise<void> => {
  await requestJsonAuthorized(`${CONTACTS_PATH}${id}/`, { method: 'DELETE' })
}

export const createVehicle = async (vehicle: NewVehicle): Promise<Vehicle> => {
  const created = await requestJsonAuthorized(VEHICLES_PATH, { method: 'POST', body: vehicle })
  if (!isVehicle(created)) throw unexpectedResponse()
  return created
}

export const updateVehicle = async (id: number, vehicle: NewVehicle): Promise<Vehicle> => {
  const updated = await requestJsonAuthorized(`${VEHICLES_PATH}${id}/`, { method: 'PATCH', body: vehicle })
  if (!isVehicle(updated)) throw unexpectedResponse()
  return updated
}

export const deleteVehicle = async (id: number): Promise<void> => {
  await requestJsonAuthorized(`${VEHICLES_PATH}${id}/`, { method: 'DELETE' })
}

/** What the caller may see of another rider's profile; a 404 `ApiError` when there is no such rider. */
export const fetchSharedProfile = async (username: string): Promise<SharedProfile> => {
  const profile = await requestJsonAuthorized(`${USERS_PATH}${encodeURIComponent(username)}/profile/`)
  if (!isSharedProfile(profile)) throw unexpectedResponse()
  return profile
}
