import { isFillerWord, isWordFound, normalizeText, tokenize } from '@/services/placeText'
import type { CategoryResult } from '@/types/place'

const MIN_KEYWORD_LENGTH = 3
// Said next to a kind of place, they only ask for the ones close by: "gasolinera cerca de mi".
const NEARBY_WORDS: ReadonlySet<string> = new Set(['near', 'nearby', 'nearest', 'closest', 'me', 'cerca', 'cercana', 'cercano', 'mi'])

export interface PlaceCategory {
  /** The OpenStreetMap tag of the kind, such as `amenity:fuel`. */
  readonly osmTag: string
  readonly title: string
  /** What a place of this kind is called when OpenStreetMap has not named it. Set only for the kinds
   * where unnamed places are common and worth listing. */
  readonly unnamedTitle?: string
  /** What the rider may type for it, in English and Spanish, without accents. */
  readonly keywords: readonly string[]
}

export interface CategoryQuery {
  readonly category: PlaceCategory
  /** The rest of the text once the kind and the words that only ask for what is close are taken out. */
  readonly rest: string
}

const PLACE_CATEGORIES: readonly PlaceCategory[] = [
  {
    osmTag: 'amenity:fuel',
    title: 'Gas stations',
    unnamedTitle: 'Gas station',
    keywords: ['gas station', 'gas stations', 'gasolinera', 'gasolineras', 'gasolina', 'gasoline', 'petrol', 'fuel', 'combustible', 'estacion de servicio', 'bomba de gasolina'],
  },
  { osmTag: 'amenity:restaurant', title: 'Restaurants', keywords: ['restaurant', 'restaurants', 'restaurante', 'restaurantes'] },
  { osmTag: 'amenity:cafe', title: 'Cafés', keywords: ['cafe', 'cafes', 'coffee', 'cafeteria', 'cafeterias'] },
  { osmTag: 'shop:mall', title: 'Shopping malls', keywords: ['mall', 'malls', 'shopping mall', 'centro comercial', 'centros comerciales', 'plaza comercial'] },
  { osmTag: 'shop:supermarket', title: 'Supermarkets', keywords: ['supermarket', 'supermarkets', 'supermercado', 'supermercados', 'grocery'] },
  { osmTag: 'amenity:pharmacy', title: 'Pharmacies', keywords: ['pharmacy', 'pharmacies', 'farmacia', 'farmacias', 'drugstore'] },
  { osmTag: 'amenity:hospital', title: 'Hospitals', keywords: ['hospital', 'hospitals', 'hospitales', 'clinic', 'clinica', 'clinicas', 'emergency', 'emergencia'] },
  { osmTag: 'amenity:atm', title: 'ATMs', keywords: ['atm', 'atms', 'cajero', 'cajeros', 'cajero automatico', 'cajeros automaticos'] },
  { osmTag: 'shop:car_repair', title: 'Repair shops', keywords: ['mechanic', 'repair shop', 'taller', 'talleres', 'mecanico', 'mecanica'] },
  { osmTag: 'tourism:hotel', title: 'Hotels', keywords: ['hotel', 'hotels'] },
]

const toCategoryResult = ({ osmTag, title }: PlaceCategory): CategoryResult => ({ kind: 'category', id: osmTag, title })

/** Every kind of place, to pick from when nothing is typed yet. */
export const listCategories = (): CategoryResult[] => PLACE_CATEGORIES.map(toCategoryResult)

/** The category of an OpenStreetMap tag. */
export const findCategoryByTag = (osmTag: string): PlaceCategory | undefined =>
  PLACE_CATEGORIES.find((category) => category.osmTag === osmTag)

/** The kinds that have unnamed places worth listing. */
export const listUnnamedCategories = (): PlaceCategory[] =>
  PLACE_CATEGORIES.filter((category) => category.unnamedTitle !== undefined)

/** The kinds of place that the text typed starts to name, even misspelled, such as "gaso" or "gasolinra". */
export const findCategories = (query: string): CategoryResult[] => {
  const typed = normalizeText(query)
  if (typed.length < MIN_KEYWORD_LENGTH) return []
  return PLACE_CATEGORIES.filter(({ keywords }) => keywords.some((keyword) => isWordFound(typed, [keyword]))).map(
    toCategoryResult,
  )
}

/** Where the words of `keyword` are, in order, among `words`; -1 when they are not. */
const findKeywordStart = (words: readonly string[], keyword: string): number => {
  const keywordWords = keyword.split(' ')
  return words.findIndex((_, start) => keywordWords.every((word, offset) => words[start + offset] === word))
}

/** What is left of the words once the keyword, the words that only ask for what is near and the filler words are out. */
const takeOutKeyword = (words: readonly string[], keyword: string, start: number): string => {
  const others = [...words.slice(0, start), ...words.slice(start + keyword.split(' ').length)]
  const rest = tokenize(others.join(' ')).filter((word) => !NEARBY_WORDS.has(word))
  return rest.every(isFillerWord) ? '' : rest.join(' ')
}

/** A text that names a kind of place whole, such as "gasolinera sigma": the kind and what else is asked of it. */
export const splitCategoryQuery = (query: string): CategoryQuery | null => {
  const words = normalizeText(query).split(' ').filter(Boolean)
  for (const category of PLACE_CATEGORIES) {
    const keyword = category.keywords.find((candidate) => findKeywordStart(words, candidate) >= 0)
    if (keyword) return { category, rest: takeOutKeyword(words, keyword, findKeywordStart(words, keyword)) }
  }
  return null
}
