"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, Calendar, Newspaper, ExternalLink } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { WeeklySummaryCard } from '@/components/weekly-summary'
import { ArticlePreview } from "@/components/article-preview"
import { Button } from "@/components/ui/button"
import type { Theme, Subject } from "@/lib/types"
import Image from "next/image"

import useGetWeeklyThemes from "@/app/hooks/useGetWeeklyThemes"
import useGetWeeklySummary from "@/app/hooks/useGetWeeklySummary"
import useGetNewsBySubject from "@/app/hooks/useGetNewsBySubject"

import { formatCountLabel } from '@/lib/utils'

// Week (Monday to Sunday) on the frontend
const getFrontendWeekMonday = (): { start: string; end: string } => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = todayStart.getDay() // 0: Sun, 1: Mon, ..., 6: Sat

  // If today is Sunday (0), shift back 6 days. Otherwise, shift back to Monday.
  const diffToMonday = day === 0 ? -6 : 1 - day
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() + diffToMonday)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // Sunday night boundary

  return {
    start: weekStart.toISOString(),
    end: weekEnd.toISOString()
  }
}

// Normalizes a subject_id value to a plain string
const normalizeId = (id: unknown): string => {
  if (!id) return ""
  if (typeof id === "string") return id
  if (typeof id === "object" && id !== null) {
    const obj = id as Record<string, unknown>
    if (typeof obj.$oid === "string") return obj.$oid
  }
  return String(id)
}

// Given a theme and the full flat subjects array, returns only the subjects
// that belong to this theme — deduplicated by _id so duplicate keys never occur.
const getThemeSubjects = (theme: Theme, subjects: Subject[]): Subject[] => {
  const subjectIdStrings = new Set(theme.subject_ids.map(normalizeId))
  const seen = new Set<string>()

  return subjects.filter((s) => {
    const idStr = normalizeId(s._id)
    if (!subjectIdStrings.has(idStr) || seen.has(idStr)) return false
    seen.add(idStr)
    return true
  })
}

export default function TemasPage() {
  const { themesData, loading: themesLoading } = useGetWeeklyThemes()
  const { summary: weeklySummary, loading: summaryLoading } = useGetWeeklySummary()

  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set())
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  // Auto-expansion only fires once when data loads
  const hasAutoExpanded = useRef(false)

  // 🛠️ Calculate exact client-side Monday and Sunday date anchors
  const { start: calculatedMondayStart, end: calculatedMondayEnd } = getFrontendWeekMonday()

  // Expand the first (largest) theme automatically ONLY on initial load
  useEffect(() => {
    if (themesData?.themes.length && !hasAutoExpanded.current) {
      const ordered = [...themesData.themes].sort((a, b) => b.count - a.count)
      setExpandedThemes(new Set([normalizeId(ordered[0]._id)]))
      hasAutoExpanded.current = true
    }
  }, [themesData])

  if (themesLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">A carregar temas da semana...</p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!themesData) return null

  const { themes, subjects } = themesData
  const sortedThemes = [...themes].sort((a, b) => b.count - a.count)

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }
    return `${startDate.toLocaleDateString("pt-PT", options)} - ${endDate.toLocaleDateString("pt-PT", options)}, ${endDate.getFullYear()}`
  }

  const toggleTheme = (themeId: string) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev)
      if (next.has(themeId)) next.delete(themeId)
      else next.add(themeId)
      return next
    })
  }

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(subjectId)) next.delete(subjectId)
      else next.add(subjectId)
      return next
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative overflow-hidden px-4 py-12 md:py-16">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-bg.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <h1 className="text-balance font-serif text-3xl font-bold leading-tight text-white drop-shadow-lg md:text-4xl lg:text-5xl">
              Temas da Semana
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-base text-white/90 drop-shadow-md md:text-lg">
              Explora os principais temas que marcaram a atualidade portuguesa
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Calendar className="h-4 w-4" />
              {/* 🛠️ Prints the forced Monday range text layout here */}
              {formatDateRange(calculatedMondayStart, calculatedMondayEnd)}
            </div>
          </div>
        </section>

        {/* Weekly Summary */}
        <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
          {summaryLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">A carregar resumo...</div>
          ) : weeklySummary && sortedThemes.length > 0 ? (
            <WeeklySummaryCard
              summary={weeklySummary}
              /* 🛠️ Feeds clean client-computed timestamps down into the card layout */
              weekStart={calculatedMondayStart}
              weekEnd={calculatedMondayEnd}
              themeCount={sortedThemes.length}
              articleCount={sortedThemes.reduce((sum, t) => sum + t.count, 0)}
            />
          ) : null}
        </section>

        {/* Themes list */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-8 md:px-6 md:pb-12">
          <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">Temas em Destaque</h2>
          {sortedThemes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
              <p className="text-base font-medium text-foreground">Neste momento, não há temas disponíveis.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Volta a tentar dentro de alguns minutos, após o próximo ciclo de atualização.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedThemes.map((theme, index) => {
                const themeSubjects = getThemeSubjects(theme, subjects)
                const themeIdStr = normalizeId(theme._id)

                return (
                  <ThemeCard
                    key={themeIdStr}
                    theme={theme}
                    themeSubjects={themeSubjects}
                    index={index}
                    isExpanded={expandedThemes.has(themeIdStr)}
                    onToggle={() => toggleTheme(themeIdStr)}
                    expandedSubjects={expandedSubjects}
                    onToggleSubject={toggleSubject}
                  />
                )
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}


function ThemeCard({
  theme,
  themeSubjects,
  index,
  isExpanded,
  onToggle,
  expandedSubjects,
  onToggleSubject,
}: {
  theme: Theme
  themeSubjects: Subject[]
  index: number
  isExpanded: boolean
  onToggle: () => void
  expandedSubjects: Set<string>
  onToggleSubject: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-secondary/30 md:p-6"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-serif text-xl font-bold text-primary md:h-12 md:w-12">
          {index + 1}
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl font-bold text-foreground md:text-2xl">{theme.label}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Newspaper className="h-4 w-4" />
              {formatCountLabel(theme.count, "notícia", "notícias")}
            </span>
            <span>•</span>
            <span>{formatCountLabel(themeSubjects.length, "assunto", "assuntos")}</span>
          </div>
        </div>
        <div className="shrink-0 pt-1">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Optional theme summary */}
          {(theme as any).summary && (
            <div className="bg-secondary/20 px-5 py-4 md:px-6">
              <p className="text-pretty leading-relaxed text-muted-foreground">{(theme as any).summary}</p>
            </div>
          )}

          <div className="flex flex-col divide-y divide-border">
            {themeSubjects.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">Nenhum assunto encontrado para este tema.</p>
            ) : (
              themeSubjects.map((subject) => {
                const subjectIdStr = normalizeId(subject._id)
                return (
                  <SubjectSection
                    key={subjectIdStr}
                    subjectId={subjectIdStr}
                    subjectLabel={subject.label}
                    isExpanded={expandedSubjects.has(subjectIdStr)}
                    onToggle={() => onToggleSubject(subjectIdStr)}
                  />
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SubjectSection({
  subjectId,
  subjectLabel,
  isExpanded,
  onToggle,
}: {
  subjectId: string
  subjectLabel: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const { results: articles, loading, fetchBySubject } = useGetNewsBySubject()

  useEffect(() => {
    if (isExpanded && articles.length === 0) {
      fetchBySubject(subjectId)
    }
  }, [isExpanded, subjectId, fetchBySubject, articles.length])

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/30 md:px-6"
      >
        <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{subjectLabel}</h3>
        </div>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="bg-muted/30 px-5 pb-4 md:px-6">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">A carregar notícias...</p>
          ) : articles.length > 0 ? (
            <div className="flex flex-col gap-3">
              {articles.map((article, idx) => (
                <ArticlePreview key={article._id || article.link || idx} article={article} />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma notícia encontrada.</p>
          )}
        </div>
      )}
    </div>
  )
}
