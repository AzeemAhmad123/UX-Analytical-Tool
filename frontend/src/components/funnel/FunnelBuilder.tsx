import { useState } from 'react'
import { Plus, GripVertical, Edit2, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import '../../components/dashboard/Dashboard.css'

interface FunnelStep {
  order: number
  name: string
  condition: {
    type: 'event' | 'page_view' | 'form_field' | 'custom'
    event_type?: string
    field_name?: string
    form_id?: string
    data?: Record<string, any>
  }
}

interface FunnelBuilderProps {
  onSave: (funnel: {
    name: string
    description?: string
    steps: FunnelStep[]
    is_form_funnel?: boolean
    form_url?: string
    time_window_hours?: number
    track_first_time_users?: boolean
  }) => void
  onCancel: () => void
  initialData?: {
    name: string
    description?: string
    steps: FunnelStep[]
    is_form_funnel?: boolean
    form_url?: string
    time_window_hours?: number
    track_first_time_users?: boolean
  }
}

export function FunnelBuilder({ onSave, onCancel, initialData }: FunnelBuilderProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [steps, setSteps] = useState<FunnelStep[]>(initialData?.steps || [])
  const [isFormFunnel, setIsFormFunnel] = useState(initialData?.is_form_funnel || false)
  const [formUrl, setFormUrl] = useState(initialData?.form_url || '')
  const [timeWindowHours, setTimeWindowHours] = useState<number | undefined>(initialData?.time_window_hours)
  const [trackFirstTimeUsers, setTrackFirstTimeUsers] = useState(initialData?.track_first_time_users || false)
  const [editingStep, setEditingStep] = useState<number | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((_, i) => i.toString() === active.id)
        const newIndex = items.findIndex((_, i) => i.toString() === over.id)
        const newSteps = arrayMove(items, oldIndex, newIndex)
        // Reorder steps
        newSteps.forEach((step, i) => {
          step.order = i + 1
        })
        return newSteps
      })
    }
  }

  const addStep = () => {
    const newStep: FunnelStep = {
      order: steps.length + 1,
      name: `Step ${steps.length + 1}`,
      condition: {
        type: 'page_view',
        data: {}
      }
    }
    setSteps([...steps, newStep])
    setEditingStep(steps.length)
  }

  const updateStep = (index: number, updates: Partial<FunnelStep>) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    // Reorder steps
    newSteps.forEach((step, i) => {
      step.order = i + 1
    })
    setSteps(newSteps)
  }

  const deleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    newSteps.forEach((step, i) => {
      step.order = i + 1
    })
    setSteps(newSteps)
    if (editingStep === index) {
      setEditingStep(null)
    }
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a funnel name')
      return
    }
    if (steps.length === 0) {
      alert('Please add at least one step')
      return
    }
    onSave({
      name,
      description,
      steps,
      is_form_funnel: isFormFunnel,
      form_url: isFormFunnel ? formUrl : undefined,
      time_window_hours: timeWindowHours,
      track_first_time_users: trackFirstTimeUsers
    })
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
        {initialData ? 'Edit Funnel' : 'Create New Funnel'}
      </h2>

      {/* Basic Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Funnel Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sign Up Funnel"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this funnel tracks..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Form Funnel Toggle */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isFormFunnel}
            onChange={(e) => setIsFormFunnel(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>This is a form field tracking funnel</span>
        </label>
        {isFormFunnel && (
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Form URL
            </label>
            <input
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="e.g., /signup or /checkout"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
        )}
      </div>

      {/* Time Window Setting */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Time Window (Optional)
        </label>
        <input
          type="number"
          value={timeWindowHours || ''}
          onChange={(e) => setTimeWindowHours(e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="e.g., 24 (hours)"
          min="1"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
        <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.75rem' }}>
          Users must complete all steps within this time window (in hours). Leave empty for no time limit.
        </small>
      </div>

      {/* Track First-Time Users */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={trackFirstTimeUsers}
            onChange={(e) => setTrackFirstTimeUsers(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>Track first-time vs returning users</span>
        </label>
        <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.75rem' }}>
          Enable to see breakdown of new vs returning users in funnel analysis
        </small>
      </div>

      {/* Steps */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Funnel Steps</h3>
          <button
            onClick={addStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#9333ea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', border: '2px dashed #d1d5db', borderRadius: '8px' }}>
            <p>No steps added yet. Click "Add Step" to get started.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((_, i) => i.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {steps.map((step, index) => (
                  <SortableStepEditor
                    key={index}
                    step={step}
                    index={index}
                    isEditing={editingStep === index}
                    onEdit={() => setEditingStep(index)}
                    onSave={(updates) => {
                      updateStep(index, updates)
                      setEditingStep(null)
                    }}
                    onCancel={() => setEditingStep(null)}
                    onDelete={() => deleteStep(index)}
                    isFormFunnel={isFormFunnel}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#9333ea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          {initialData ? 'Update Funnel' : 'Create Funnel'}
        </button>
      </div>
    </div>
  )
}

interface StepEditorProps {
  step: FunnelStep
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<FunnelStep>) => void
  onCancel: () => void
  onDelete: () => void
  isFormFunnel: boolean
  dragHandleProps?: any
  style?: any
}

function StepEditor({ step, index, isEditing, onEdit, onSave, onCancel, onDelete, isFormFunnel, dragHandleProps, style }: StepEditorProps) {
  const [name, setName] = useState(step.name)
  const [conditionType, setConditionType] = useState(step.condition.type)
  const [eventType, setEventType] = useState(step.condition.event_type || '')
  const [fieldName, setFieldName] = useState(step.condition.field_name || '')
  const [formId, setFormId] = useState(step.condition.form_id || '')
  const [dataKey, setDataKey] = useState('')
  const [dataValue, setDataValue] = useState('')

  if (!isEditing) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        ...style
      }}>
        <div
          {...dragHandleProps}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
        >
          <GripVertical size={16} style={{ color: '#9ca3af' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
            {step.order}. {step.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {step.condition.type === 'page_view' && 'Page View'}
            {step.condition.type === 'event' && `Event: ${step.condition.event_type}`}
            {step.condition.type === 'form_field' && `Form Field: ${step.condition.field_name}`}
          </div>
        </div>
        <button onClick={onEdit} style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}>
          <Edit2 size={16} style={{ color: '#6b7280' }} />
        </button>
        <button onClick={onDelete} style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}>
          <Trash2 size={16} style={{ color: '#ef4444' }} />
        </button>
      </div>
    )
  }

  const handleSave = () => {
    const condition: FunnelStep['condition'] = {
      type: conditionType as any,
      ...(conditionType === 'event' && { event_type: eventType }),
      ...(conditionType === 'form_field' && {
        field_name: fieldName,
        form_id: formId
      }),
      ...(dataKey && dataValue && {
        data: { [dataKey]: dataValue }
      })
    }
    onSave({ name, condition })
  }

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: '#f9fafb',
      border: '2px solid #9333ea',
      borderRadius: '8px'
    }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Step Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Landing Page"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Condition Type
        </label>
        <select
          value={conditionType}
          onChange={(e) => setConditionType(e.target.value as any)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        >
          <option value="page_view">Page View</option>
          <option value="event">Event</option>
          {isFormFunnel && <option value="form_field">Form Field</option>}
          <option value="custom">Custom</option>
        </select>
      </div>

      {conditionType === 'event' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Event Type
          </label>
          <input
            type="text"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="e.g., click, page_view"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>
      )}

      {conditionType === 'form_field' && (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Form ID
            </label>
            <input
              type="text"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              placeholder="e.g., signup-form"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Field Name
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g., email, password"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Additional Data (Optional)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={dataKey}
            onChange={(e) => setDataKey(e.target.value)}
            placeholder="Key (e.g., url)"
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
          <input
            type="text"
            value={dataValue}
            onChange={(e) => setDataValue(e.target.value)}
            placeholder="Value (e.g., /signup)"
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#9333ea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// Sortable wrapper for StepEditor
function SortableStepEditor({ step, index, isEditing, onEdit, onSave, onCancel, onDelete, isFormFunnel }: Omit<StepEditorProps, 'dragHandleProps' | 'style'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: index.toString() })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style}>
      <StepEditor
        step={step}
        index={index}
        isEditing={isEditing}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
        isFormFunnel={isFormFunnel}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

