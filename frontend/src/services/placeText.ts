// Words that carry no meaning in a place name: "Avenida 27 de Febrero" is found by "av 27 febrero".
const STOP_WORDS: ReadonlySet<string> = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'the', 'of', 'and'])
// Spellings that do not start the word they stand for ("av" and "prol" already start theirs).
const ABBREVIATIONS: Readonly<Record<string, string>> = {
  c: 'calle',
  cll: 'calle',
  avda: 'avenida',
  ctra: 'carretera',
  autop: 'autopista',
  prolong: 'prolongacion',
  sto: 'santo',
  sta: 'santa',
}
const MIN_PREFIX_LENGTH = 2
const MIN_TYPO_LENGTH = 4
const LONG_WORD_LENGTH = 8
const DIGITS_ONLY = /^\d+$/

/** Lower case, without accents or punctuation: "Av. Prolongación 27" is "av prolongacion 27". */
export const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Whether a word carries no meaning in a place name, such as "de". */
export const isFillerWord = (word: string): boolean => STOP_WORDS.has(word)

/** The words of a text that count when places are compared: abbreviations spelled out, filler words left out. */
export const tokenize = (text: string): string[] => {
  const words = normalizeText(text)
    .split(' ')
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
  const meaningful = words.filter((word) => !STOP_WORDS.has(word))
  return meaningful.length > 0 ? meaningful : words
}

/** Typing mistakes a word of this length is allowed: none in short words and in numbers, since "27" is not "26". */
const allowTypos = (word: string): number => {
  if (DIGITS_ONLY.test(word) || word.length < MIN_TYPO_LENGTH) return 0
  return word.length >= LONG_WORD_LENGTH ? 2 : 1
}

/** Edits (insert, delete, replace or swap two letters) that turn one word into the other. */
const countEdits = (from: string, to: string): number => {
  const table = Array.from({ length: from.length + 1 }, (_, row) =>
    Array.from({ length: to.length + 1 }, (_, column) => (row === 0 || column === 0 ? row + column : 0)),
  )
  for (let row = 1; row <= from.length; row += 1) {
    for (let column = 1; column <= to.length; column += 1) {
      const cost = from[row - 1] === to[column - 1] ? 0 : 1
      table[row][column] = Math.min(table[row - 1][column] + 1, table[row][column - 1] + 1, table[row - 1][column - 1] + cost)
      const isSwap = row > 1 && column > 1 && from[row - 1] === to[column - 2] && from[row - 2] === to[column - 1]
      if (isSwap) table[row][column] = Math.min(table[row][column], table[row - 2][column - 2] + 1)
    }
  }
  return table[from.length][to.length]
}

/** Whether the word typed is the start of the other one, or one with a typing mistake in it. */
const isPartialMatch = (typed: string, word: string): boolean => {
  if (typed.length >= MIN_PREFIX_LENGTH && word.startsWith(typed)) return true
  const typos = allowTypos(typed)
  if (typos === 0) return false
  return countEdits(typed, word.slice(0, typed.length)) <= typos || countEdits(typed, word) <= typos
}

/** Whether a word typed is one of the words of a place, or the start of one, or one with a typing mistake in it. */
export const isWordFound = (typed: string, words: readonly string[]): boolean =>
  words.includes(typed) || words.some((word) => isPartialMatch(typed, word))
