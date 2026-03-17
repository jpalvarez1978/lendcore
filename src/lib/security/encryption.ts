/**
 * Encryption Service - Encriptación de Datos Sensibles
 *
 * Utiliza AES-256-GCM para encriptación simétrica
 *
 * IMPORTANTE: La clave maestra debe estar en .env como ENCRYPTION_KEY
 * Generar clave: openssl rand -base64 32
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // Para AES, esto siempre es 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

/**
 * Obtener clave de encriptación desde variables de entorno
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY no está definida en .env. Genera una con: openssl rand -base64 32'
    )
  }

  return Buffer.from(key, 'base64')
}

/**
 * Encriptar texto
 */
export function encrypt(text: string): string {
  try {
    if (!text) return text

    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)

    // Derivar clave con PBKDF2
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512')

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv)

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    // Formato: salt + iv + tag + encrypted
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64')
  } catch (error) {
    console.error('Error encrypting data:', error)
    throw new Error('Error al encriptar datos')
  }
}

/**
 * Desencriptar texto
 */
export function decrypt(encryptedData: string): string {
  try {
    if (!encryptedData) return encryptedData

    const key = getEncryptionKey()
    const buffer = Buffer.from(encryptedData, 'base64')

    // Extraer componentes
    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION)
    const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION)
    const encrypted = buffer.subarray(ENCRYPTED_POSITION)

    // Derivar clave
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512')

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv)
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Error decrypting data:', error)
    throw new Error('Error al desencriptar datos')
  }
}

/**
 * Desencriptar texto de forma segura (no lanza error si falla)
 */
export function decryptSafe(encryptedData: string | null | undefined): string {
  try {
    if (!encryptedData) return ''

    // Si no parece estar encriptado (muy corto o no es base64), devolverlo tal cual
    if (encryptedData.length < 100) {
      return encryptedData
    }

    return decrypt(encryptedData)
  } catch (error) {
    console.warn('Could not decrypt data, returning original value:', error)
    // Si falla la desencriptación, devolver el valor original (puede ser texto plano)
    // En este punto encryptedData es siempre string porque ya pasó la validación inicial
    return encryptedData ?? ''
  }
}

/**
 * Encriptar solo si el valor no está ya encriptado
 */
export function encryptIfNeeded(value: string | null | undefined): string | null {
  if (!value) return null

  // Verificar si ya está encriptado (formato base64 de longitud específica)
  try {
    if (value.length > 100 && isBase64(value)) {
      // Intentar desencriptar, si funciona, ya está encriptado
      decrypt(value)
      return value
    }
  } catch {
    // No está encriptado o es inválido
  }

  return encrypt(value)
}

/**
 * Verificar si una string es base64
 */
function isBase64(str: string): boolean {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str
  } catch {
    return false
  }
}

/**
 * Hash one-way para comparaciones (passwords, tokens)
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

/**
 * Comparar hash
 */
export function compareHash(text: string, hashedText: string): boolean {
  return hash(text) === hashedText
}

/**
 * Generar token aleatorio seguro
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

// ============================================
// HELPERS ESPECÍFICOS PARA DATOS SENSIBLES
// ============================================

/**
 * Encriptar DNI/NIE/CIF
 */
export function encryptDNI(dni: string | null): string | null {
  return dni ? encrypt(dni.toUpperCase().trim()) : null
}

/**
 * Desencriptar DNI/NIE/CIF
 */
export function decryptDNI(encryptedDNI: string | null): string | null {
  return decryptSafe(encryptedDNI)
}

/**
 * Encriptar teléfono
 */
export function encryptPhone(phone: string | null): string | null {
  return phone ? encrypt(phone.replace(/\s/g, '')) : null
}

/**
 * Desencriptar teléfono
 */
export function decryptPhone(encryptedPhone: string | null): string | null {
  return decryptSafe(encryptedPhone)
}

/**
 * Encriptar IBAN
 */
export function encryptIBAN(iban: string | null): string | null {
  return iban ? encrypt(iban.replace(/\s/g, '').toUpperCase()) : null
}

/**
 * Desencriptar IBAN
 */
export function decryptIBAN(encryptedIBAN: string | null): string | null {
  return decryptSafe(encryptedIBAN)
}

/**
 * Encriptar dirección
 */
export function encryptAddress(address: string | null): string | null {
  return address ? encrypt(address.trim()) : null
}

/**
 * Desencriptar dirección
 */
export function decryptAddress(encryptedAddress: string | null): string | null {
  return decryptSafe(encryptedAddress)
}

/**
 * Máscara para mostrar datos parcialmente (4 últimos dígitos)
 */
export function maskData(data: string, visibleChars = 4): string {
  if (!data || data.length <= visibleChars) return data
  const masked = '*'.repeat(data.length - visibleChars)
  return masked + data.slice(-visibleChars)
}

/**
 * Máscara para DNI: 12345678A → *****678A
 */
export function maskDNI(dni: string | null): string {
  if (!dni) return ''
  return maskData(dni, 4)
}

/**
 * Máscara para teléfono: 612345678 → *****5678
 */
export function maskPhone(phone: string | null): string {
  if (!phone) return ''
  return maskData(phone, 4)
}

/**
 * Máscara para IBAN: ES7921000813610123456789 → ES79***************6789
 */
export function maskIBAN(iban: string | null): string {
  if (!iban) return ''
  if (iban.length < 8) return iban

  const countryCode = iban.substring(0, 4)
  const lastFour = iban.slice(-4)
  const masked = '*'.repeat(iban.length - 8)

  return countryCode + masked + lastFour
}

/**
 * Máscara para email: juan.perez@example.com → j***@example.com
 */
export function maskEmail(email: string | null): string {
  if (!email) return ''

  const [localPart, domain] = email.split('@')
  if (!domain) return email

  const maskedLocal = localPart.charAt(0) + '***'
  return `${maskedLocal}@${domain}`
}
