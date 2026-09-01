"use client"

import { useState } from "react"
import { ExternalLink, Clock, ChevronDown, ChevronUp, User, CheckCircle2 } from "lucide-react"
import type { NewsArticle } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SOURCE_LOGO_SCALE } from "@/lib/constants"
import { calculateDate, useSourceLogo, cn } from "@/lib/utils"
import { MAX_INDEX } from "@lib/constants";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NewsCardProps {
  article: NewsArticle;
  debugMode?: boolean;
  isSelectable?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
}

const SUMMARY_PREVIEW_LENGTH = 160

function getIndexClasses(classification: string | undefined) {
  switch (classification) {
    case 'ALTO':  return 'text-green-500 bg-green-500/10'
    case 'MÉDIO': return 'text-yellow-500 bg-yellow-500/10'
    case 'BAIXO': return 'text-red-500 bg-red-500/10'
    default:      return 'text-muted-foreground bg-muted'
  }
}

export function NewsCard({ article, debugMode, isSelectable = false, isSelected = false, onSelect }: NewsCardProps) {

  const isLong = article.summary.length > SUMMARY_PREVIEW_LENGTH;
  const [expanded, setExpanded] = useState(false);

  const logoSrc = useSourceLogo(article.site_name);
  const [logoError, setLogoError] = useState(false);

  const score = (article as any).score;

  const displayTime = calculateDate(article.date || (article as any).date);

  const handleLogoError = () => {
    console.error(`[Logo Error] Failed to load logo for: "${article.site_name}". Check if the file exists in /public${logoSrc}`);
    setLogoError(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isSelectable || !onSelect) return
    // Don't trigger selection when clicking links or buttons
    const target = e.target as HTMLElement
    if (target.closest("a") || target.closest("button")) return
    onSelect(article._id || (article as any)._id || article.link)
  }

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg",
        isSelectable && "cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary/40 shadow-lg"
          : isSelectable
            ? "border-border hover:border-primary/50"
            : "border-border hover:border-primary/30"
      )}
    >
      {/* Selection indicator */}
      {isSelectable && (
        <div className={cn(
          "flex items-center gap-2 px-4 pt-3 pb-0 text-xs font-semibold transition-colors",
          isSelected ? "text-primary" : "text-muted-foreground/50"
        )}>
          <CheckCircle2 className={cn("h-4 w-4 transition-colors", isSelected ? "text-primary" : "text-muted-foreground/30")} />
          {isSelected ? "Selecionado" : "Cliqua para selecionar"}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {/* Top row: score + time */}
        <div className="mb-3 flex items-center justify-between">
          {score ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums flex items-center gap-1 ${getIndexClasses(score.classification)}`}
              >
                {Math.round((score.index / MAX_INDEX) * 100)}%
              </span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    Classificação da importância da notícia pelo AMALIA com base em diversos fatores como relevância, novidade, notoriedade, negatividade, atualidade e proximidade.
                    Quanto maior a percentagem, maior a importância da notícia.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {displayTime}
          </span>
        </div>

        {/* Topic badges row */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {article.topics
            // Order by rank (1º, 2º, 3º)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0))
            .map((topicObj) => (
              <Badge
                key={topicObj.name}
                variant="secondary"
                className="border-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-secondary/50 text-muted-foreground"
              >
                {topicObj.name}
              </Badge>
            ))}
        </div>

        {/* Title */}
        <h3 className="mb-2 font-serif text-base font-bold leading-snug text-foreground md:text-lg">
          {article.title}
        </h3>

        {/* Summary with "Ler mais" */}
        <div className="mb-4 flex-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {expanded || !isLong
              ? article.summary
              : `${article.summary.slice(0, SUMMARY_PREVIEW_LENGTH)}...`}
          </p>
          {isLong && (
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0 text-xs font-semibold text-primary"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Ler menos <ChevronUp className="ml-0.5 h-3 w-3" />
                </>
              ) : (
                <>
                  Ler mais <ChevronDown className="ml-0.5 h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>

        {debugMode && article.score && (
          <div className="mt-4 border-t border-dashed border-primary/30 pt-3 text-[10px] font-mono bg-muted/50 p-2 rounded-lg">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <p>Relevance: <span className="text-primary">{article.score.relevance}/5</span></p>
              <p>Novelty: <span className="text-primary">{article.score.novelty}/5</span></p>
              <p>Notoriety: <span className="text-primary">{article.score.notoriety}/5</span></p>
              <p>Negativity: <span className="text-primary">{article.score.negativity}/5</span></p>
              <p>Actuality: <span className="text-primary">{article.score.actuality}/5</span></p>
              <p>Proximity: <span className="text-primary">{article.score.proximity}/5</span></p>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-primary/10 pt-2">
              <p className="font-bold">Index: {article.score.index}</p>
              <span className={`px-1 rounded ${
                article.score.classification === 'ALTO' ? 'bg-green-100 text-green-700' :
                article.score.classification === 'MÉDIO' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {article.score.classification}
              </span>
            </div>

            {article.score.justification && (
              <p className="mt-2 italic leading-tight text-muted-foreground border-l-2 border-primary/20 pl-2">
                "{article.score.justification}"
              </p>
            )}
          </div>
        )}

        {/* Footer: author + source + button */}
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            {/* Author */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="font-medium">{article.author}</span>
            </div>
            {/* Logos and site names */}
            <div className="shrink-0 flex items-center h-8">
              {logoSrc && !logoError ? (
                <img
                  src={logoSrc}
                  alt={article.site_name}
                  style={{
                    transform: `scale(${SOURCE_LOGO_SCALE[article.site_name] ?? 1})`,
                    transformOrigin: 'right center'
                  }}
                  className="h-6 w-auto object-contain object-right"
                  onError={handleLogoError}
                />
              ) : (
                /* Fallback if logo is missing */
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {article.site_name?.charAt(0)}
                  </div>
                  <span className="text-sm font-bold">{article.site_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ver artigo original button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs font-semibold bg-transparent"
          >
            <a href={article.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Ver artigo original
            </a>
          </Button>
        </div>
      </div>
    </article>
  )
}
