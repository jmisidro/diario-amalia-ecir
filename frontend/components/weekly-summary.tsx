import { useState } from "react"
import { Calendar, Sparkles, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

import { formatCountLabel } from '@/lib/utils'

export function WeeklySummaryCard({
  summary: rawSummary,
  weekStart,
  weekEnd,
  themeCount,
  articleCount,
}: {
  summary: any
  weekStart: string
  weekEnd: string
  themeCount: number
  articleCount: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const previewLength = 400

  let summaryText = ""

  if (rawSummary && typeof rawSummary === "object") {
    summaryText = rawSummary.summary || "";
  } else if (typeof rawSummary === "string") {
    summaryText = rawSummary;
  }

  summaryText = typeof summaryText === "string" ? summaryText : "";

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }
    return `${startDate.toLocaleDateString("pt-PT", options)} - ${endDate.toLocaleDateString("pt-PT", options)}, ${endDate.getFullYear()}`
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-primary/10 shadow-lg">
      <div className="flex items-start gap-4 border-b border-primary/20 bg-primary/5 p-5 md:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 md:h-14 md:w-14">
          <Sparkles className="h-6 w-6 text-primary md:h-7 md:w-7" />
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl font-bold text-foreground md:text-2xl">Resumo da Semana</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerado automaticamente pelo AMALIA, com base em {formatCountLabel(themeCount, "tema", "temas")} e{" "}
            {formatCountLabel(articleCount, "assunto", "assuntos")}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateRange(weekStart, weekEnd)}
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="prose prose-sm max-w-none text-muted-foreground">
          {isExpanded ? (
            summaryText.split("\n\n").map((paragraph, idx) => (
              <p key={idx} className="mb-3 leading-relaxed last:mb-0">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="leading-relaxed">
              {summaryText.slice(0, previewLength)}
              {summaryText.length > previewLength && "..."}
            </p>
          )}
        </div>

        {summaryText.length > previewLength && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Ler menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Ler mais
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
