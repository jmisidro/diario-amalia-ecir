"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  X,
  MoreHorizontal,
  Pencil,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ChatSession } from "@/lib/types"

interface ChatSessionsSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, newTitle: string) => void
  disabled?: boolean
}

export function ChatSessionsSidebar({
  sessions,
  currentSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  disabled = false,
}: ChatSessionsSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        isOpen ? "w-[280px]" : "w-0 overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">Conversas</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNewSession}
            disabled={disabled}
            title="Nova conversa"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
            title="Fechar painel"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/80">Sem conversas</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cliqua em + para iniciar uma nova conversa
              </p>
            </div>
          </div>
        ) : (
          <GroupedSessionsList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            onRenameSession={onRenameSession}
            disabled={disabled}
          />
        )}
      </div>
    </aside>
  )
}

// ── Date grouping helpers ─────────────────────────────────────────

type GroupLabel = "Hoje" | "Ontem" | "Últimos 7 dias" | "Últimos 30 dias" | "Mais antigo"

function getGroupLabel(dateStr: string): GroupLabel {
  const now = new Date()
  const date = new Date(dateStr)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const startOf7Days = new Date(startOfToday.getTime() - 6 * 86400000)
  const startOf30Days = new Date(startOfToday.getTime() - 29 * 86400000)

  if (date >= startOfToday) return "Hoje"
  if (date >= startOfYesterday) return "Ontem"
  if (date >= startOf7Days) return "Últimos 7 dias"
  if (date >= startOf30Days) return "Últimos 30 dias"
  return "Mais antigo"
}

const GROUP_ORDER: GroupLabel[] = [
  "Hoje",
  "Ontem",
  "Últimos 7 dias",
  "Últimos 30 dias",
  "Mais antigo",
]

function groupSessions(sessions: ChatSession[]): Map<GroupLabel, ChatSession[]> {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  const map = new Map<GroupLabel, ChatSession[]>()
  for (const session of sorted) {
    const label = getGroupLabel(session.updatedAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(session)
  }
  return map
}

// Groups that start collapsed by default (older history)
const COLLAPSED_BY_DEFAULT = new Set<GroupLabel>(["Últimos 30 dias", "Mais antigo"])

interface GroupedSessionsListProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, title: string) => void
  disabled?: boolean
}

function GroupedSessionsList({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  disabled,
}: GroupedSessionsListProps) {
  const grouped = groupSessions(sessions)
  const presentLabels = GROUP_ORDER.filter((label) => grouped.has(label))

  // Track open/closed state per group; older groups start collapsed
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      presentLabels.map((label) => [label, !COLLAPSED_BY_DEFAULT.has(label)])
    )
  )

  // If a new group appears (e.g. new session bumps into "Hoje"), open it
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      for (const label of presentLabels) {
        if (!(label in next)) {
          next[label] = !COLLAPSED_BY_DEFAULT.has(label)
        }
      }
      return next
    })
  }, [presentLabels.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (label: GroupLabel) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <div className="flex flex-col gap-1">
      {presentLabels.map((label) => {
        const isOpen = openGroups[label] ?? true
        const groupSessions = grouped.get(label)!
        const hasActive = groupSessions.some((s) => s.id === currentSessionId)

        return (
          <div key={label}>
            {/* Collapsible group header */}
            <button
              type="button"
              onClick={() => toggle(label)}
              className={cn(
                "group/header flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary",
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform duration-200",
                  isOpen && "rotate-90"
                )}
              />
              <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {label}
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground/50">
                {groupSessions.length}
              </span>
              {/* Dot indicator when a group is collapsed but contains the active session */}
              {!isOpen && hasActive && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              )}
            </button>

            {/* Sessions within the group */}
            {isOpen && (
              <div className="flex flex-col gap-0.5 pb-1">
                {groupSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => onDeleteSession(session.id)}
                    onRename={(newTitle) => onRenameSession(session.id, newTitle)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
  disabled?: boolean
}

function SessionItem({ session, isActive, onSelect, onDelete, onRename, disabled }: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Update editValue when session.title changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(session.title)
    }
  }, [session.title, isEditing])

  const handleStartEdit = () => {
    setEditValue(session.title)
    setIsEditing(true)
  }

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed)
    } else {
      setEditValue(session.title)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(session.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const messageCount = session.messages.filter((m) => m.role === "user").length

  if (isEditing) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5",
          isActive ? "bg-primary/10" : "bg-secondary"
        )}
      >
        <MessageSquare
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleSave}
            className="rounded p-0.5 text-primary hover:bg-primary/10"
            title="Guardar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-foreground/80 hover:bg-secondary",
        disabled && "pointer-events-none",
        disabled && !isActive && "opacity-50"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-0"
        aria-label={`Selecionar conversa: ${session.title}`}
      />
      <MessageSquare
        className={cn(
          "relative z-10 mt-0.5 h-4 w-4 shrink-0 pointer-events-none",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <p className="truncate text-sm font-medium">
          {session.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {messageCount} {messageCount === 1 ? "mensagem" : "mensagens"} ·{" "}
          {formatRelativeDate(session.updatedAt)}
        </p>
      </div>

      {/* Dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative z-10 mt-0.5 rounded p-1 transition-opacity hover:bg-secondary/80",
              "opacity-0 group-hover:opacity-100",
              isActive && "opacity-100"
            )}
            title="Opcoes"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={handleStartEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "agora"
  if (diffMins < 60) return `ha ${diffMins} min`
  if (diffHours < 24) return `ha ${diffHours}h`
  if (diffDays === 1) return "ontem"
  if (diffDays < 7) return `ha ${diffDays} dias`
  return date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })
}

// Toggle button for when sidebar is closed
export function ChatSessionsToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={onClick}
      title="Abrir conversas"
    >
      <PanelLeftOpen className="h-4 w-4" />
    </Button>
  )
}
