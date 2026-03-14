'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileSearch, Loader2, Send, XCircle } from 'lucide-react'
import { ApplicationStatus } from '@prisma/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface ApplicationWorkflowPanelProps {
  applicationId: string
  status: ApplicationStatus
  canSubmit: boolean
  canApprove: boolean
  canReject: boolean
  createLoanHref: string | null
}

type WorkflowAction = 'submit' | 'approve' | 'reject'

function getStatusCopy(status: ApplicationStatus) {
  switch (status) {
    case 'DRAFT':
      return {
        title: 'Borrador listo para revisión',
        description:
          'Verifica la información comercial y envíala a revisión cuando el expediente esté completo.',
      }
    case 'UNDER_REVIEW':
      return {
        title: 'Expediente en evaluación',
        description:
          'La solicitud ya está en revisión. Desde aquí puedes aprobarla o rechazarla con trazabilidad.',
      }
    case 'APPROVED':
      return {
        title: 'Solicitud aprobada',
        description:
          'La evaluación quedó aprobada. El siguiente paso operativo es originar el préstamo desde esta solicitud.',
      }
    case 'REJECTED':
      return {
        title: 'Solicitud rechazada',
        description:
          'El rechazo ya quedó registrado. Conserva el histórico como soporte para auditoría y seguimiento.',
      }
    case 'DISBURSED':
      return {
        title: 'Solicitud desembolsada',
        description:
          'La solicitud ya fue convertida en préstamo. El flujo quedó cerrado a nivel operativo.',
      }
    default:
      return {
        title: 'Solicitud en seguimiento',
        description: 'Revisa el estado actual y continúa con el siguiente paso operativo.',
      }
  }
}

export function ApplicationWorkflowPanel({
  applicationId,
  status,
  canSubmit,
  canApprove,
  canReject,
  createLoanHref,
}: ApplicationWorkflowPanelProps) {
  const router = useRouter()
  const [openAction, setOpenAction] = useState<WorkflowAction | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const statusCopy = useMemo(() => getStatusCopy(status), [status])

  const handleAction = async (action: WorkflowAction) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo requerido',
        description: 'Debes indicar el motivo del rechazo antes de continuar.',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approvalNotes: approvalNotes.trim() || undefined,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      })

      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo actualizar la solicitud')
      }

      setOpenAction(null)
      setApprovalNotes('')
      setRejectionReason('')

      toast({
        title:
          action === 'submit'
            ? 'Solicitud enviada a revisión'
            : action === 'approve'
              ? 'Solicitud aprobada'
              : 'Solicitud rechazada',
        description:
          action === 'submit'
            ? 'La solicitud fue enviada a revisión correctamente.'
            : action === 'approve'
              ? 'La solicitud quedó aprobada y lista para originar el préstamo.'
              : 'El rechazo quedó registrado con su motivo.',
      })

      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar la solicitud'
      toast({
        variant: 'destructive',
        title: 'No se pudo completar la acción',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Flujo y decisiones</CardTitle>
          <CardDescription>Gestiona el expediente completo desde esta misma vista.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{statusCopy.title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{statusCopy.description}</p>
              </div>
              <StatusBadge type="application" value={status} />
            </div>
          </div>

          <div className="space-y-3">
            {status === 'DRAFT' && canSubmit && (
              <Button className="w-full" onClick={() => handleAction('submit')} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar a revisión
                  </>
                )}
              </Button>
            )}

            {status === 'UNDER_REVIEW' && (canApprove || canReject) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {canApprove && (
                  <Button className="w-full" onClick={() => setOpenAction('approve')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aprobar
                  </Button>
                )}
                {canReject && (
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => setOpenAction('reject')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                )}
              </div>
            )}

            {status === 'APPROVED' && createLoanHref && (
              <Link href={createLoanHref} className="block">
                <Button className="w-full">
                  <FileSearch className="mr-2 h-4 w-4" />
                  Crear préstamo desde esta solicitud
                </Button>
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm leading-6 text-muted-foreground">
            El circuito operativo recomendado es: <span className="font-medium text-foreground">borrador</span> →
            <span className="font-medium text-foreground"> revisión</span> →
            <span className="font-medium text-foreground"> aprobación o rechazo</span> →
            <span className="font-medium text-foreground"> desembolso</span>.
          </div>
        </CardContent>
      </Card>

      <Dialog open={openAction === 'approve'} onOpenChange={open => setOpenAction(open ? 'approve' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar solicitud</DialogTitle>
            <DialogDescription>
              Puedes dejar notas internas para documentar el criterio de aprobación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="approvalNotes">Notas de aprobación</Label>
            <Textarea
              id="approvalNotes"
              value={approvalNotes}
              onChange={event => setApprovalNotes(event.target.value)}
              rows={5}
              placeholder="Ejemplo: cliente verificado, capacidad de pago consistente, expediente completo."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={() => handleAction('approve')} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aprobando...
                </>
              ) : (
                'Confirmar aprobación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAction === 'reject'} onOpenChange={open => setOpenAction(open ? 'reject' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              El motivo quedará guardado como parte de la trazabilidad del expediente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="rejectionReason">Motivo del rechazo</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={event => setRejectionReason(event.target.value)}
              rows={5}
              placeholder="Ejemplo: documentación incompleta, capacidad insuficiente, riesgo fuera de política."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAction(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => handleAction('reject')}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                'Confirmar rechazo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
