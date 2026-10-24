/** The steps that make up profile completion, in the order the profile asks for them. */
export const PROFILE_STEPS = ['avatar', 'description', 'blood_type', 'emergency_contact', 'vehicle'] as const

export type ProfileStep = (typeof PROFILE_STEPS)[number]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export interface ProfileCompletion {
  /** Whole number, 0 to 100. */
  readonly percentage: number
  /** The steps still to do. */
  readonly missing: readonly ProfileStep[]
}

export interface EmergencyContact {
  readonly id: number
  readonly name: string
  readonly phone_number: string
  readonly relationship: string
}

/** A vehicle as other riders see it: the plate is private, so it is only there for the owner. */
export interface SharedVehicle {
  readonly id: number
  readonly brand: string
  readonly model: string
  readonly year: number | null
  readonly color: string
  readonly license_plate?: string
}

export interface Vehicle extends SharedVehicle {
  readonly license_plate: string
}

/** What any signed-in rider sees of another rider: no blood type, contacts or plates. */
export interface SharedProfile {
  readonly username: string
  /** Path of the photo, or null when there is none. */
  readonly avatar: string | null
  readonly description: string
  readonly vehicles: readonly SharedVehicle[]
}

export interface Profile {
  /** Path of the photo, or null when there is none. */
  readonly avatar: string | null
  readonly description: string
  /** One of the types in `BLOOD_TYPES`, or empty when not given. */
  readonly blood_type: string
  readonly emergency_contacts: readonly EmergencyContact[]
  readonly vehicles: readonly Vehicle[]
  readonly completion: ProfileCompletion
}

export interface ProfileChanges {
  readonly description: string
  readonly blood_type: string
}

export type NewContact = Omit<EmergencyContact, 'id'>

export type NewVehicle = Omit<Vehicle, 'id'>
