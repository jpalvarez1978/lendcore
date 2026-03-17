import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  parseEuropeanNumber,
  formatCurrencyCompact,
} from '@/lib/formatters/currency'

describe('formatCurrency', () => {
  it('should format number to EUR currency', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1234')
    expect(result).toContain('56')
    expect(result).toContain('€')
  })

  it('should handle string input', () => {
    const result = formatCurrency('1234.56')
    expect(result).toContain('1234')
    expect(result).toContain('€')
  })

  it('should return default for null', () => {
    const result = formatCurrency(null)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('should return default for undefined', () => {
    const result = formatCurrency(undefined)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('should return default for invalid string', () => {
    const result = formatCurrency('invalid')
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('should handle negative numbers', () => {
    const result = formatCurrency(-1234.56)
    expect(result).toMatch(/-?1234/)
    expect(result).toContain('€')
  })
})

describe('formatNumber', () => {
  it('should format number', () => {
    const result = formatNumber(1234.56)
    expect(result).toContain('1234')
    expect(result).toContain('56')
  })

  it('should handle string input', () => {
    const result = formatNumber('1234.56')
    expect(result).toContain('1234')
  })

  it('should return default for null', () => {
    const result = formatNumber(null)
    expect(result).toContain('0')
  })

  it('should return default for undefined', () => {
    const result = formatNumber(undefined)
    expect(result).toContain('0')
  })

  it('should handle zero', () => {
    const result = formatNumber(0)
    expect(result).toContain('0')
  })
})

describe('formatPercentage', () => {
  it('should format decimal as percentage', () => {
    const result = formatPercentage(0.035)
    expect(result).toContain('3')
    expect(result).toContain('%')
  })

  it('should format value already in percentage', () => {
    const result = formatPercentage(3.5)
    expect(result).toContain('3')
    expect(result).toContain('%')
  })

  it('should return 0% for null', () => {
    const result = formatPercentage(null)
    expect(result).toContain('0')
    expect(result).toContain('%')
  })

  it('should return 0% for undefined', () => {
    const result = formatPercentage(undefined)
    expect(result).toContain('0')
    expect(result).toContain('%')
  })

  it('should handle string input', () => {
    const result = formatPercentage('0.05')
    expect(result).toContain('5')
    expect(result).toContain('%')
  })
})

describe('parseEuropeanNumber', () => {
  it('should parse European format to number', () => {
    expect(parseEuropeanNumber('1.234,56')).toBe(1234.56)
  })

  it('should handle currency symbol', () => {
    expect(parseEuropeanNumber('1.234,56 €')).toBe(1234.56)
  })

  it('should handle spaces', () => {
    expect(parseEuropeanNumber(' 1.234,56 ')).toBe(1234.56)
  })

  it('should return 0 for empty string', () => {
    expect(parseEuropeanNumber('')).toBe(0)
  })

  it('should handle simple numbers', () => {
    expect(parseEuropeanNumber('100')).toBe(100)
  })
})

describe('formatCurrencyCompact', () => {
  it('should format small numbers', () => {
    const result = formatCurrencyCompact(1234)
    expect(result).toContain('€')
  })

  it('should format thousands', () => {
    const result = formatCurrencyCompact(10000)
    expect(result).toMatch(/\d+.*€/)
  })

  it('should format millions', () => {
    const result = formatCurrencyCompact(1234567)
    expect(result).toMatch(/\d+.*€|M/)
  })

  it('should return default for null', () => {
    const result = formatCurrencyCompact(null)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })

  it('should return default for undefined', () => {
    const result = formatCurrencyCompact(undefined)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })
})
