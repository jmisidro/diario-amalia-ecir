"use client"

import React, { useState } from "react"
import Image from "next/image"
import { ExternalLink, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, useSourceLogo } from "@/lib/utils"
import { SOURCE_LOGO_SCALE } from "@/lib/constants"
import type { ChatReference } from "@/lib/types"

interface ReferenceCardProps {
  reference: ChatReference
  index: number
}



export function ReferenceCard({ reference, index }: ReferenceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const logoUrl = useSourceLogo(reference.source)

  return (
    <div className="group rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm">
      {/* Collapsed view - minimal info */}
      <div className="flex items-start gap-3">
        {/* Reference number badge */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {reference.title}
          </h4>

          {/* Source and relevance */}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{reference.source}</span>
            {logoUrl && (
              <Image
                src={logoUrl}
                alt={`Logo ${reference.source}`}
                width={12}
                height={12}
                className="h-5 w-auto object-contain object-right"
                style={{
                  transform: `scale(${SOURCE_LOGO_SCALE[reference.source] ?? 1})`,
                  transformOrigin: 'right center'
                }}
                unoptimized
              />
            )}
          </div>

          {/* Expand/collapse button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Ocultar resumo
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Ver resumo completo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded view - full summary */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "mt-3 max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="rounded-lg bg-secondary/50 p-3">
          {/* Topics */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {reference.topics.map((topic) => (
              <span
                key={topic}
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                )}
              >
                {topic}
              </span>
            ))}
          </div>

          {/* Full summary */}
          <p className="text-xs leading-relaxed text-foreground/80">
            {reference.summary}
          </p>

          {/* Timestamp */}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Publicado:{" "}
            {new Date(reference.publishedAt).toLocaleString("pt-PT", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* View original article button */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3 w-full gap-1.5 text-xs"
          >
            <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Ver artigo original
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

// Empty state for when no references are available
export function ReferencesSidebarEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <FileText className="h-6 w-6 text-primary/60" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground/80">Sem referências</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          As fontes utilizadas pelo AMALIA aparecerão aqui.
        </p>
      </div>
    </div>
  )
}
