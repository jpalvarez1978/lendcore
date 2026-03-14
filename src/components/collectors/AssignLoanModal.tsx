'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/formatters/currency'
import { toast } from '@/hooks/use-toast'

interface UnassignedLoan {
  id: string
  loanNumber: string
  clientName: string
  principalAmount: number
  outstandingPrincipal: number
  status: string
  overdueInstallments: number
}

interface Collector {
  id: string
  name: string
  email: string
  role: string
  _count: {
    assignedLoans: number
  }
}

interface AssignLoanModalProps {
  collectorId: string
  collectorName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AssignLoanModal({
  collectorId,
  collectorName,
  open,
  onOpenChange,
  onSuccess,
}: AssignLoanModalProps) {
  const [unassignedLoans, setUnassignedLoans] = useState<UnassignedLoan[]>([])
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (open) {
      fetchUnassignedLoans()
      setSelectedLoans(new Set())
    }
  }, [open])

  const fetchUnassignedLoans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/collectors/unassigned-loans')
      if (res.ok) {
        const data = await res.json()
        setUnassignedLoans(data)
      }
    } catch (error) {
      console.error('Error fetching unassigned loans:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los préstamos disponibles',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleLoan = (loanId: string) => {
    const newSelected = new Set(selectedLoans)
    if (newSelected.has(loanId)) {
      newSelected.delete(loanId)
    } else {
      newSelected.add(loanId)
    }
    setSelectedLoans(newSelected)
  }

  const handleAssign = async () => {
    if (selectedLoans.size === 0) return

    setAssigning(true)
    try {
      const res = await fetch('/api/collectors/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanIds: Array.from(selectedLoans),
          collectorId,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Préstamos asignados',
          description: `Se asignaron ${selectedLoans.size} préstamo(s) a ${collectorName}`,
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudieron asignar los préstamos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al asignar préstamos',
        variant: 'destructive',
      })
    } finally {
      setAssigning(false)
    }
  }

  const filteredLoans = unassignedLoans.filter(loan =>
    loan.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loan.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Asignar Préstamos a {collectorName}</DialogTitle>
          <DialogDescription>
            Selecciona los préstamos que quieres asignar para gestión de cobro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Buscar por número de préstamo o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredLoans.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No hay préstamos disponibles para asignar
                </p>
              ) : (
                filteredLoans.map((loan) => (
                  <button
                    key={loan.id}
                    type="button"
                    onClick={() => toggleLoan(loan.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLoans.has(loan.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{loan.loanNumber}</span>
                          {loan.status === 'DEFAULTED' && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Mora
                            </span>
                          )}
                          {loan.overdueInstallments > 0 && (
                            <span className="text-xs text-red-600">
                              {loan.overdueInstallments} cuota(s) vencida(s)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {loan.clientName}
                        </p>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Pendiente: <span className="font-medium text-foreground">
                              {formatCurrency(loan.outstandingPrincipal)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {selectedLoans.has(loan.id) && (
                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedLoans.size === 0 || assigning}
          >
            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Asignar {selectedLoans.size > 0 && `(${selectedLoans.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
