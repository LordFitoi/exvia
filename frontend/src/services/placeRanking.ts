import { isWordFound, tokenize } from '@/services/placeText'
import type { PlaceResult } from '@/types/place'

// How well a place answers the text typed, best first. Within a tier the nearest place goes first.
const TIER_NAME_STARTS = 5
const TIER_NAME = 4
const TIER_NAME_AND_ADDRESS = 3
const TIER_PARTIAL = 2
const TIER_NONE = 1
// A place that answers at least this share of the words typed is still worth listing.
const MIN_PARTIAL_SHARE = 0.5

const countFound = (typedWords: readonly string[], placeWords: readonly string[]): number =>
  typedWords.filter((word) => isWordFound(word, placeWords)).length

/** Whether the name begins with the words typed, in order: "sigma" for "Sigma Canastica", not for "Farmacia Sigma". */
const isStartOfName = (typedWords: readonly string[], nameWords: readonly string[]): boolean =>
  typedWords.every((word, position) => position < nameWords.length && isWordFound(word, [nameWords[position]]))

/** The name alone answering the text is better than the name and the address together, which beats a part of it. */
const rateTier = (typedWords: readonly string[], { title, address }: PlaceResult): number => {
  const nameWords = tokenize(title)
  if (countFound(typedWords, nameWords) === typedWords.length) {
    return isStartOfName(typedWords, nameWords) ? TIER_NAME_STARTS : TIER_NAME
  }
  const foundInPlace = countFound(typedWords, [...nameWords, ...tokenize(address)])
  if (foundInPlace === typedWords.length) return TIER_NAME_AND_ADDRESS
  return foundInPlace / typedWords.length >= MIN_PARTIAL_SHARE ? TIER_PARTIAL : TIER_NONE
}

const byDistance = (a: PlaceResult, b: PlaceResult): number => a.distanceMeters - b.distanceMeters

/**
 * The places ordered by how well they answer `text`, then by distance. Nothing is dropped: the
 * services found these places for the text with more than their names and addresses (other names,
 * other languages), so a place that does not read like the text is only listed last.
 */
export const rankPlaces = (text: string, places: readonly PlaceResult[]): PlaceResult[] => {
  const typedWords = tokenize(text)
  if (typedWords.length === 0) return [...places].sort(byDistance)
  return places
    .map((place) => ({ place, tier: rateTier(typedWords, place) }))
    .sort((a, b) => b.tier - a.tier || byDistance(a.place, b.place))
    .map(({ place }) => place)
}

/** The places whose name and address answer at least half of `text`: for places nobody searched for by it. */
export const keepMatching = (text: string, places: readonly PlaceResult[]): PlaceResult[] => {
  const typedWords = tokenize(text)
  return places.filter((place) => rateTier(typedWords, place) >= TIER_PARTIAL)
}

/** Whether a place has every word of `text` in its name or address. */
export const hasFullMatch = (text: string, places: readonly PlaceResult[]): boolean => {
  const typedWords = tokenize(text)
  return places.some((place) => rateTier(typedWords, place) >= TIER_NAME_AND_ADDRESS)
}
