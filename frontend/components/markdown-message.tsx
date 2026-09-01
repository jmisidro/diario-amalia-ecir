"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import type { MarkdownMessageProps, CitationChipProps } from "@/lib/types"
import { normalise, transformChildren } from "@/lib/utils"

/**
 * Renders an LLM response as styled Markdown.
 *
 * The Python API injects source attribution in two forms:
 *   [1] Title  – numeric citation marker at the start of a line/paragraph
 *   (Fonte: Title, date) – inline citation at end of bullet
 *
 * Both forms are post-processed into small superscript citation chips that
 * invoke `onCitationClick` with the 0-based index of the matching sidebar card.
 */
export function MarkdownMessage({ content, references, onCitationClick }: MarkdownMessageProps) {
  // Pre-process: replace "(Fonte: Title, date)" with a sentinel we can target
  // after react-markdown renders. Instead, we transform them BEFORE rendering
  // so react-markdown treats them as custom inline elements via a remark plugin.
  // Simpler approach: replace (Fonte: ...) markers with a unique bracket syntax
  // that we map in the custom renderer.

  // Build a lookup: normalised title → 0-based index
  const titleToIndex = React.useMemo(() => {
    const map = new Map<string, number>()
    references.forEach((ref, i) => {
      map.set(normalise(ref.title), i)
    })
    return map
  }, [references])

  // Replace LLM citation markers → "[[FONTE:i]]" sentinels (processed in priority order)
  const processedContent = React.useMemo(() => {
    let text = content

    // Pattern 1 (most common): (Fonte: [N]) — e.g. "(Fonte: [1])" or "(Fonte:[3])"
    text = text.replace(/\(Fonte:\s*\[(\d+)\]\s*\)/gi, (_, num) => {
      const idx = parseInt(num, 10) - 1
      if (idx >= 0 && idx < references.length) return `[[FONTE:${idx}]]`
      return `(Fonte: [${num}])`
    })

    // Pattern 2: standalone [N] — bare numeric marker not already converted
    // Only match when surrounded by non-bracket chars to avoid false positives
    text = text.replace(/(?<!\[)\[(\d+)\](?!\])/g, (match, num) => {
      const idx = parseInt(num, 10) - 1
      if (idx >= 0 && idx < references.length) return `[[FONTE:${idx}]]`
      return match
    })

    // Pattern 3 (fallback): (Fonte: Title, date) — title-based lookup
    text = text.replace(/\(Fonte:\s*([^,)\[\]]+?)(?:\s*,\s*[^)]+)?\)/gi, (_, rawTitle) => {
      const idx = titleToIndex.get(normalise(rawTitle.trim()))
      if (idx !== undefined) return `[[FONTE:${idx}]]`
      return `(Fonte: ${rawTitle})`
    })

    return text
  }, [content, references, titleToIndex])

  return (
    <div className="markdown-body text-sm leading-relaxed text-card-foreground">
      <ReactMarkdown
        components={{
          // Paragraphs — inline citation chips are inside here
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">
              {transformChildren(children, (idx, key) => (
                <CitationChip key={key} index={idx} onClick={() => onCitationClick?.(idx)} />
              ))}
            </p>
          ),
          // Unordered lists
          ul: ({ children }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>
          ),
          // Ordered lists
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-snug">
              {transformChildren(children, (idx, key) => (
                <CitationChip key={key} index={idx} onClick={() => onCitationClick?.(idx)} />
              ))}
            </li>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Italic
          em: ({ children }) => <em className="italic">{children}</em>,
          // Headings (LLM rarely uses these but just in case)
          h1: ({ children }) => (
            <h1 className="mb-1 font-serif text-base font-bold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 font-serif text-sm font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 text-sm font-semibold">{children}</h3>
          ),
          // Inline code
          code: ({ children }) => (
            <code className="rounded bg-secondary/60 px-1 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

// ── Citation Chip ─────────────────────────────────────────────────────────────

function CitationChip({ index, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Ver fonte ${index + 1}`}
      className="mx-0.5 inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded bg-primary/15 px-1 align-baseline text-[9px] font-bold text-primary transition-colors hover:bg-primary/30 focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {index + 1}
    </button>
  )
}
