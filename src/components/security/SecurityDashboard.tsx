'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, AlertTriangle, Info, XCircle, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/formatters/date'

interface SecurityLog {
  id: string
  eventType: string
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL'
  userId?: string
  email?: string
  ipAddress: string
  userAgent?: string
  description: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

interface SecurityStats {
  totalEvents: number
  failedLogins: number
  suspiciousActivities: number
  rateLimitExceeded: number
  daysAnalyzed: number
}

export function SecurityDashboard() {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const loadSecurityData = async (filter: string) => {
    setLoading(true)
    try {
      const logsUrl =
        filter === 'all'
          ? '/api/security/logs?limit=50'
          : `/api/security/logs?limit=50&severity=${filter}`

      const [logsRes, statsRes] = await Promise.all([
        fetch(logsUrl),
        fetch('/api/security/stats?days=7'),
      ])

      if (logsRes.ok) {
        const logsData: SecurityLog[] = await logsRes.json()
        setLogs(logsData)
      }

      if (statsRes.ok) {
        const statsData: SecurityStats = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error fetching security data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSecurityData(severityFilter)
  }, [severityFilter])

  const getSeverityBadge = (severity: string) => {
    const config = {
      INFO: { variant: 'default' as const, icon: Info, label: 'Info' },
      WARNING: { variant: 'outline' as const, icon: AlertTriangle, label: 'Advertencia' },
      ALERT: { variant: 'destructive' as const, icon: AlertTriangle, label: 'Alerta' },
      CRITICAL: { variant: 'destructive' as const, icon: XCircle, label: 'Crítico' },
    }

    const { variant, icon: Icon, label } = config[severity as keyof typeof config] || config.INFO

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      LOGIN_SUCCESS: 'Login Exitoso',
      LOGIN_FAILED: 'Login Fallido',
      LOGOUT: 'Logout',
      PASSWORD_CHANGE: 'Cambio de Contraseña',
      PERMISSION_CHANGE: 'Cambio de Permisos',
      RATE_LIMIT_EXCEEDED: 'Límite Excedido',
      SUSPICIOUS_ACTIVITY: 'Actividad Sospechosa',
      IP_BLOCKED: 'IP Bloqueada',
      MASS_EXPORT: 'Exportación Masiva',
      UNAUTHORIZED_ACCESS: 'Acceso No Autorizado',
    }

    return labels[eventType] || eventType
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Últimos {stats.daysAnalyzed} días</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logins Fallidos</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedLogins}</div>
              <p className="text-xs text-muted-foreground">Intentos fallidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actividad Sospechosa</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.suspiciousActivities}</div>
              <p className="text-xs text-muted-foreground">Alertas generadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
              <Info className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rateLimitExceeded}</div>
              <p className="text-xs text-muted-foreground">Límites alcanzados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Seguridad</CardTitle>
              <CardDescription>Eventos de seguridad recientes del sistema</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Advertencia</SelectItem>
                  <SelectItem value="ALERT">Alerta</SelectItem>
                  <SelectItem value="CRITICAL">Crítico</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void loadSecurityData(severityFilter)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay eventos de seguridad registrados
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {formatDate(new Date(log.createdAt))}
                      <br />
                      <span className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString('es-ES')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getEventTypeLabel(log.eventType)}</Badge>
                    </TableCell>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                    <TableCell className="text-xs">
                      {log.email || log.userId || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.ipAddress}</TableCell>
                    <TableCell className="text-sm max-w-md truncate">
                      {log.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
