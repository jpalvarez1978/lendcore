import { create } from 'zustand'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  metadata?: Record<string, unknown>
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      }

      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }
    }),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )

      return {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.read).length,
      }
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((notification) => notification.id !== id)

      return {
        notifications,
        unreadCount: notifications.filter((notification) => !notification.read).length,
      }
    }),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}))

// Helper para crear notificaciones
export const notify = {
  success: (title: string, message: string, actionUrl?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      actionUrl,
    })
  },

  error: (title: string, message: string) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
    })
  },

  warning: (title: string, message: string, actionUrl?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      actionUrl,
    })
  },

  info: (title: string, message: string, actionUrl?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
      actionUrl,
    })
  },

  // Notificaciones específicas del dominio
  paymentReceived: (amount: number, clientName: string, clientId: string) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title: 'Pago Recibido',
      message: `${new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount)} de ${clientName}`,
      actionUrl: `/dashboard/clientes/${clientId}`,
      metadata: { amount, clientName, clientId },
    })
  },

  promiseBroken: (clientName: string, amount: number, clientId: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: 'Promesa Incumplida',
      message: `${clientName} no pagó ${new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount)} como prometió`,
      actionUrl: `/dashboard/clientes/${clientId}`,
      metadata: { clientName, amount, clientId },
    })
  },

  loanOverdue: (loanNumber: string, daysOverdue: number, clientId: string) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title: 'Préstamo en Mora',
      message: `${loanNumber} lleva ${daysOverdue} días vencido`,
      actionUrl: `/dashboard/clientes/${clientId}`,
      metadata: { loanNumber, daysOverdue, clientId },
    })
  },

  applicationPending: (clientName: string, applicationId: string) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title: 'Nueva Solicitud',
      message: `${clientName} requiere aprobación`,
      actionUrl: `/dashboard/solicitudes/${applicationId}`,
      metadata: { clientName, applicationId },
    })
  },
}
