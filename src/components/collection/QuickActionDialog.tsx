'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { notify } from '@/lib/notifications/notificationStore'
import { Loader2 } from 'lucide-react'

interface QuickActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  loanId?: string
}

const actionTypes = [
  { value: 'CALL', label: 'Llamada Telefónica' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'VISIT', label: 'Visita Domiciliaria' },
  { value: 'PROMISE_FOLLOWUP', label: 'Seguimiento de Promesa' },
]

const results = [
  { value: 'NO_ANSWER', label: 'No contesta' },
  { value: 'PHONE_OFF', label: 'Teléfono apagado' },
  { value: 'WRONG_NUMBER', label: 'Número equivocado' },
  { value: 'PROMISE_MADE', label: 'Promesa de pago realizada' },
  { value: 'PAYMENT_MADE', label: 'Pago realizado' },
  { value: 'REFUSED_TO_PAY', label: 'Se niega a pagar' },
  { value: 'AGREED_TO_RESTRUCTURE', label: 'Acepta reestructurar' },
  { value: 'REQUESTED_EXTENSION', label: 'Solicita prórroga' },
  { value: 'HOSTILE', label: 'Actitud hostil' },
  { value: 'OTHER', label: 'Otro' },
]

export function QuickActionDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  loanId,
}: QuickActionDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    actionType: 'CALL',
    result: 'NO_ANSWER',
    notes: '',
    promiseAmount: '',
    promiseDate: '',
  })

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Registrar gestión
      const response = await fetch('/api/collection/quick-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          loanId,
          actionType: formData.actionType,
          result: formData.result,
          notes: formData.notes,
        }),
      })

      if (!response.ok) throw new Error('Error al registrar gestión')

      // Si es promesa, crear promesa de pago
      if (formData.result === 'PROMISE_MADE' && formData.promiseAmount && formData.promiseDate) {
        await fetch('/api/promises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            loanId,
            promisedAmount: parseFloat(formData.promiseAmount),
            promiseDate: formData.promiseDate,
            notes: `Promesa de pago de gestión ${formData.actionType}`,
          }),
        })
      }

      toast({
        title: 'Gestión Registrada',
        description: `Gestión de ${actionTypes.find(a => a.value === formData.actionType)?.label} registrada exitosamente`,
      })

      notify.info(
        'Gestión Registrada',
        `${actionTypes.find(a => a.value === formData.actionType)?.label} con ${clientName}`,
        `/dashboard/clientes/${clientId}`
      )

      // Resetear formulario
      setFormData({
        actionType: 'CALL',
        result: 'NO_ANSWER',
        notes: '',
        promiseAmount: '',
        promiseDate: '',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo registrar la gestión',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Gestión Rápida</DialogTitle>
          <DialogDescription>Cliente: {clientName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="quick-action-type">Tipo de Gestión</Label>
            <Select
              value={formData.actionType}
              onValueChange={value => setFormData({ ...formData, actionType: value })}
            >
              <SelectTrigger id="quick-action-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quick-action-result">Resultado</Label>
            <Select
              value={formData.result}
              onValueChange={value => setFormData({ ...formData, result: value })}
            >
              <SelectTrigger id="quick-action-result">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {results.map(result => (
                  <SelectItem key={result.value} value={result.value}>
                    {result.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.result === 'PROMISE_MADE' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="promiseAmount">Monto Prometido (€)</Label>
                  <Input
                    id="promiseAmount"
                    type="number"
                    step="0.01"
                    value={formData.promiseAmount}
                    onChange={e => setFormData({ ...formData, promiseAmount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="promiseDate">Fecha Prometida</Label>
                  <Input
                    id="promiseDate"
                    type="date"
                    value={formData.promiseDate}
                    onChange={e => setFormData({ ...formData, promiseDate: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Detalles de la gestión..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
