'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

interface CreateCollectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  collector?: {
    id: string
    name: string
    email: string
    phone?: string | null
  }
}

export function CreateCollectorModal({
  open,
  onOpenChange,
  onSuccess,
  collector,
}: CreateCollectorModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const isEditing = !!collector

  // Cargar datos si estamos editando
  useEffect(() => {
    if (collector) {
      setName(collector.name)
      setEmail(collector.email)
      setPhone(collector.phone || '')
    } else {
      setName('')
      setEmail('')
      setPhone('')
    }
  }, [collector, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Error',
        description: 'Nombre y email son requeridos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const url = isEditing ? `/api/collectors/${collector.id}` : '/api/collectors'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      })

      if (res.ok) {
        toast({
          title: isEditing ? 'Cobrador actualizado' : 'Cobrador creado',
          description: `${name} fue ${isEditing ? 'actualizado' : 'creado'} exitosamente`,
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || `No se pudo ${isEditing ? 'actualizar' : 'crear'} el cobrador`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error al ${isEditing ? 'actualizar' : 'crear'} cobrador`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cobrador' : 'Nuevo Cobrador'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la información del cobrador'
              : 'Crea un nuevo cobrador para asignarle préstamos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@example.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Solo para contacto, no para login
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
