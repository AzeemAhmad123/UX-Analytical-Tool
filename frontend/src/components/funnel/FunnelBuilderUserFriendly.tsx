import { useState, useEffect } from 'react'
import { Plus, GripVertical, Edit2, Trash2, HelpCircle, Sparkles } from 'lucide-react'
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
    calculation_mode?: 'sessions' | 'users'
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
    calculation_mode?: 'sessions' | 'users'
  }
}

// Funnel Templates
const FunnelTemplates = {
  category_clicks: {
    name: 'Category/Product Clicks',
    description: 'Track when users click on categories, products, or navigation items and then visit those pages',
    steps: [
      {
        order: 1,
        name: 'Homepage Visit',
        condition: {
          type: 'page_view',
          data: { url: '/' }
        }
      },
      {
        order: 2,
        name: 'Category/Item Clicked',
        condition: {
          type: 'event',
          event_type: 'click',
          data: { text: '' } // User fills this in
        }
      },
      {
        order: 3,
        name: 'Category/Item Page Viewed',
        condition: {
          type: 'page_view',
          data: { url: '' } // User fills this in
        }
      }
    ]
  },
  signup_funnel: {
    name: 'Sign Up Funnel',
    description: 'Track users from homepage to sign up completion',
    steps: [
      {
        order: 1,
        name: 'Homepage Visit',
        condition: {
          type: 'page_view',
          data: { url: '/' }
        }
      },
      {
        order: 2,
        name: 'Sign Up Button Clicked',
        condition: {
          type: 'event',
          event_type: 'click',
          data: { text: 'Sign Up' }
        }
      },
      {
        order: 3,
        name: 'Sign Up Page',
        condition: {
          type: 'page_view',
          data: { url: '/signup' }
        }
      }
    ]
  },
  custom: {
    name: 'Custom Funnel',
    description: 'Build your own funnel from scratch',
    steps: []
  }
}

export function FunnelBuilderUserFriendly({ onSave, onCancel, initialData }: FunnelBuilderProps) {
  const [showTemplates, setShowTemplates] = useState(!initialData)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [steps, setSteps] = useState<FunnelStep[]>(initialData?.steps || [])
  const [isFormFunnel] = useState(initialData?.is_form_funnel || false)
  const [formUrl] = useState(initialData?.form_url || '')
  const [timeWindowHours] = useState<number | undefined>(initialData?.time_window_hours)
  const [trackFirstTimeUsers] = useState(initialData?.track_first_time_users || false)
  const [calculationMode, setCalculationMode] = useState<'sessions' | 'users'>(initialData?.calculation_mode || 'sessions')
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState<Record<number, boolean>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
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
        newSteps.forEach((step, i) => {
          step.order = i + 1
        })
        return newSteps
      })
    }
  }

  const useTemplate = (templateKey: string) => {
    const template = FunnelTemplates[templateKey as keyof typeof FunnelTemplates]
    if (template) {
      setName(template.name)
      setDescription(template.description)
      setSteps(template.steps.map(s => ({ ...s })) as FunnelStep[])
      setSelectedTemplate(templateKey)
      setShowTemplates(false)
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
      track_first_time_users: trackFirstTimeUsers,
      calculation_mode: calculationMode
    })
  }

  // Template Selection Screen
  if (showTemplates && !initialData) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '8px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Choose a Funnel Template
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Start with a template or build your own funnel from scratch
        </p>

        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          <div
            onClick={() => useTemplate('category_clicks')}
            style={{
              padding: '1.5rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: '#f9fafb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#9333ea'
              e.currentTarget.style.backgroundColor = '#faf5ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Sparkles size={20} style={{ color: '#9333ea' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Category/Product Clicks</h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Track when users click on categories, products, or navigation items and visit those pages. Works for any website or app.
            </p>
            <div style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: '500' }}>
              Perfect for: E-commerce, service websites, product catalogs, navigation tracking
            </div>
          </div>

          <div
            onClick={() => useTemplate('signup_funnel')}
            style={{
              padding: '1.5rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: '#f9fafb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#9333ea'
              e.currentTarget.style.backgroundColor = '#faf5ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Sparkles size={20} style={{ color: '#9333ea' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Sign Up Funnel</h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Track users from homepage visit to sign up completion
            </p>
            <div style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: '500' }}>
              Perfect for: Conversion tracking and sign-up optimization
            </div>
          </div>

          <div
            onClick={() => useTemplate('custom')}
            style={{
              padding: '1.5rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: '#f9fafb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#9333ea'
              e.currentTarget.style.backgroundColor = '#faf5ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.backgroundColor = '#f9fafb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Sparkles size={20} style={{ color: '#9333ea' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Custom Funnel</h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Build your own funnel from scratch with full control
            </p>
            <div style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: '500' }}>
              Perfect for: Advanced users who want complete customization
            </div>
          </div>
        </div>

        <button
          onClick={onCancel}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          {initialData ? 'Edit Funnel' : 'Create New Funnel'}
        </h2>
        {selectedTemplate && (
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.25rem 0.75rem', 
            backgroundColor: '#f0f9ff', 
            color: '#0369a1', 
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            <Sparkles size={12} />
            Using template: {FunnelTemplates[selectedTemplate as keyof typeof FunnelTemplates]?.name}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Funnel Name <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Service Category Clicks"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this funnel tracks..."
          rows={2}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Calculation Mode */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Calculation Mode
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setCalculationMode('sessions')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: `2px solid ${calculationMode === 'sessions' ? '#9333ea' : '#e5e7eb'}`,
              borderRadius: '6px',
              backgroundColor: calculationMode === 'sessions' ? '#faf5ff' : 'white',
              color: calculationMode === 'sessions' ? '#9333ea' : '#374151',
              cursor: 'pointer',
              fontWeight: calculationMode === 'sessions' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            Session-based
          </button>
          <button
            type="button"
            onClick={() => setCalculationMode('users')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: `2px solid ${calculationMode === 'users' ? '#9333ea' : '#e5e7eb'}`,
              borderRadius: '6px',
              backgroundColor: calculationMode === 'users' ? '#faf5ff' : 'white',
              color: calculationMode === 'users' ? '#9333ea' : '#374151',
              cursor: 'pointer',
              fontWeight: calculationMode === 'users' ? '600' : '400',
              fontSize: '0.875rem'
            }}
          >
            User-based
          </button>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
          {calculationMode === 'sessions' 
            ? 'Counts each session that completes a step. One user can have multiple sessions.'
            : 'Counts unique users who complete a step. Each user is counted only once per step.'}
        </p>
      </div>

      {/* Funnel Steps */}
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map((_, i) => i.toString())} strategy={verticalListSortingStrategy}>
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
                    showHelp={showHelp[index] || false}
                    onToggleHelp={() => setShowHelp({ ...showHelp, [index]: !showHelp[index] })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn-secondary">
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

// Improved Step Editor with better UX
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
  showHelp?: boolean
  onToggleHelp?: () => void
}

function StepEditor({ step, index: _index, isEditing, onEdit, onSave, onCancel, onDelete, isFormFunnel, dragHandleProps, style, showHelp, onToggleHelp }: StepEditorProps) {
  const [name, setName] = useState(step.name)
  const [conditionType, setConditionType] = useState(step.condition.type)
  const [eventType, setEventType] = useState(step.condition.event_type || '')
  const [fieldName] = useState(step.condition.field_name || '')
  const [formId] = useState(step.condition.form_id || '')
  const existingData = step.condition.data || {}
  const existingDataEntries = Object.entries(existingData)
  const [dataKey, setDataKey] = useState(existingDataEntries.length > 0 ? existingDataEntries[0][0] : '')
  const [dataValue, setDataValue] = useState(existingDataEntries.length > 0 ? existingDataEntries[0][1] : '')

  // Auto-set dataKey based on condition type
  useEffect(() => {
    if (conditionType === 'page_view' && !dataKey) {
      setDataKey('url')
    } else if (conditionType === 'event' && eventType === 'click' && !dataKey) {
      setDataKey('text')
    }
  }, [conditionType, eventType])

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
        <div {...dragHandleProps} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
          <GripVertical size={16} style={{ color: '#9ca3af' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
            {step.order}. {step.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {step.condition.type === 'page_view' && `Page View: ${step.condition.data?.url || 'any page'}`}
            {step.condition.type === 'event' && `Event: ${step.condition.event_type}${step.condition.data?.text ? ` - "${step.condition.data.text}"` : ''}`}
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
    const trimmedKey = dataKey?.trim()
    const trimmedValue = dataValue?.trim()
    const hasValidData = trimmedKey && trimmedValue && trimmedKey !== '' && trimmedValue !== ''
    
    const condition: FunnelStep['condition'] = {
      type: conditionType as any,
      ...(conditionType === 'event' && { event_type: eventType }),
      ...(conditionType === 'form_field' && {
        field_name: fieldName,
        form_id: formId
      })
    }
    
    if (hasValidData) {
      condition.data = { [trimmedKey]: trimmedValue }
    }
    
    onSave({ name, condition })
  }

  const getHelpText = () => {
    if (conditionType === 'page_view') {
      return {
        title: 'Page View Tracking',
        description: 'Track when users visit a specific page on your website or app. The URL is the path part of your website address.',
        examples: [
          { key: 'url', value: '/', description: 'Homepage (root page)' },
          { key: 'url', value: '/products', description: 'Products page' },
          { key: 'url', value: '/checkout', description: 'Checkout page' },
          { key: 'url', value: '/about-us', description: 'About Us page' }
        ],
        tip: 'Tip: Look at your browser address bar when on a page. The part after your domain name is the URL path (e.g., if your site is "example.com/products", the URL is "/products")'
      }
    } else if (conditionType === 'event' && eventType === 'click') {
      return {
        title: 'Click Event Tracking',
        description: 'Track when users click on specific elements like buttons, links, or text. Works for any website or app.',
        examples: [
          { key: 'text', value: 'Buy Now', description: 'Click on button with text "Buy Now"' },
          { key: 'text', value: 'Sign Up', description: 'Click on link/button with text "Sign Up"' },
          { key: 'text', value: 'Add to Cart', description: 'Click on "Add to Cart" button' },
          { key: 'href', value: '/products', description: 'Click on any link that goes to "/products"' }
        ],
        tip: 'Tip: The text must match exactly what users see (case-sensitive). For links, use "href" to match the destination URL instead.'
      }
    }
    return null
  }

  const helpInfo = getHelpText()

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#faf5ff',
      border: '2px solid #9333ea',
      borderRadius: '8px'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
          Step Name <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Homepage Visit, Product Page View, Button Clicked"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Give this step a clear, descriptive name that explains what users are doing (e.g., "Homepage Visit", "Add to Cart Clicked")
        </p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>
            What should we track? <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <button
            type="button"
            onClick={onToggleHelp}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0' }}
          >
            <HelpCircle size={16} style={{ color: '#9333ea' }} />
          </button>
        </div>
          <select
            value={conditionType}
            onChange={(e) => {
              setConditionType(e.target.value as any)
              setDataKey('')
              setDataValue('')
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          >
            <option value="page_view">📄 Page View - Track when users visit a specific page</option>
            <option value="event">🖱️ Click Event - Track when users click buttons, links, or text</option>
            {isFormFunnel && <option value="form_field">📝 Form Field - Track form interactions</option>}
          </select>
      </div>

      {showHelp && helpInfo && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            {helpInfo.title}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            {helpInfo.description}
          </p>
          <div style={{ fontSize: '0.75rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Examples (works for any website):</strong>
            {helpInfo.examples.map((ex, i) => (
              <div key={i} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <div style={{ fontWeight: '500' }}>{ex.description}</div>
                <div style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  Key: <span style={{ color: '#9333ea' }}>{ex.key}</span> | Value: <span style={{ color: '#9333ea' }}>"{ex.value}"</span>
                </div>
              </div>
            ))}
            {helpInfo.tip && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '4px' }}>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>💡 {helpInfo.tip}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {conditionType === 'event' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
            Event Type <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value)
              setDataKey('')
              setDataValue('')
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Select event type...</option>
            <option value="click">Click - User clicks on any element (button, link, text, etc.)</option>
            <option value="button_click">Button Click - User clicks specifically on a button</option>
            <option value="form_submit">Form Submit - User submits a form</option>
          </select>
        </div>
      )}

      {(conditionType === 'page_view' || (conditionType === 'event' && eventType)) && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
            {conditionType === 'page_view' ? 'Page URL' : 'What to Match'} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <select
              value={dataKey}
              onChange={(e) => setDataKey(e.target.value)}
              style={{
                flex: '0 0 150px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Select field...</option>
              {conditionType === 'page_view' && (
                <>
                  <option value="url">Page URL (the path after your domain)</option>
                </>
              )}
              {conditionType === 'event' && eventType === 'click' && (
                <>
                  <option value="text">Button/Link Text (what users see and click)</option>
                  <option value="href">Link Destination (where the link goes)</option>
                  <option value="id">Element ID (HTML element identifier)</option>
                </>
              )}
            </select>
            <input
              type="text"
              value={dataValue}
              onChange={(e) => setDataValue(e.target.value)}
              placeholder={
                conditionType === 'page_view' 
                  ? 'Enter page URL (e.g., /home, /products, /about)'
                  : conditionType === 'event' && dataKey === 'text'
                  ? 'Enter exact text user clicks (e.g., "Buy Now", "Learn More")'
                  : conditionType === 'event' && dataKey === 'href'
                  ? 'Enter link URL (e.g., /products/item-1, /contact)'
                  : 'Enter value to match...'
              }
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {conditionType === 'page_view' 
              ? 'Enter the page path from your website URL. For homepage use "/", for other pages use the path after your domain (e.g., "/products", "/about-us", "/checkout")'
              : conditionType === 'event' && dataKey === 'text'
              ? 'Enter the exact text users click on. Must match exactly - case sensitive! (e.g., "Buy Now", "Sign Up", "Add to Cart")'
              : conditionType === 'event' && dataKey === 'href'
              ? 'Enter the URL the link points to (e.g., "/products", "/contact", "/signup")'
              : 'Enter the value to match'}
          </p>
        </div>
      )}

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
          Save Step
        </button>
      </div>
    </div>
  )
}

// Sortable wrapper
function SortableStepEditor({ step, index, isEditing, onEdit, onSave, onCancel, onDelete, isFormFunnel, showHelp, onToggleHelp }: Omit<StepEditorProps, 'dragHandleProps' | 'style'>) {
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
        showHelp={showHelp}
        onToggleHelp={onToggleHelp}
      />
    </div>
  )
}
