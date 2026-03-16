import { ParameterService } from '@/services/parameterService'
import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import { ConfigurationClient } from '@/components/configuration/ConfigurationClient'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, DollarSign, AlertTriangle, Users, Briefcase } from 'lucide-react'

export default async function ConfiguracionPage() {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'SETTINGS_MANAGE')) {
    return (
      <AccessDeniedState
        description="La configuración del sistema está reservada para perfiles administradores."
        backHref="/dashboard"
      />
    )
  }

  // Inicializar parámetros si no existen (primera vez)
  await ParameterService.initializeDefaults()

  // Obtener todos los parámetros
  const allParameters = await ParameterService.listAll()

  const byCategory = {
    FINANCIAL: allParameters.filter(p => p.category === 'FINANCIAL'),
    RISK: allParameters.filter(p => p.category === 'RISK'),
    COLLECTION: allParameters.filter(p => p.category === 'COLLECTION'),
    BUSINESS: allParameters.filter(p => p.category === 'BUSINESS'),
    SYSTEM: allParameters.filter(p => p.category === 'SYSTEM'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground">
          Parámetros financieros y reglas de negocio configurables
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Financieros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{byCategory.FINANCIAL.length}</div>
            <p className="text-xs text-muted-foreground">parámetros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{byCategory.RISK.length}</div>
            <p className="text-xs text-muted-foreground">parámetros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cobranza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{byCategory.COLLECTION.length}</div>
            <p className="text-xs text-muted-foreground">parámetros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negocio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{byCategory.BUSINESS.length}</div>
            <p className="text-xs text-muted-foreground">parámetros</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="financial">
            <DollarSign className="mr-2 h-4 w-4" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="risk">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Riesgo
          </TabsTrigger>
          <TabsTrigger value="collection">
            <Users className="mr-2 h-4 w-4" />
            Cobranza
          </TabsTrigger>
          <TabsTrigger value="business">
            <Briefcase className="mr-2 h-4 w-4" />
            Negocio
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings className="mr-2 h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <ConfigurationClient parameters={byCategory.FINANCIAL} />
        </TabsContent>
        <TabsContent value="risk">
          <ConfigurationClient parameters={byCategory.RISK} />
        </TabsContent>
        <TabsContent value="collection">
          <ConfigurationClient parameters={byCategory.COLLECTION} />
        </TabsContent>
        <TabsContent value="business">
          <ConfigurationClient parameters={byCategory.BUSINESS} />
        </TabsContent>
        <TabsContent value="system">
          <ConfigurationClient parameters={byCategory.SYSTEM} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
