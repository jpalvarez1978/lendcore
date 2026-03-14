export function normalizeSearchText(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearchTerm(
  query: string,
  values: Array<string | number | null | undefined>
) {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return true
  }

  return values.some(value => normalizeSearchText(value).includes(normalizedQuery))
}
