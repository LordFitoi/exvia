const INITIALS_LENGTH = 2

/** The first letters of a username, in capitals, for riders without a profile picture. */
export const getInitials = (username: string): string => username.slice(0, INITIALS_LENGTH).toUpperCase()
