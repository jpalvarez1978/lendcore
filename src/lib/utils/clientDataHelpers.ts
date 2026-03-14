/**
 * Helpers para manejar datos encriptados de clientes
 */

import { decryptSafe, maskData } from '@/lib/security/encryption'
import type { Client, IndividualProfile, BusinessProfile } from '@prisma/client'

/**
 * Desencriptar datos de un cliente completo
 */
export function decryptClientData(
  client: Client & {
    individualProfile?: IndividualProfile | null
    businessProfile?: BusinessProfile | null
  }
) {
  return {
    ...client,
    email: client.email ? decryptSafe(client.email) : null,
    phone: decryptSafe(client.phone),
    address: client.address ? decryptSafe(client.address) : null,
    individualProfile: client.individualProfile
      ? {
          ...client.individualProfile,
          taxId: decryptSafe(client.individualProfile.taxId),
          reference1Phone: client.individualProfile.reference1Phone
            ? decryptSafe(client.individualProfile.reference1Phone)
            : null,
          reference2Phone: client.individualProfile.reference2Phone
            ? decryptSafe(client.individualProfile.reference2Phone)
            : null,
        }
      : null,
    businessProfile: client.businessProfile
      ? {
          ...client.businessProfile,
          taxId: decryptSafe(client.businessProfile.taxId),
          legalRepTaxId: decryptSafe(client.businessProfile.legalRepTaxId),
        }
      : null,
  }
}

/**
 * Obtener datos enmascarados de un cliente para mostrar en listas
 */
export function getMaskedClientData(
  client: Client & {
    individualProfile?: IndividualProfile | null
    businessProfile?: BusinessProfile | null
  }
) {
  // Desencriptar primero
  const decrypted = decryptClientData(client)

  return {
    ...client,
    email: decrypted.email ? maskData(decrypted.email, 5) : null, // j***@example.com
    phone: maskData(decrypted.phone || '', 4), // *****5678
    address: decrypted.address ? maskData(decrypted.address, 10) : null,
    individualProfile: decrypted.individualProfile
      ? {
          ...decrypted.individualProfile,
          taxId: maskData(decrypted.individualProfile.taxId || '', 4), // *****678A
          reference1Phone: decrypted.individualProfile.reference1Phone
            ? maskData(decrypted.individualProfile.reference1Phone, 4)
            : null,
          reference2Phone: decrypted.individualProfile.reference2Phone
            ? maskData(decrypted.individualProfile.reference2Phone, 4)
            : null,
        }
      : null,
    businessProfile: decrypted.businessProfile
      ? {
          ...decrypted.businessProfile,
          taxId: maskData(decrypted.businessProfile.taxId || '', 4), // *****6789
          legalRepTaxId: maskData(decrypted.businessProfile.legalRepTaxId || '', 4),
        }
      : null,
  }
}

/**
 * Obtener nombre para mostrar
 */
export function getClientDisplayName(
  client: Client & {
    individualProfile?: IndividualProfile | null
    businessProfile?: BusinessProfile | null
  }
): string {
  if (client.type === 'INDIVIDUAL' && client.individualProfile) {
    return `${client.individualProfile.firstName} ${client.individualProfile.lastName}`
  } else if (client.type === 'BUSINESS' && client.businessProfile) {
    return client.businessProfile.businessName
  }
  return 'Cliente sin nombre'
}

/**
 * Obtener taxId (DNI/CIF) desencriptado
 */
export function getClientTaxId(
  client: Client & {
    individualProfile?: IndividualProfile | null
    businessProfile?: BusinessProfile | null
  }
): string | null {
  if (client.individualProfile) {
    return decryptSafe(client.individualProfile.taxId)
  } else if (client.businessProfile) {
    return decryptSafe(client.businessProfile.taxId)
  }
  return null
}

/**
 * Obtener taxId (DNI/CIF) enmascarado
 */
export function getClientTaxIdMasked(
  client: Client & {
    individualProfile?: IndividualProfile | null
    businessProfile?: BusinessProfile | null
  }
): string {
  const taxId = getClientTaxId(client)
  return taxId ? maskData(taxId, 4) : 'N/A'
}
