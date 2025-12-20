import React from 'react'

type Option<T extends string> = {
  label: string
  value: T
}

type FilterChipsProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
}

export function FilterChips<T extends string>({ value, onChange, options }: FilterChipsProps<T>) {
  return (
    <div className='flex gap-2 overflow-x-auto no-scrollbar pb-0.5 px-1'>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors active:scale-95 flat-chip ${
              isActive ? 'is-active' : ''
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
