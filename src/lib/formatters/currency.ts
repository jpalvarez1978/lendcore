/**
 * Formatea un número como moneda EUR con formato español
 * Ejemplo: 1234.56 -> "1.234,56 €"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0,00 €'

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) return '0,00 €'

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/**
 * Formatea un número con separadores españoles sin símbolo de moneda
 * Ejemplo: 1234.56 -> "1.234,56"
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0,00'

  const numericValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numericValue)) return '0,00'

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)
}

/**
 * Formatea un porcentaje
 * Ejemplo: 0.035 -> "3,5%"
 */
export function formatPercentage(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0%'

  const numericValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numericValue)) return '0%'

  // Si el valor está entre 0 y 1, asumimos que es decimal (ej: 0.035 = 3.5%)
  // Si es mayor a 1, asumimos que ya está en porcentaje (ej: 3.5 = 3.5%)
  const percentageValue = numericValue < 1 ? numericValue * 100 : numericValue

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percentageValue) + '%'
}

/**
 * Parsear string con formato europeo a número
 * Ejemplo: "1.234,56" -> 1234.56
 */
export function parseEuropeanNumber(value: string): number {
  if (!value) return 0

  // Eliminar espacios y símbolo de euro
  let normalized = value.replace(/\s/g, '').replace(/€/g, '')

  // Eliminar separadores de miles (.)
  normalized = normalized.replace(/\./g, '')

  // Reemplazar coma decimal por punto
  normalized = normalized.replace(',', '.')

  return parseFloat(normalized) || 0
}

/**
 * Formatear moneda compacta para gráficos
 * Ejemplo: 1.234.567 € -> 1,2M €
 */
export function formatCurrencyCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 €'

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numericAmount)) return '0 €'

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(numericAmount)
}
