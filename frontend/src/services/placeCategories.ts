import type { CategoryResult } from '@/types/place'

const MIN_KEYWORD_LENGTH = 3

interface PlaceCategory {
  readonly osmTag: string
  readonly title: string
  /** What the rider may type for it, in English and Spanish, without accents. */
  readonly keywords: readonly string[]
}

const PLACE_CATEGORIES: readonly PlaceCategory[] = [
  {
    osmTag: 'amenity:fuel',
    title: 'Gas stations',
    keywords: ['gas station', 'gas stations', 'gasolinera', 'gasolineras', 'gasoline', 'petrol', 'fuel', 'combustible', 'estacion de servicio'],
  },
  { osmTag: 'amenity:restaurant', title: 'Restaurants', keywords: ['restaurant', 'restaurants', 'restaurante', 'restaurantes'] },
  { osmTag: 'amenity:cafe', title: 'Cafés', keywords: ['cafe', 'cafes', 'coffee', 'cafeteria', 'cafeterias'] },
  { osmTag: 'shop:mall', title: 'Shopping malls', keywords: ['mall', 'malls', 'shopping mall', 'centro comercial', 'centros comerciales', 'plaza comercial'] },
  { osmTag: 'shop:supermarket', title: 'Supermarkets', keywords: ['supermarket', 'supermarkets', 'supermercado', 'supermercados', 'grocery'] },
  { osmTag: 'amenity:pharmacy', title: 'Pharmacies', keywords: ['pharmacy', 'pharmacies', 'farmacia', 'farmacias', 'drugstore'] },
  { osmTag: 'tourism:hotel', title: 'Hotels', keywords: ['hotel', 'hotels'] },
]

const normalize = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** The kinds of place that the text typed starts to name, such as "gaso" for gas stations. */
export const findCategories = (query: string): CategoryResult[] => {
  const typed = normalize(query)
  if (typed.length < MIN_KEYWORD_LENGTH) return []
  return PLACE_CATEGORIES.filter(({ keywords }) => keywords.some((keyword) => keyword.startsWith(typed))).map(
    ({ osmTag, title }) => ({ kind: 'category', id: osmTag, title }),
  )
}
