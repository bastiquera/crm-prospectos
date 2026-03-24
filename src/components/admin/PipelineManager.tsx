'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Trophy, Loader2, ChevronUp, ChevronDown, CheckSquare, BookOpen } from 'lucide-react'
import type { PipelineStage, ChecklistItem, Course } from '@/types'

interface Props { stages: PipelineStage[]; checklistItems: ChecklistItem[]; courses: Course[] }

export function PipelineManager({ stages: initialStages, checklistItems: initialChecklist, courses: initialCourses }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [stages, setStages] = useState<PipelineStage[]>(
    [...initialStages].sort((a, b) => a.order_index - b.order_index)
  )
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    [...initialChecklist].sort((a, b) => a.order_index - b.order_index)
  )
  const [newCheckLabel, setNewCheckLabel] = useState('')
  const [addingCheck, setAddingCheck] = useState(false)
  const [deletingCheckId, setDeletingCheckId] = useState<string | null>(null)

  // Courses state
  const [courses, setCourses] = useState<Course[]>(
    [...initialCourses].sort((a, b) => a.order_index - b.order_index)
  )
  const [newCourseName, setNewCourseName] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)

  const sorted = [...stages].sort((a, b) => a.order_index - b.order_index)

  async function addStage() {
    if (!newName.trim()) return
    setAdding(true)
    const maxOrder = Math.max(...stages.map((s) => s.order_index), 0)

    const { data } = await supabase
      .from('pipeline_stages')
      .insert({ name: newName.trim(), order_index: maxOrder + 1 })
      .select()
      .single()

    if (data) setStages((prev) => [...prev, data as PipelineStage])
    setNewName('')
    setAdding(false)
    router.refresh()
  }

  async function deleteStage(id: string) {
    setDeletingId(id)
    await supabase.from('pipeline_stages').delete().eq('id', id)
    setStages((prev) => prev.filter((s) => s.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  async function moveStage(id: string, direction: 'up' | 'down') {
    const idx = sorted.findIndex((s) => s.id === id)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sorted.length) return

    setMovingId(id)
    const current = sorted[idx]
    const target = sorted[targetIdx]

    const newCurrentOrder = target.order_index
    const newTargetOrder = current.order_index

    await Promise.all([
      supabase.from('pipeline_stages').update({ order_index: newCurrentOrder }).eq('id', current.id),
      supabase.from('pipeline_stages').update({ order_index: newTargetOrder }).eq('id', target.id),
    ])

    setStages((prev) =>
      prev.map((s) => {
        if (s.id === current.id) return { ...s, order_index: newCurrentOrder }
        if (s.id === target.id) return { ...s, order_index: newTargetOrder }
        return s
      })
    )
    setMovingId(null)
  }

  async function addChecklistItem() {
    if (!newCheckLabel.trim()) return
    setAddingCheck(true)
    const maxOrder = Math.max(...checklist.map((c) => c.order_index), 0)
    const { data } = await supabase
      .from('checklist_items')
      .insert({ label: newCheckLabel.trim(), order_index: maxOrder + 1 })
      .select()
      .single()
    if (data) setChecklist((prev) => [...prev, data as ChecklistItem])
    setNewCheckLabel('')
    setAddingCheck(false)
  }

  async function deleteChecklistItem(id: string) {
    setDeletingCheckId(id)
    await supabase.from('checklist_items').delete().eq('id', id)
    setChecklist((prev) => prev.filter((c) => c.id !== id))
    setDeletingCheckId(null)
  }

  async function addCourse() {
    if (!newCourseName.trim()) return
    setAddingCourse(true)
    const maxOrder = Math.max(...courses.map((c) => c.order_index), 0)
    const { data } = await supabase
      .from('courses')
      .insert({ name: newCourseName.trim(), order_index: maxOrder + 1 })
      .select()
      .single()
    if (data) setCourses((prev) => [...prev, data as Course])
    setNewCourseName('')
    setAddingCourse(false)
  }

  async function deleteCourse(id: string) {
    setDeletingCourseId(id)
    await supabase.from('courses').delete().eq('id', id)
    setCourses((prev) => prev.filter((c) => c.id !== id))
    setDeletingCourseId(null)
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Stages list */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card divide-y divide-border/40">
        {sorted.map((stage, idx) => (
          <div
            key={stage.id}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors group"
          >
            {/* Order controls */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button
                onClick={() => moveStage(stage.id, 'up')}
                disabled={idx === 0 || movingId === stage.id}
                className="p-0.5 rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-slate-100 disabled:opacity-0 disabled:cursor-default transition-all"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveStage(stage.id, 'down')}
                disabled={idx === sorted.length - 1 || movingId === stage.id}
                className="p-0.5 rounded text-muted-foreground/30 hover:text-muted-foreground hover:bg-slate-100 disabled:opacity-0 disabled:cursor-default transition-all"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Position number */}
            <span className="text-xs text-muted-foreground/50 w-4 text-center flex-shrink-0 font-mono">
              {idx + 1}
            </span>

            {/* Name + badges */}
            <div className="flex-1 flex items-center gap-2">
              {movingId === stage.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : null}
              <span className="text-sm font-medium text-foreground">{stage.name}</span>
              {stage.is_initial && (
                <Badge variant="secondary" className="text-xs">Inicial</Badge>
              )}
              {stage.is_closed_won && (
                <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                  <Trophy className="w-3 h-3 mr-1" />Cierre
                </Badge>
              )}
              {stage.is_closed_lost && (
                <Badge variant="secondary" className="text-xs bg-red-50 text-red-600 border-red-200">Perdido</Badge>
              )}
            </div>

            {/* Delete */}
            {!stage.is_initial && !stage.is_closed_won && !stage.is_closed_lost && (
              <button
                onClick={() => deleteStage(stage.id)}
                disabled={deletingId === stage.id}
                className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                {deletingId === stage.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new stage */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva etapa..."
          className="h-10 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && addStage()}
        />
        <Button
          onClick={addStage}
          disabled={adding || !newName.trim()}
          className="h-10 bg-primary hover:bg-primary/90 text-white px-4"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Usa las flechas ↑↓ para reordenar. Las etapas <strong>Inicial</strong>, <strong>Cierre</strong> y <strong>Perdido</strong> no se pueden eliminar.
      </p>

      {/* ── Checklist section ── */}
      <div className="space-y-4 pt-2 border-t border-border/40">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            Checklist de clientes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pasos que la vendedora debe completar en cada cliente
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border/60 shadow-card divide-y divide-border/40">
          {checklist.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin ítems. Agrega el primero abajo.
            </div>
          )}
          {checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors group"
            >
              <CheckSquare className="w-4 h-4 text-primary/30 flex-shrink-0" />
              <span className="flex-1 text-sm text-foreground">{item.label}</span>
              <button
                onClick={() => deleteChecklistItem(item.id)}
                disabled={deletingCheckId === item.id}
                className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                {deletingCheckId === item.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newCheckLabel}
            onChange={(e) => setNewCheckLabel(e.target.value)}
            placeholder="Nuevo ítem del checklist..."
            className="h-10 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
          />
          <Button
            onClick={addChecklistItem}
            disabled={addingCheck || !newCheckLabel.trim()}
            className="h-10 bg-primary hover:bg-primary/90 text-white px-4"
          >
            {addingCheck ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── Courses section ── */}
      <div className="space-y-4 pt-2 border-t border-border/40">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Cursos de interés
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cursos disponibles para que los leads seleccionen en el formulario de captura
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border/60 shadow-card divide-y divide-border/40">
          {courses.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin cursos. Agrega el primero abajo.
            </div>
          )}
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors group"
            >
              <BookOpen className="w-4 h-4 text-primary/30 flex-shrink-0" />
              <span className="flex-1 text-sm text-foreground">{course.name}</span>
              <button
                onClick={() => deleteCourse(course.id)}
                disabled={deletingCourseId === course.id}
                className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                {deletingCourseId === course.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Nombre del curso..."
            className="h-10 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addCourse()}
          />
          <Button
            onClick={addCourse}
            disabled={addingCourse || !newCourseName.trim()}
            className="h-10 bg-primary hover:bg-primary/90 text-white px-4"
          >
            {addingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
