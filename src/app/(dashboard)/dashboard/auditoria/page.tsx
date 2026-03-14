import { AuditService } from '@/services/auditService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters/date'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const actionLabels: Record<string, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  UPDATE_STATUS: 'Cambiar Estado',
  LOGIN: 'Iniciar Sesión',
  LOGOUT: 'Cerrar Sesión',
  NOTE_ADDED: 'Nota Añadida',
  CREDIT_LIMIT_CHANGE: 'Cambio de Cupo',
  PAYMENT_REGISTERED: 'Pago Registrado',
  LOAN_DISBURSED: 'Préstamo Desembolsado',
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  UPDATE_STATUS: 'bg-yellow-100 text-yellow-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  NOTE_ADDED: 'bg-indigo-100 text-indigo-800',
  CREDIT_LIMIT_CHANGE: 'bg-orange-100 text-orange-800',
  PAYMENT_REGISTERED: 'bg-teal-100 text-teal-800',
  LOAN_DISBURSED: 'bg-emerald-100 text-emerald-800',
}

export default async function AuditoriaPage() {
  const [{ logs, total }, stats] = await Promise.all([
    AuditService.getLogs({}, 50, 0),
    AuditService.getStats(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoría</h1>
          <p className="text-muted-foreground">
            Registro completo de actividades del sistema
          </p>
        </div>
        <Link href="/api/audit/export">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tipos de Acción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byAction.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.byAction[0]?.action}: {stats.byAction[0]?.count || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entidades Auditadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.byEntityType.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.byEntityType[0]?.entityType}: {stats.byEntityType[0]?.count || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuarios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Más activo: {stats.topUsers[0]?.userName || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usuarios más activos */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Más Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topUsers.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{user.userName}</p>
                    <p className="text-xs text-muted-foreground">{user.userRole}</p>
                  </div>
                </div>
                <Badge variant="secondary">{user.count} eventos</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribución por tipo de acción */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Tipo de Acción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byAction.map(action => (
              <div key={action.action} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={actionColors[action.action] || 'bg-gray-100'}
                  >
                    {actionLabels[action.action] || action.action}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{action.count}</span>
                  <span className="text-xs text-muted-foreground">
                    ({((action.count / stats.totalLogs) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Log de eventos recientes */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <span>Eventos Recientes</span>
              <Badge variant="secondary">{total} total</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start justify-between border-b pb-3 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={actionColors[log.action] || 'bg-gray-100'}
                    >
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    <span className="text-sm font-medium">{log.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">
                      ({log.user?.role || 'N/A'})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{log.entityType}</span> •{' '}
                    <span className="font-mono text-xs">{log.entityId}</span>
                  </div>
                  {log.ipAddress && (
                    <div className="text-xs text-muted-foreground mt-1">
                      IP: {log.ipAddress}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {formatDate(log.createdAt)}
                  <div className="text-xs">
                    {log.createdAt.toLocaleTimeString('es-ES')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
