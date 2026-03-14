'use client'

import { useState } from 'react'
import {
  useSavedViewsStore,
  type FilterConfig,
  type SavedView,
} from '@/lib/filters/savedViewsStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Textarea } from '@/components/ui/textarea'
import { Star, Filter, Trash2, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatRelativeDate } from '@/lib/formatters/date'

interface SavedViewSelectorProps {
  context: SavedView['context']
  currentFilters?: FilterConfig[]
  onViewSelect: (view: SavedView) => void
}

export function SavedViewSelector({
  context,
  currentFilters = [],
  onViewSelect,
}: SavedViewSelectorProps) {
  const { addView, deleteView, markAsUsed, getViewsByContext } = useSavedViewsStore()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [viewName, setViewName] = useState('')
  const [viewDescription, setViewDescription] = useState('')

  const contextViews = getViewsByContext(context)
  const myViews = contextViews.filter((v) => v.createdBy !== 'system')
  const predefinedViews = contextViews.filter((v) => v.createdBy === 'system')

  const handleSaveView = () => {
    if (!viewName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre de la vista es requerido',
      })
      return
    }

    addView({
      name: viewName,
      description: viewDescription,
      filters: currentFilters,
      context,
      isPublic: false,
      createdBy: 'currentUser', // TODO: Get from session
    })

    toast({
      title: 'Vista Guardada',
      description: `La vista "${viewName}" se guardó exitosamente`,
    })

    setViewName('')
    setViewDescription('')
    setSaveDialogOpen(false)
  }

  const handleSelectView = (view: SavedView) => {
    markAsUsed(view.id)
    onViewSelect(view)

    toast({
      title: 'Vista Aplicada',
      description: `Filtros de "${view.name}" aplicados`,
    })
  }

  const handleDeleteView = (viewId: string, viewName: string) => {
    deleteView(viewId)
    toast({
      title: 'Vista Eliminada',
      description: `La vista "${viewName}" fue eliminada`,
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Selector de vistas guardadas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Star className="mr-2 h-4 w-4" />
              Vistas Guardadas
              {contextViews.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {contextViews.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Vistas Predefinidas</DropdownMenuLabel>
            {predefinedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                className="cursor-pointer"
                onClick={() => handleSelectView(view)}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="text-xl">{view.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{view.name}</div>
                    <div className="text-xs text-muted-foreground">{view.description}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {view.filters.length} filtros
                      </Badge>
                      {view.lastUsed && (
                        <span className="text-xs text-muted-foreground">
                          • Usado {formatRelativeDate(view.lastUsed)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}

            {myViews.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Mis Vistas</DropdownMenuLabel>
                {myViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    className="cursor-pointer flex items-center justify-between"
                    onClick={() => handleSelectView(view)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Filter className="h-4 w-4 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{view.name}</div>
                        {view.description && (
                          <div className="text-xs text-muted-foreground">{view.description}</div>
                        )}
                        <Badge variant="outline" className="text-xs mt-1">
                          {view.filters.length} filtros
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteView(view.id, view.name)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {contextViews.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No hay vistas guardadas
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botón para guardar vista actual */}
        {currentFilters.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Vista
          </Button>
        )}
      </div>

      {/* Dialog para guardar nueva vista */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Vista</DialogTitle>
            <DialogDescription>
              Guarda los filtros actuales como una vista reutilizable
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="viewName">Nombre de la Vista *</Label>
              <Input
                id="viewName"
                placeholder="Ej: Mis casos críticos"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="viewDescription">Descripción (opcional)</Label>
              <Textarea
                id="viewDescription"
                placeholder="Describe qué filtra esta vista..."
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="border rounded-lg p-3 bg-muted">
              <div className="text-sm font-medium mb-2">Filtros a guardar:</div>
              <div className="space-y-1">
                {currentFilters.map((filter, index) => (
                  <div
                    key={`${filter.field}-${filter.operator}-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    • {filter.label || `${filter.field} ${filter.operator} ${filter.value}`}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveView}>Guardar Vista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
