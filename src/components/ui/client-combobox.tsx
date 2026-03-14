'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { matchesSearchTerm } from '@/lib/utils/search'

interface Client {
  id: string
  type: 'INDIVIDUAL' | 'BUSINESS'
  email?: string | null
  phone?: string | null
  individualProfile?: {
    firstName: string
    lastName: string
    taxId?: string | null
  } | null
  businessProfile?: {
    businessName: string
    taxId?: string | null
  } | null
}

interface ClientComboboxProps {
  clients: Client[]
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function ClientCombobox({ clients, value, onValueChange, disabled }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const getClientName = (client: Client) => {
    if (client.type === 'INDIVIDUAL' && client.individualProfile) {
      return `${client.individualProfile.firstName} ${client.individualProfile.lastName}`
    }
    if (client.type === 'BUSINESS' && client.businessProfile) {
      return client.businessProfile.businessName
    }
    return 'Cliente sin nombre'
  }

  const getClientType = (client: Client) => {
    return client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa'
  }

  const getClientTaxId = (client: Client) => {
    if (client.type === 'INDIVIDUAL') {
      return client.individualProfile?.taxId || ''
    }

    return client.businessProfile?.taxId || ''
  }

  const selectedClient = clients.find((client) => client.id === value)

  // Filtrar clientes
  const filteredClients = React.useMemo(() => {
    if (!searchTerm.trim()) return clients

    return clients.filter((client) => {
      return matchesSearchTerm(searchTerm, [
        getClientName(client),
        getClientType(client),
        getClientTaxId(client),
        client.email,
        client.phone,
      ])
    })
  }, [clients, searchTerm])

  const handleSelect = (clientId: string) => {
    console.log('✅ Seleccionando cliente:', clientId)
    onValueChange(clientId)
    setSearchTerm('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedClient ? (
            <span className="truncate">{getClientName(selectedClient)}</span>
          ) : (
            <span className="text-muted-foreground">
              {disabled ? 'Cargando clientes...' : 'Selecciona un cliente'}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col">
          {/* Campo de búsqueda */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Buscar por nombre, empresa o DNI/CIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Lista de clientes */}
          <div className="max-h-[300px] overflow-y-auto">
            <div className="p-1">
              {filteredClients.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No se encontraron clientes
                </div>
              ) : (
                filteredClients.map((client) => {
                  const clientName = getClientName(client)
                  const clientType = getClientType(client)
                  const clientTaxId = getClientTaxId(client)
                  const isSelected = value === client.id

                  return (
                    <div
                      key={client.id}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none',
                        'hover:bg-accent hover:text-accent-foreground',
                        isSelected && 'bg-accent'
                      )}
                      onClick={() => handleSelect(client.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{clientName}</span>
                        <span className="text-xs text-muted-foreground">
                          {[clientType, clientTaxId].filter(Boolean).join(' • ')}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
