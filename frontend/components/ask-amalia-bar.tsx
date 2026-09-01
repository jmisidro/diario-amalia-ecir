"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, X, Sparkles, Send, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NewsArticle, Subject } from "@/lib/types"

interface AskAmaliaBarProps {
  selectedNews: NewsArticle[]
  selectedSubject: Subject | null
  onClear: () => void
}

const MAX_ARTICLES = 6

export function AskAmaliaBar({ selectedNews, selectedSubject, onClear }: AskAmaliaBarProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [showContext, setShowContext] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isVisible = selectedNews.length > 0 || selectedSubject !== null

  // Focus input when bar becomes visible
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isVisible])

  const contextItems: { id: string; title: string }[] = selectedSubject
    ? (selectedSubject.news_labels || []).map((a) => ({ id: a, title: a }))
    : selectedNews.map((a) => ({ id: a._id || (a as any)._id || a.link, title: a.title }))

  const contextLabel = selectedSubject
    ? `Assunto: "${selectedSubject.label}"`
    : `${selectedNews.length} ${selectedNews.length === 1 ? "notícia selecionada" : "notícias selecionadas"}`

  const handleSend = () => {
    if (!message.trim()) return

    const ids = contextItems.map((i) => i.id)
    const params = new URLSearchParams({
      message: message.trim(),
      articleIds: ids.join(","),
      ...(selectedSubject ? { clusterLabel: selectedSubject.label } : {}),
    })
    router.push(`/chat?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend()
    if (e.key === "Escape") onClear()
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop blur spacer so content isn't hidden behind bar */}
      <div className="h-36 md:h-28 shrink-0" aria-hidden />

      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/20 bg-background/95 shadow-2xl backdrop-blur-md">
        {/* Context pills row */}
        <div className="mx-auto max-w-5xl px-4 pt-3 md:px-6">
          <div className="flex items-center gap-2">
            {/* AMALIA icon + label */}
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-xs font-semibold text-primary">AMALIA</span>
            </div>

            <div className="h-3.5 w-px bg-border" />

            {/* Context summary */}
            <button
              onClick={() => setShowContext((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {contextLabel}
              {showContext ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </button>

            {/* Article count pill */}
            {selectedNews.length > 0 && !selectedSubject && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {selectedNews.length}/{MAX_ARTICLES}
              </span>
            )}

            {/* Clear button */}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onClear}
              aria-label="Limpar seleção"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Expandable context list */}
          {showContext && (
            <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-card p-2">
              {contextItems.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="line-clamp-1">{item.title}</span>
                </li>
              ))}
              {contextItems.length > 6 && (
                <li className="text-xs text-muted-foreground/60 pl-3">
                  +{contextItems.length - 6} mais artigos
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Input row */}
        <div className="mx-auto max-w-5xl px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-2 shadow-inner focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedSubject
                  ? `Pergunta sobre "${selectedSubject.label}"...`
                  : "Escreva a sua pergunta sobre as notícias selecionadas..."
              }
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Button
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-3 text-xs font-semibold transition-all",
                !message.trim() && "opacity-50 cursor-not-allowed"
              )}
              onClick={handleSend}
              disabled={!message.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              Perguntar
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
            Prima Enter para enviar · Esc para cancelar
          </p>
        </div>
      </div>
    </>
  )
}
