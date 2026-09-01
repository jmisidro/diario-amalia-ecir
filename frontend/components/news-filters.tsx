"use client"

import { Calendar, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { useState, useEffect } from "react"

import useGetTopics from "@/app/hooks/useGetTopics"
import useGetSources from "@/app/hooks/useGetSources"

import { toLocalDateString } from '@/lib/utils'

interface NewsFiltersProps {
  selectedDate: Date
  selectedTopic: string
  selectedSource: string
  onDateChange: (date: Date) => void
  onTopicChange: (topic: string) => void
  onSourceChange: (source: string) => void
  sortBy: 'date' | 'importance'
  onSortChange: (sort: 'date' | 'importance') => void
}

export function NewsFilters({
  selectedDate,
  selectedTopic,
  selectedSource,
  onDateChange,
  onTopicChange,
  onSourceChange,
  sortBy,
  onSortChange,
}: NewsFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Track mounting phase
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const { topics: allTopics = [] } = useGetTopics()
  const { sources: allSources = [] } = useGetSources()

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate)
    prev.setDate(prev.getDate() - 1)
    onDateChange(prev)
  }

  const goToNextDay = () => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + 1)
    if (toLocalDateString(next) <= toLocalDateString(new Date())) {
      onDateChange(next)
    }
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })

  const today = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(today.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 bg-transparent"
          onClick={goToPreviousDay}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="capitalize">
                {isMounted ? formattedDate : "A carregar data..."}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date)
                  setCalendarOpen(false)
                }
              }}
              disabled={{ after: today }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 bg-transparent"
          onClick={goToNextDay}
          disabled={isToday}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-primary"
            onClick={() => onDateChange(new Date())}
          >
            Hoje
          </Button>
        )}
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Topic Select */}
        <Select value={selectedTopic} onValueChange={onTopicChange}>
          <SelectTrigger className="h-9 w-[150px] bg-transparent text-sm">
            <SelectValue placeholder="Tópico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tópicos</SelectItem>
            {allTopics.map((topic) => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Select */}
        <Select value={selectedSource} onValueChange={onSourceChange}>
          <SelectTrigger className="h-9 w-[150px] bg-transparent text-sm">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fontes</SelectItem>
            {allSources.map((source) => (
              <SelectItem key={source} value={source}>{source}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Select */}
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as 'date' | 'importance')}
        >
          <SelectTrigger className="h-9 w-[160px] bg-transparent text-sm border-primary/20">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Ordenar por" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Mais recentes</SelectItem>
            <SelectItem value="importance">Importância</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
