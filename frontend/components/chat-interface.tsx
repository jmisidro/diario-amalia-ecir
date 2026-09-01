"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  Send,
  Sparkles,
  User,
  Loader2,
  ArrowLeft,
  FileText,
  PanelRightOpen,
  PanelRightClose,
  Menu,
  Newspaper,
  X,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { SUGGESTIONS } from "@/lib/constants"
import type { ChatMessage } from "@/lib/types"
import { ReferenceCard, ReferencesSidebarEmpty } from "@/components/reference-card"
import { MarkdownMessage } from "@/components/markdown-message"
import { useChatStorage } from "@/hooks/use-chat-storage"
import {
  ChatSessionsSidebar,
  ChatSessionsToggle,
} from "@/components/chat-sessions-sidebar"
import useSendMessage from "@/app/hooks/useSendMessage"

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! Sou o AMALIA, o modelo de linguagem para português europeu. Posso ajudá-lo a explorar e compreender as notícias do dia. O que gostaria de saber?",
  timestamp: new Date().toISOString(),
  references: [],
}

export function ChatInterface() {
  const searchParams = useSearchParams()
  const [input, setInput] = useState("")
  const [isReferencesSidebarOpen, setIsReferencesSidebarOpen] = useState(false)
  const [isSessionsSidebarOpen, setIsSessionsSidebarOpen] = useState(true)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [highlightedRefIndex, setHighlightedRefIndex] = useState<number | null>(null)
  const [mobileRefsSheetOpen, setMobileRefsSheetOpen] = useState(false)
  const [mobileSessionsSheetOpen, setMobileSessionsSheetOpen] = useState(false)
  const [contextNewsIds, setContextNewsIds] = useState<string[]>([])
  const [contextSubjectLabel, setContextSubjectLabel] = useState<string | null>(null)
  const contextSeededRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const refCardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Chat storage hook for persistence
  const {
    sessions,
    currentSession,
    currentSessionId,
    isLoaded,
    createSession,
    updateSessionMessages,
    renameSession,
    deleteSession,
    selectSession,
  } = useChatStorage()

  // Get current messages from the session
  const messages = currentSession?.messages || []

  // Create initial session if none exists
  useEffect(() => {
    if (isLoaded && sessions.length === 0) {
      createSession()
    }
  }, [isLoaded, sessions.length, createSession])

  // Read URL params and pre-fill input + context on first load
  useEffect(() => {
    if (!isLoaded || contextSeededRef.current) return
    const urlMessage = searchParams.get("message")
    const urlNewsIds = searchParams.get("articleIds") || searchParams.get("newsIds")
    const urlSubjectLabel = searchParams.get("clusterLabel") || searchParams.get("subjectLabel")

    const hasContext = urlNewsIds || urlSubjectLabel || urlMessage

    if (hasContext && currentSession) {
      if (currentSession.messages.length > 0) {
        const newSession = createSession()
        if (urlSubjectLabel) {
          renameSession(newSession.id, `Assunto: ${urlSubjectLabel}`)
        } else if (urlNewsIds) {
          renameSession(newSession.id, `Contexto Selecionado`)
        }
      } else {
        if (urlSubjectLabel) {
          renameSession(currentSession.id, `Assunto: ${urlSubjectLabel}`)
        } else if (urlNewsIds) {
          renameSession(currentSession.id, `Contexto Selecionado`)
        }
      }
    }

    if (urlNewsIds) {
      const ids = urlNewsIds.split(",").filter(Boolean)
      setContextNewsIds(ids)
    }
    if (urlSubjectLabel) {
      setContextSubjectLabel(urlSubjectLabel)
    }
    if (urlMessage) {
      setInput(urlMessage)
      // Auto-send after a short delay so the session is ready
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    }
    contextSeededRef.current = true
  }, [isLoaded, searchParams, currentSession, createSession, renameSession])

  // Wire up the send-message hook with the storage layer
  const { loading: isLoading, sendMessage: sendMessageToApi } = useSendMessage({
    sessionId: currentSessionId,
    messages,
    ...(contextNewsIds.length > 0 ? { news_ids: contextNewsIds } : {}),
    ...(contextSubjectLabel ? { subject_label: contextSubjectLabel } : {}),
    onMessagesUpdate: (updated) => {
      if (currentSessionId) updateSessionMessages(currentSessionId, updated)
    },
    onAssistantReply: (msg) => {
      if (msg.references?.length) setSelectedMessageId(msg.id)
      inputRef.current?.focus()
    },
  })

  const sendMessage = (content: string) => {
    if (!content.trim() || isLoading) return
    setInput("")
    sendMessageToApi(content)
  }

  // Get references for the selected message, or the last assistant message with references
  const currentReferences = React.useMemo(() => {
    if (selectedMessageId) {
      const msg = messages.find((m: ChatMessage) => m.id === selectedMessageId)
      return msg?.references || []
    }
    // Find the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i].references || []
      }
    }
    return []
  }, [messages, selectedMessageId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleCitationClick = (messageId: string, refIndex: number) => {
    setSelectedMessageId(messageId)
    setHighlightedRefIndex(refIndex)
    setIsReferencesSidebarOpen(true)
    if (window.innerWidth < 1024) setMobileRefsSheetOpen(true)
    // Scroll the ref card into view after a short paint delay
    setTimeout(() => {
      refCardRefs.current[refIndex]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 120)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleNewSession = () => {
    if (isLoading) return
    createSession()
    setSelectedMessageId(null)
    setMobileSessionsSheetOpen(false)
    setContextNewsIds([])
    setContextSubjectLabel(null)
  }

  const handleSelectSession = (sessionId: string) => {
    if (isLoading) return
    selectSession(sessionId)
    setSelectedMessageId(null)
    setMobileSessionsSheetOpen(false)
    setContextNewsIds([])
    setContextSubjectLabel(null)
  }

  // Sidebar content for references (reused for desktop and mobile)
  const ReferencesSidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Referências</h2>
          {currentReferences.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {currentReferences.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 lg:flex"
          onClick={() => setIsReferencesSidebarOpen(false)}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {currentReferences.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              O AMALIA utilizou estas {currentReferences.length} fontes para gerar a resposta:
            </p>
            {currentReferences.map((ref, index) => (
              <div
                key={ref.id}
                ref={(el) => { refCardRefs.current[index] = el }}
                className={cn(
                  "rounded-xl transition-all duration-300",
                  highlightedRefIndex === index
                    ? "ring-2 ring-primary ring-offset-1"
                    : ""
                )}
              >
                <ReferenceCard reference={ref} index={index} />
              </div>
            ))}
          </div>
        ) : (
          <ReferencesSidebarEmpty />
        )}
      </div>
    </div>
  )

  // Show loading state while storage is being loaded
  if (!isLoaded) {
    return (
      <div className="flex h-[calc(100vh-65px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Desktop sessions sidebar */}
      <div className="hidden lg:block">
        <ChatSessionsSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          isOpen={isSessionsSidebarOpen}
          onToggle={() => setIsSessionsSidebarOpen(false)}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          disabled={isLoading}
        />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Left section: back button + sidebar controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                asChild
              >
                <Link href="/" aria-label="Voltar às notícias">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>

              {/* Mobile sessions menu */}
              <Sheet
                open={mobileSessionsSheetOpen}
                onOpenChange={setMobileSessionsSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 lg:hidden"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Conversas</SheetTitle>
                  </SheetHeader>
                  <ChatSessionsSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    isOpen={true}
                    onToggle={() => setMobileSessionsSheetOpen(false)}
                    onSelectSession={handleSelectSession}
                    onNewSession={handleNewSession}
                    onDeleteSession={deleteSession}
                    onRenameSession={renameSession}
                    disabled={isLoading}
                  />
                </SheetContent>
              </Sheet>

              {/* Desktop back button */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 shrink-0 lg:flex"
                asChild
              >
                <Link href="/" aria-label="Voltar às notícias">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>

              {/* Desktop sessions toggle (when sidebar is closed) */}
              {!isSessionsSidebarOpen && (
                <div className="hidden lg:block">
                  <ChatSessionsToggle
                    onClick={() => setIsSessionsSidebarOpen(true)}
                  />
                </div>
              )}
            </div>

            {/* Center section: logo and title */}
            <div className="flex items-center gap-2.5">
              <img
                src="/symbol-black.svg"
                alt=""
                className="h-5 w-auto object-contain block dark:hidden md:h-6 lg:h-7"
              />
              <img
                src="/symbol-white.svg"
                alt=""
                className="h-5 w-auto object-contain hidden dark:block md:h-6 lg:h-7"
              />
              <div>
                <h1 className="font-serif text-base font-bold text-foreground">
                  Pergunta ao AMALIA
                </h1>
                <p className="text-xs text-muted-foreground">
                  Modelo de linguagem para português europeu
                </p>
              </div>
            </div>

            {/* Right section: references */}
            <div className="flex items-center gap-2">
              {/* Mobile references sheet trigger */}
              <Sheet open={mobileRefsSheetOpen} onOpenChange={setMobileRefsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Referências</span>
                    {currentReferences.length > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {currentReferences.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full p-0 sm:max-w-md">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Referências utilizadas pelo AMALIA</SheetTitle>
                  </SheetHeader>
                  <ReferencesSidebarContent />
                </SheetContent>
              </Sheet>

              {/* Desktop references sidebar toggle */}
              {!isReferencesSidebarOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden gap-1.5 lg:flex"
                  onClick={() => setIsReferencesSidebarOpen(true)}
                >
                  <PanelRightOpen className="h-4 w-4" />
                  Referências
                  {currentReferences.length > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {currentReferences.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {[WELCOME_MESSAGE, ...messages].map((message: ChatMessage) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "assistant" ? "bg-primary" : "bg-secondary"
                  )}
                >
                  {message.role === "assistant" ? (
                    <img
                      src="/symbol-white.svg"
                      alt="AMALIA"
                      className="h-4 w-4 text-primary-foreground"
                    />
                  ) : (
                    <User className="h-4 w-4 text-secondary-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.role === "assistant"
                      ? "rounded-tl-md border border-border bg-card text-card-foreground"
                      : "rounded-tr-md bg-primary text-primary-foreground"
                  )}
                >
                  {/* Message content */}
                  {message.role === "assistant" ? (
                    <MarkdownMessage
                      content={message.content}
                      references={message.references || []}
                      onCitationClick={(refIdx) => handleCitationClick(message.id, refIdx)}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}

                  {/* Reference indicator for assistant messages */}
                  {message.role === "assistant" &&
                    message.references &&
                    message.references.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMessageId(message.id)
                          setHighlightedRefIndex(null)
                          if (window.innerWidth < 1024) {
                            setMobileRefsSheetOpen(true)
                          }
                        }}
                        className={cn(
                          "mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                          selectedMessageId === message.id
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        <FileText className="h-3 w-3" />
                        {message.references.length}{" "}
                        {message.references.length === 1 ? "fonte" : "fontes"}{" "}
                        utilizadas
                      </button>
                    )}

                  <p
                    className={cn(
                      "mt-1.5 text-[10px]",
                      message.role === "assistant"
                        ? "text-muted-foreground"
                        : "text-primary-foreground/70"
                    )}
                  >
                    {new Date(message.timestamp).toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {"O AMALIA está a pensar..."}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions (only show when no messages) */}
        {messages.length === 0 && (
          <div className="border-y border-border bg-card/50 px-4 py-3 md:px-6">
            <div className="mx-auto max-w-3xl">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {"Sugestões:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 md:px-6">
          {/* Context banner: shows when articleIds came from /noticias */}
          {(contextNewsIds.length > 0 || contextSubjectLabel) && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <Newspaper className="h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="flex-1 text-xs text-primary">
                {contextSubjectLabel
                  ? <>Contexto: assunto <span className="font-semibold">&ldquo;{contextSubjectLabel}&rdquo;</span></>
                  : <>Contexto: <span className="font-semibold">{contextNewsIds.length} {contextNewsIds.length === 1 ? "notícia" : "notícias"}</span> selecionadas em /notícias</>
                }
              </p>
              <button
                type="button"
                onClick={() => { setContextNewsIds([]); setContextSubjectLabel(null) }}
                className="text-primary/60 hover:text-primary"
                aria-label="Remover contexto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Faça uma pergunta sobre as notícias..."
                rows={1}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ minHeight: "44px", maxHeight: "120px" }}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="mb-2 h-11 w-11 shrink-0 rounded-xl"
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop references sidebar */}
      <aside
        className={cn(
          "hidden border-l border-border bg-card transition-all duration-300 lg:block",
          isReferencesSidebarOpen ? "w-[360px]" : "w-0 overflow-hidden"
        )}
      >
        <ReferencesSidebarContent />
      </aside>
    </div>
  )
}
