import { PrismaClient, ParameterCategory, ParameterType } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedParameters() {
  console.log('🔧 Seeding system parameters...')

  const parameters = [
    // ============================================
    // FINANCIERO (3 parámetros)
    // ============================================
    {
      key: 'FINANCIAL_DECIMAL_PLACES',
      category: ParameterCategory.FINANCIAL,
      type: ParameterType.INTEGER,
      value: '2',
      description: 'Decimales en montos de dinero',
      unit: 'decimales',
      isEditable: true,
      isActive: true,
      minValue: '0',
      maxValue: '4',
    },
    {
      key: 'FINANCIAL_SHOW_CENTS',
      category: ParameterCategory.FINANCIAL,
      type: ParameterType.BOOLEAN,
      value: 'true',
      description: 'Mostrar centavos en reportes',
      isEditable: true,
      isActive: true,
    },
    {
      key: 'FINANCIAL_NUMBER_FORMAT',
      category: ParameterCategory.FINANCIAL,
      type: ParameterType.STRING,
      value: 'ES',
      description: 'Formato de números (ES: 1.000,00 / US: 1,000.00)',
      isEditable: true,
      isActive: true,
    },

    // ============================================
    // RIESGO (2 parámetros)
    // ============================================
    {
      key: 'RISK_EARLY_WARNING_DAYS',
      category: ParameterCategory.RISK,
      type: ParameterType.INTEGER,
      value: '7',
      description: 'Días de mora para alerta temprana',
      unit: 'días',
      isEditable: true,
      isActive: true,
      minValue: '1',
      maxValue: '30',
    },
    {
      key: 'RISK_AUTO_REMINDERS',
      category: ParameterCategory.RISK,
      type: ParameterType.BOOLEAN,
      value: 'true',
      description: 'Habilitar recordatorios automáticos al administrador',
      isEditable: true,
      isActive: true,
    },

    // ============================================
    // COBRANZA (4 parámetros)
    // ============================================
    {
      key: 'COLLECTION_REMINDER_DAYS_BEFORE',
      category: ParameterCategory.COLLECTION,
      type: ParameterType.INTEGER,
      value: '3',
      description: 'Días antes del vencimiento para recordatorio al admin',
      unit: 'días',
      isEditable: true,
      isActive: true,
      minValue: '0',
      maxValue: '15',
    },
    {
      key: 'COLLECTION_URGENT_DAYS_AFTER',
      category: ParameterCategory.COLLECTION,
      type: ParameterType.INTEGER,
      value: '15',
      description: 'Días de mora para marcar como urgente',
      unit: 'días',
      isEditable: true,
      isActive: true,
      minValue: '1',
      maxValue: '90',
    },
    {
      key: 'COLLECTION_EMAIL_NOTIFICATIONS',
      category: ParameterCategory.COLLECTION,
      type: ParameterType.BOOLEAN,
      value: 'true',
      description: 'Notificaciones por email al administrador',
      isEditable: true,
      isActive: true,
    },
    {
      key: 'COLLECTION_WHATSAPP_NOTIFICATIONS',
      category: ParameterCategory.COLLECTION,
      type: ParameterType.BOOLEAN,
      value: 'false',
      description: 'Notificaciones por WhatsApp (requiere configuración)',
      isEditable: true,
      isActive: true,
    },

    // ============================================
    // NEGOCIO (3 parámetros)
    // ============================================
    {
      key: 'BUSINESS_COMPANY_NAME',
      category: ParameterCategory.BUSINESS,
      type: ParameterType.STRING,
      value: 'Mi Empresa de Préstamos',
      description: 'Nombre de la empresa (para reportes)',
      isEditable: true,
      isActive: true,
    },
    {
      key: 'BUSINESS_WORKING_DAYS',
      category: ParameterCategory.BUSINESS,
      type: ParameterType.STRING,
      value: 'MON_TO_FRI',
      description: 'Días laborables (MON_TO_FRI / MON_TO_SAT / ALL_DAYS)',
      isEditable: true,
      isActive: true,
    },
    {
      key: 'BUSINESS_WORKING_HOURS',
      category: ParameterCategory.BUSINESS,
      type: ParameterType.STRING,
      value: '09:00-18:00',
      description: 'Horario de atención (para emails)',
      isEditable: true,
      isActive: true,
    },

    // ============================================
    // SISTEMA (2 parámetros)
    // ============================================
    {
      key: 'SYSTEM_TIMEZONE',
      category: ParameterCategory.SYSTEM,
      type: ParameterType.STRING,
      value: 'Europe/Madrid',
      description: 'Zona horaria del sistema',
      isEditable: true,
      isActive: true,
    },
    {
      key: 'SYSTEM_THEME',
      category: ParameterCategory.SYSTEM,
      type: ParameterType.STRING,
      value: 'LIGHT',
      description: 'Tema de la interfaz (LIGHT / DARK)',
      isEditable: true,
      isActive: true,
    },
  ]

  for (const param of parameters) {
    await prisma.systemParameter.upsert({
      where: { key: param.key },
      update: param,
      create: param,
    })
  }

  console.log(`✅ Created ${parameters.length} system parameters`)
}

export async function clearParameters() {
  await prisma.systemParameter.deleteMany({})
  console.log('🗑️  Cleared all system parameters')
}
