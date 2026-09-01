"use client"

import { useState, useEffect, useCallback } from "react"
import type { ChatMessage, ChatSession } from "@/lib/types"

const STORAGE_KEY = "amalia_chat_sessions"
const CURRENT_SESSION_KEY = "amalia_current_session_id"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function generateSessionTitle(): string {
  return `Conversa ${new Date().toLocaleString("pt-PT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatSession[]
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

function loadCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY)
  } catch {
    return null
  }
}

function saveCurrentSessionId(id: string | null): void {
  if (typeof window === "undefined") return
  try {
    if (id) {
      localStorage.setItem(CURRENT_SESSION_KEY, id)
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY)
    }
  } catch {
    // fail silently
  }
}

export function useChatStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    const stored = loadSessions()
    const storedCurrentId = loadCurrentSessionId()

    setSessions(stored)

    // Validate that the stored current session still exists
    if (storedCurrentId && stored.some((s) => s.id === storedCurrentId)) {
      setCurrentSessionId(storedCurrentId)
    } else if (stored.length > 0) {
      setCurrentSessionId(stored[0].id)
    }

    setIsLoaded(true)
  }, [])

  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null

  const createSession = useCallback((): ChatSession => {
    const newSession: ChatSession = {
      id: generateId(),
      title: generateSessionTitle(),
      customTitle: false,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setSessions((prev) => {
      const updated = [newSession, ...prev]
      saveSessions(updated)
      return updated
    })

    setCurrentSessionId(newSession.id)
    saveCurrentSessionId(newSession.id)

    return newSession
  }, [])

  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[]) => {
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== sessionId) return s

          // Auto-generate title from the first user message if not custom-titled
          let title = s.title
          if (!s.customTitle) {
            const firstUserMsg = messages.find((m) => m.role === "user")
            if (firstUserMsg) {
              const raw = firstUserMsg.content.trim()
              title = raw.length > 50 ? raw.slice(0, 50) + "…" : raw
            }
          }

          return {
            ...s,
            messages,
            title,
            updatedAt: new Date().toISOString(),
          }
        })
        saveSessions(updated)
        return updated
      })
    },
    []
  )

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? { ...s, title: newTitle, customTitle: true, updatedAt: new Date().toISOString() }
          : s
      )
      saveSessions(updated)
      return updated
    })
  }, [])

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessionId)
        saveSessions(updated)

        // If the deleted session was current, switch to first available
        if (currentSessionId === sessionId) {
          const next = updated[0] ?? null
          const nextId = next?.id ?? null
          setCurrentSessionId(nextId)
          saveCurrentSessionId(nextId)
        }

        return updated
      })
    },
    [currentSessionId]
  )

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    saveCurrentSessionId(sessionId)
  }, [])

  return {
    sessions,
    currentSession,
    currentSessionId,
    isLoaded,
    createSession,
    updateSessionMessages,
    renameSession,
    deleteSession,
    selectSession,
  }
}
