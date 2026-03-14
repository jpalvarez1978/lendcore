'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/formatters/date'
import { Plus, MessageSquare } from 'lucide-react'

interface Note {
  id: string
  content: string
  createdAt: Date
  user: {
    name: string
  }
}

interface ClientNotesProps {
  clientId: string
  notes: Note[]
  onAddNote?: (content: string) => Promise<void>
}

export function ClientNotes({ clientId, notes, onAddNote }: ClientNotesProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const notesRegionId = `client-${clientId}-notes`

  const handleSubmit = async () => {
    if (!newNote.trim() || !onAddNote) return

    setIsSubmitting(true)
    try {
      await onAddNote(newNote)
      setNewNote('')
      setIsAdding(false)
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id={notesRegionId} className="space-y-4">
      {/* Add note button */}
      {!isAdding && onAddNote && (
        <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Añadir Nota
        </Button>
      )}

      {/* Add note form */}
      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <Textarea
              placeholder="Escribe una nota sobre el cliente..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              rows={4}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting || !newNote.trim()}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setNewNote('')
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay notas registradas</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <Card key={note.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-sm">{note.user.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
