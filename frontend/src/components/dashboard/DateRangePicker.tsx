import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onApply: (startDate: Date, endDate: Date) => void
  onCancel?: () => void
  timezone?: string
}

export function DateRangePicker({ 
  startDate, 
  endDate, 
  onApply, 
  onCancel,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState(startDate)
  const [tempEndDate, setTempEndDate] = useState(endDate)
  const [tempStartTime, setTempStartTime] = useState(formatTime(startDate))
  const [tempEndTime, setTempEndTime] = useState(formatTime(endDate))
  const [currentMonth, setCurrentMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1))
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setTempStartTime(formatTime(startDate))
    setTempEndTime(formatTime(endDate))
  }, [startDate, endDate])

  function formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  function formatDate(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  }

  function formatDateRange(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} - ${endStr}`
  }

  function applyPreset(preset: string) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let newStartDate: Date
    let newEndDate: Date = new Date(today)
    newEndDate.setHours(23, 59, 59, 999)

    switch (preset) {
      case 'today':
        newStartDate = new Date(today)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'yesterday':
        newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() - 1)
        newStartDate.setHours(0, 0, 0, 0)
        newEndDate = new Date(today)
        newEndDate.setDate(today.getDate() - 1)
        newEndDate.setHours(23, 59, 59, 999)
        break
      case 'last7days':
        newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() - 6)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'last14days':
        newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() - 13)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'last30days':
        newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() - 29)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'last90days':
        newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() - 89)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'thisweek':
        const dayOfWeek = today.getDay()
        newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() - dayOfWeek)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'previousweek':
        const prevWeekEnd = new Date(today)
        prevWeekEnd.setDate(today.getDate() - today.getDay() - 1)
        prevWeekEnd.setHours(23, 59, 59, 999)
        newEndDate = prevWeekEnd
        newStartDate = new Date(prevWeekEnd)
        newStartDate.setDate(prevWeekEnd.getDate() - 6)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'thismonth':
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'previousmonth':
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        newStartDate = prevMonth
        newStartDate.setHours(0, 0, 0, 0)
        const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
        newEndDate = new Date(lastDayPrevMonth)
        newEndDate.setHours(23, 59, 59, 999)
        break
      case 'thisquarter':
        const quarter = Math.floor(today.getMonth() / 3)
        newStartDate = new Date(today.getFullYear(), quarter * 3, 1)
        newStartDate.setHours(0, 0, 0, 0)
        break
      case 'previousquarter':
        const prevQuarter = Math.floor(today.getMonth() / 3) - 1
        if (prevQuarter < 0) {
          newStartDate = new Date(today.getFullYear() - 1, 9, 1)
          newEndDate = new Date(today.getFullYear() - 1, 11, 31)
        } else {
          newStartDate = new Date(today.getFullYear(), prevQuarter * 3, 1)
          newEndDate = new Date(today.getFullYear(), (prevQuarter + 1) * 3, 0)
        }
        newStartDate.setHours(0, 0, 0, 0)
        newEndDate.setHours(23, 59, 59, 999)
        break
      default:
        return
    }

    setTempStartDate(newStartDate)
    setTempEndDate(newEndDate)
    setTempStartTime(formatTime(newStartDate))
    setTempEndTime(formatTime(newEndDate))
    setSelectedPreset(preset)
    setCurrentMonth(new Date(newStartDate.getFullYear(), newStartDate.getMonth(), 1))
  }

  function handleDateClick(date: Date) {
    if (!tempStartDate || tempEndDate < tempStartDate || date < tempStartDate) {
      // Start new selection
      setTempStartDate(date)
      setTempEndDate(date)
    } else {
      // Complete selection
      setTempEndDate(date)
    }
  }

  function handleApply() {
    // Apply time to dates
    const [startHours, startMinutes] = tempStartTime.split(':').map(Number)
    const [endHours, endMinutes] = tempEndTime.split(':').map(Number)
    
    const finalStartDate = new Date(tempStartDate)
    finalStartDate.setHours(startHours, startMinutes, 0, 0)
    
    const finalEndDate = new Date(tempEndDate)
    finalEndDate.setHours(endHours, endMinutes, 59, 999)
    
    onApply(finalStartDate, finalEndDate)
    setIsOpen(false)
    setSelectedPreset(null)
  }

  function handleCancel() {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setTempStartTime(formatTime(startDate))
    setTempEndTime(formatTime(endDate))
    setIsOpen(false)
    setSelectedPreset(null)
    if (onCancel) {
      onCancel()
    }
  }

  function navigateMonth(direction: 'prev' | 'next') {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  function getDaysInMonth(year: number, month: number): Date[] {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Add days from previous month to fill first week
    const startDay = firstDay.getDay()
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i))
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    // Add days from next month to fill last week
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day))
    }
    
    return days
  }

  function isDateInRange(date: Date): boolean {
    if (!tempStartDate || !tempEndDate) return false
    return date >= tempStartDate && date <= tempEndDate
  }

  function isDateSelected(date: Date): boolean {
    if (!tempStartDate || !tempEndDate) return false
    const dateStr = date.toDateString()
    return dateStr === tempStartDate.toDateString() || dateStr === tempEndDate.toDateString()
  }

  const month1 = currentMonth
  const month2 = new Date(month1.getFullYear(), month1.getMonth() + 1, 1)
  const days1 = getDaysInMonth(month1.getFullYear(), month1.getMonth())
  const days2 = getDaysInMonth(month2.getFullYear(), month2.getMonth())

  return (
    <div style={{ position: 'relative' }} ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontWeight: '500',
          color: '#111827'
        }}
      >
        <Calendar style={{ width: '16px', height: '16px' }} />
        {formatDateRange(startDate, endDate)}
        <span style={{ fontSize: '0.75rem' }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
            width: '700px',
            padding: '1.5rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* Preset Buttons */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              {[
                { key: 'last7days', label: 'Last 7 days' },
                { key: 'last14days', label: 'Last 14 days' },
                { key: 'last30days', label: 'Last 30 days' },
                { key: 'last90days', label: 'Last 90 days' },
                { key: 'today', label: 'Today' },
                { key: 'thisweek', label: 'This week' },
                { key: 'thismonth', label: 'This month' },
                { key: 'thisquarter', label: 'This quarter' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'previousweek', label: 'Previous week' },
                { key: 'previousmonth', label: 'Previous month' },
                { key: 'previousquarter', label: 'Previous quarter' }
              ].map(preset => (
                <button
                  key={preset.key}
                  onClick={() => applyPreset(preset.key)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedPreset === preset.key ? '#2563eb' : 'white',
                    color: selectedPreset === preset.key ? 'white' : '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: selectedPreset === preset.key ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPreset !== preset.key) {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPreset !== preset.key) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time Inputs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                Starts
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={formatDate(tempStartDate)}
                  onChange={(e) => {
                    const [month, day, year] = e.target.value.split('/').map(Number)
                    if (month && day && year) {
                      setTempStartDate(new Date(year, month - 1, day))
                    }
                  }}
                  placeholder="MM/DD/YYYY"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ position: 'relative', flex: '0 0 80px' }}>
                  <Clock style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af' }} />
                  <input
                    type="time"
                    value={tempStartTime}
                    onChange={(e) => setTempStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.5rem 0.5rem 2rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem', display: 'block' }}>
                Ends
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={formatDate(tempEndDate)}
                  onChange={(e) => {
                    const [month, day, year] = e.target.value.split('/').map(Number)
                    if (month && day && year) {
                      setTempEndDate(new Date(year, month - 1, day))
                    }
                  }}
                  placeholder="MM/DD/YYYY"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ position: 'relative', flex: '0 0 80px' }}>
                  <Clock style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9ca3af' }} />
                  <input
                    type="time"
                    value={tempEndTime}
                    onChange={(e) => setTempEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.5rem 0.5rem 2rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* Month 1 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <button
                  onClick={() => navigateMonth('prev')}
                  style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                </button>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                  {month1.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div style={{ width: '24px' }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', padding: '0.5rem' }}>
                    {day}
                  </div>
                ))}
                {days1.map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === month1.getMonth()
                  const isInRange = isDateInRange(date)
                  const isSelected = isDateSelected(date)
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleDateClick(date)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#2563eb' : isInRange ? '#dbeafe' : 'transparent',
                        color: isSelected ? 'white' : !isCurrentMonth ? '#d1d5db' : isInRange ? '#2563eb' : '#111827',
                        fontWeight: isSelected ? '600' : '400'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isInRange) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isInRange) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Month 2 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ width: '24px' }}></div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                  {month2.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => navigateMonth('next')}
                  style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <ChevronRight style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', padding: '0.5rem' }}>
                    {day}
                  </div>
                ))}
                {days2.map((date, idx) => {
                  const isCurrentMonth = date.getMonth() === month2.getMonth()
                  const isInRange = isDateInRange(date)
                  const isSelected = isDateSelected(date)
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleDateClick(date)}
                      style={{
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#2563eb' : isInRange ? '#dbeafe' : 'transparent',
                        color: isSelected ? 'white' : !isCurrentMonth ? '#d1d5db' : isInRange ? '#2563eb' : '#111827',
                        fontWeight: isSelected ? '600' : '400'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isInRange) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isInRange) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {timezone}
              </div>
              <select
                style={{
                  padding: '0.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option>Upload time</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

