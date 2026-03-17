import {
  encrypt,
  decrypt,
  decryptSafe,
  hash,
  compareHash,
  generateSecureToken,
  maskData,
  maskDNI,
  maskPhone,
  maskIBAN,
  maskEmail,
} from '@/lib/security/encryption'

describe('Encryption Service', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'Hello, World!'
      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)

      expect(encrypted).not.toBe(originalText)
      expect(decrypted).toBe(originalText)
    })

    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('')
      expect(decrypt('')).toBe('')
    })

    it('should handle special characters', () => {
      const specialText = '¡Hola! ñ @#$%^&*()'
      const encrypted = encrypt(specialText)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(specialText)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const text = 'test'
      const encrypted1 = encrypt(text)
      const encrypted2 = encrypt(text)

      // Due to random IV and salt, each encryption should be different
      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('decryptSafe', () => {
    it('should decrypt valid encrypted text', () => {
      const original = 'test data'
      const encrypted = encrypt(original)

      expect(decryptSafe(encrypted)).toBe(original)
    })

    it('should return empty string for null', () => {
      expect(decryptSafe(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(decryptSafe(undefined)).toBe('')
    })

    it('should return original value for short strings', () => {
      expect(decryptSafe('short')).toBe('short')
    })
  })

  describe('hash and compareHash', () => {
    it('should create consistent hash', () => {
      const text = 'password123'
      const hash1 = hash(text)
      const hash2 = hash(text)

      expect(hash1).toBe(hash2)
    })

    it('should compare hash correctly', () => {
      const text = 'password123'
      const hashedText = hash(text)

      expect(compareHash(text, hashedText)).toBe(true)
      expect(compareHash('wrong', hashedText)).toBe(false)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate token of default length', () => {
      const token = generateSecureToken()
      // 32 bytes = 64 hex characters
      expect(token.length).toBe(64)
    })

    it('should generate token of custom length', () => {
      const token = generateSecureToken(16)
      // 16 bytes = 32 hex characters
      expect(token.length).toBe(32)
    })

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()

      expect(token1).not.toBe(token2)
    })
  })
})

describe('Mask Functions', () => {
  describe('maskData', () => {
    it('should mask data showing last 4 characters', () => {
      expect(maskData('12345678', 4)).toBe('****5678')
    })

    it('should return original for short strings', () => {
      expect(maskData('abc', 4)).toBe('abc')
    })

    it('should handle empty string', () => {
      expect(maskData('', 4)).toBe('')
    })
  })

  describe('maskDNI', () => {
    it('should mask DNI correctly', () => {
      expect(maskDNI('12345678Z')).toBe('*****678Z')
    })

    it('should return empty string for null', () => {
      expect(maskDNI(null)).toBe('')
    })
  })

  describe('maskPhone', () => {
    it('should mask phone correctly', () => {
      expect(maskPhone('612345678')).toBe('*****5678')
    })

    it('should return empty string for null', () => {
      expect(maskPhone(null)).toBe('')
    })
  })

  describe('maskIBAN', () => {
    it('should mask IBAN correctly', () => {
      expect(maskIBAN('ES7921000813610123456789')).toBe('ES79****************6789')
    })

    it('should return empty string for null', () => {
      expect(maskIBAN(null)).toBe('')
    })

    it('should return original for short IBAN', () => {
      expect(maskIBAN('ES7921')).toBe('ES7921')
    })
  })

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      expect(maskEmail('juan.perez@example.com')).toBe('j***@example.com')
    })

    it('should return empty string for null', () => {
      expect(maskEmail(null)).toBe('')
    })

    it('should handle email without @', () => {
      expect(maskEmail('invalid')).toBe('invalid')
    })
  })
})
