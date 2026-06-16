'use client'
import { useState } from 'react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PRESETS, presetToRange, type DatePreset } from '@/lib/utils'

type PresetValue = DatePreset | 'custom'

interface DateRange { from: string; to: string }

interface Props {
  initialPreset?: PresetValue
  onRange: (range: DateRange) => void
}

export function DateRangeControls({ initialPreset = 'last_30d', onRange }: Props) {
  const [preset, setPreset] = useState<PresetValue>(initialPreset)
  const [custom, setCustom] = useState<DateRange>(() => presetToRange('last_30d'))

  function handlePreset(value: PresetValue) {
    setPreset(value)
    if (value !== 'custom') {
      onRange(presetToRange(value as DatePreset))
    } else {
      onRange(custom)
    }
  }

  function handleFrom(value: string) {
    const next = { ...custom, from: value }
    setCustom(next)
    if (preset === 'custom') onRange(next)
  }

  function handleTo(value: string) {
    const next = { ...custom, to: value }
    setCustom(next)
    if (preset === 'custom') onRange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={v => handlePreset(v as PresetValue)}>
        <SelectTrigger className="w-44 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map(p => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={custom.from}
            max={custom.to}
            onChange={e => handleFrom(e.target.value)}
            className="h-8 px-2 text-sm border border-input rounded-md bg-background text-foreground"
          />
          <span className="text-sm text-muted-foreground">→</span>
          <input
            type="date"
            value={custom.to}
            min={custom.from}
            onChange={e => handleTo(e.target.value)}
            className="h-8 px-2 text-sm border border-input rounded-md bg-background text-foreground"
          />
        </div>
      )}
    </div>
  )
}
