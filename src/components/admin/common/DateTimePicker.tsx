'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export default function DateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Select date and time",
  label,
  className = ""
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeInput, setTimeInput] = useState(
    value ? new Date(value).toTimeString().slice(0, 5) : '12:00'
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayValue = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const [hours, minutes] = timeInput.split(':').map(Number);
    const newDateTime = new Date(date);
    newDateTime.setHours(hours, minutes, 0, 0);
    
    setSelectedDate(newDateTime);
    onChange(newDateTime.toISOString().slice(0, 16));
  };

  const handleTimeChange = (time: string) => {
    setTimeInput(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);
      
      setSelectedDate(newDateTime);
      onChange(newDateTime.toISOString().slice(0, 16));
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange(null);
    setIsOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    setTimeInput(currentTime);
    setSelectedDate(now);
    setCurrentMonth(now);
    onChange(now.toISOString().slice(0, 16));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-light mb-2">
          {label}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-white focus:border-neon-pink/50 focus:outline-none flex items-center justify-between hover:bg-background/70 transition-colors"
        >
          <span className={selectedDate ? 'text-white' : 'text-light'}>
            {selectedDate ? formatDisplayValue(selectedDate) : placeholder}
          </span>
          <Calendar size={16} className="text-light" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl z-50 p-3 w-72">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronLeft size={14} className="text-light" />
              </button>
              
              <h3 className="text-white font-medium text-sm">{monthYear}</h3>
              
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronRight size={14} className="text-light" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs text-light font-medium py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {days.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => day && handleDateSelect(day)}
                  disabled={!day}
                  className={`
                    h-6 text-xs rounded transition-colors
                    ${!day ? 'invisible' : ''}
                    ${day && selectedDate && day.toDateString() === selectedDate.toDateString()
                      ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/30'
                      : 'text-white hover:bg-white/10'
                    }
                    ${day && day.toDateString() === new Date().toDateString()
                      ? 'ring-1 ring-blue-400/50'
                      : ''
                    }
                  `}
                >
                  {day?.getDate()}
                </button>
              ))}
            </div>

            {/* Time Picker */}
            <div className="border-t border-border pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-light" />
                <span className="text-xs text-light">Time</span>
              </div>
              
              <input
                type="time"
                value={timeInput}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-2 py-1.5 bg-background/50 border border-border rounded text-white text-sm focus:border-neon-pink/50 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1 mt-3">
              <button
                type="button"
                onClick={handleToday}
                className="flex-1 px-2 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs hover:bg-blue-500/30 transition-colors"
              >
                Now
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 px-2 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/30 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-2 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs hover:bg-green-500/30 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
