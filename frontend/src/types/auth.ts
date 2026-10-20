export interface User {
  readonly id: number
  readonly username: string
  readonly email: string
  readonly is_staff: boolean
}

export interface TokenPair {
  readonly access: string
  readonly refresh: string
}

export interface LoginCredentials {
  readonly username: string
  readonly password: string
}

export interface SignupInput extends LoginCredentials {
  readonly email: string
}

export type FieldErrors = Readonly<Record<string, string>>
