"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronDown, ChevronUp, Users, Newspaper, Search, Sparkles, Plus, TrendingUp } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ArticlePreview } from "@/components/article-preview"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/pagination"

import useGetParticipants from "@/app/hooks/useGetParticipants"
import useGetNewsByParticipant from "@/app/hooks/useGetNewsByParticipant"
import type { Participant } from "@/lib/types"

const PARTICIPANTS_PER_PAGE = 10
const INITIAL_ARTICLES_COUNT = 10

const formatCountLabel = (count: number, singular: string, plural: string) => {
  return `${count} ${count === 1 ? singular : plural}`
}

const normalizeId = (id: unknown): string => {
  if (!id) return ""
  if (typeof id === "string") return id
  if (typeof id === "object" && id !== null) {
    const obj = id as Record<string, unknown>
    if (typeof obj.$oid === "string") return obj.$oid
  }
  return String(id)
}

export default function ParticipantesPage() {
  const { participants, loading: participantsLoading } = useGetParticipants()
  const [query, setQuery] = useState("")
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const hasAutoExpanded = useRef(false)
  const listRootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [query])

  useEffect(() => {
    if (listRootRef.current && currentPage > 1) {
      const offset = 80
      const top = listRootRef.current.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: "smooth" })
    }
  }, [currentPage])

  const filteredParticipants = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    const baseList = !normalized
      ? participants
      : participants.filter((person) => {
          return person.name?.toLowerCase().includes(normalized)
        })

    return [...baseList].sort((a, b) => (b.count || 0) - (a.count || 0))
  }, [query, participants])

  const totalPages = Math.ceil(filteredParticipants.length / PARTICIPANTS_PER_PAGE)

  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * PARTICIPANTS_PER_PAGE
    return filteredParticipants.slice(startIndex, startIndex + PARTICIPANTS_PER_PAGE)
  }, [filteredParticipants, currentPage])

  const totalMentions = useMemo(() => {
    return filteredParticipants.reduce((acc, person) => acc + (person.count || 0), 0)
  }, [filteredParticipants])

  useEffect(() => {
    if (paginatedParticipants.length && !hasAutoExpanded.current && !query) {
      const firstId = normalizeId(paginatedParticipants[0]._id)
      if (firstId) {
        setExpandedParticipants(new Set([firstId]))
        hasAutoExpanded.current = true
      }
    }
  }, [paginatedParticipants, query])

  const toggleParticipant = (idStr: string) => {
    setExpandedParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(idStr)) next.delete(idStr)
      else next.add(idStr)
      return next
    })
  }

  if (participantsLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">A carregar participantes...</p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden px-4 py-12 md:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/30" />
          <div className="relative z-10 mx-auto w-full max-w-5xl">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Deteção automática de pessoas nas notícias
              </div>
              <h1 className="font-serif text-3xl font-bold text-foreground md:text-5xl">
                Participantes nas Notícias
              </h1>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Esta página reflete o resultado do pipeline do backend: para cada notícia, o modelo identifica pessoas
                mencionadas no título e na descrição, agrupando os artigos por participante de forma automatizada.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatCard label="Participantes" value={filteredParticipants.length} icon={<Users className="h-4 w-4" />} />
              <StatCard label="Menções acumuladas" value={totalMentions} icon={<Newspaper className="h-4 w-4" />} />
              <StatCard label="Total de notícias vinculadas" value={totalMentions} icon={<TrendingUp className="h-4 w-4" />} />
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card/80 p-3 backdrop-blur-sm md:p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar participante..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </section>

        <section ref={listRootRef} className="mx-auto w-full max-w-5xl px-4 pb-10 md:px-6 md:pb-14">
          {filteredParticipants.length === 0 ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="p-8 text-center">
                <p className="text-base font-semibold text-foreground">Sem resultados para esta pesquisa.</p>
                <p className="mt-1 text-sm text-muted-foreground">Tente limpar os termos ou escreva outro termo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2 px-1">
                <p className="text-xs font-medium text-muted-foreground">
                  A mostrar {paginatedParticipants.length} de {filteredParticipants.length} participantes
                </p>
                {totalPages > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                )}
              </div>

              {paginatedParticipants.map((person) => {
                const idStr = normalizeId(person._id)
                return (
                  <ParticipantSection
                    key={idStr}
                    participantId={idStr}
                    participant={person}
                    isExpanded={expandedParticipants.has(idStr)}
                    onToggle={() => toggleParticipant(idStr)}
                  />
                )
              })}

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function ParticipantSection({
  participantId,
  participant,
  isExpanded,
  onToggle,
}: {
  participantId: string
  participant: Participant
  isExpanded: boolean
  onToggle: () => void
}) {
  const { results: articles, loading, fetchByParticipant } = useGetNewsByParticipant()

  const [visibleCount, setVisibleCount] = useState(INITIAL_ARTICLES_COUNT)

  useEffect(() => {
    if (!isExpanded) {
      setVisibleCount(INITIAL_ARTICLES_COUNT)
    }
  }, [isExpanded])

  useEffect(() => {
    if (isExpanded && articles.length === 0) {
      fetchByParticipant(participantId)
    }
  }, [isExpanded, participantId, fetchByParticipant, articles.length])

  const displayArticles = useMemo(() => {
    return articles.slice(0, visibleCount)
  }, [articles, visibleCount])

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + INITIAL_ARTICLES_COUNT)
  }

  const hasMoreArticles = articles.length > visibleCount

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-secondary/30 md:p-6"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-xl font-bold text-foreground md:text-2xl">{participant.name}</h2>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Newspaper className="h-3.5 w-3.5" />
            {formatCountLabel(participant.count || 0, "menção identificada", "menções acumuladas")}
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-muted/30 px-5 py-5 md:px-6">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">A carregar notícias...</p>
          ) : articles.length > 0 ? (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                {displayArticles.map((article, idx) => (
                  <ArticlePreview key={article._id || article.link || idx} article={article} />
                ))}
              </div>

              <div className="flex flex-col items-center justify-center gap-2 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground font-medium">
                  A mostrar {displayArticles.length} de {articles.length} notícias encontradas.
                </p>

                {hasMoreArticles && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowMore}
                    className="mt-1 gap-1 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors bg-transparent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ver mais {INITIAL_ARTICLES_COUNT} notícias
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma notícia encontrada para este participante.</p>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">{icon}</div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
