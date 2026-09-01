import { useState, useCallback } from "react"
import useApi from "../utils/useApi"
import type { ChatMessage, ChatReference } from "@/lib/types"

interface UseSendMessageOptions {
  /** The session ID to include in each request (for server-side conversation history). */
  sessionId: string | null
  /** The current messages array owned by the caller (e.g. useChatStorage). */
  messages: ChatMessage[]
  /** Called with the full updated messages array after each user/assistant exchange. */
  onMessagesUpdate: (messages: ChatMessage[]) => void
  /** Optional callback invoked when the assistant reply arrives with references. */
  onAssistantReply?: (message: ChatMessage) => void
  news_ids?: string[]
  subject_label?: string | null
}

/**
 * Handles sending a chat message to the API and updating external message state.
 *
 * All message storage is delegated to the caller via `onMessagesUpdate`, so this
 * hook is compatible with any persistence layer (in-memory, localStorage, etc.).
 */
const useSendMessage = ({
  sessionId,
  messages,
  onMessagesUpdate,
  onAssistantReply,
  news_ids,
  subject_label,
}: UseSendMessageOptions) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { request } = useApi()

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading || !sessionId) return

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      }

      // Optimistically append the user message
      const withUser = [...messages, userMessage]
      onMessagesUpdate(withUser)
      setLoading(true)

      try {
        const isDirect = (news_ids && news_ids.length > 0) || subject_label;
        const endpoint = isDirect ? "/user/chat_direct" : "/user/chat";

        const data = await request<{
          message: string
          timestamp: string
          references: ChatReference[]
        }>(endpoint, {
          method: "POST",
          body: {
            message: content.trim(),
            session_id: sessionId,
            article_ids: news_ids,
            subject_label: subject_label
          },
        })

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: data.timestamp,
          references: data.references || [],
        }

        onMessagesUpdate([...withUser, assistantMessage])
        onAssistantReply?.(assistantMessage)
      } catch (error) {
        console.error("[useSendMessage] Chat request failed:", error)
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Desculpe, ocorreu um erro ao processar a sua pergunta. Por favor, tente novamente.",
          timestamp: new Date().toISOString(),
          references: [],
        }
        onMessagesUpdate([...withUser, errorMessage])
      } finally {
        setLoading(false)
      }
    },
    [loading, sessionId, messages, onMessagesUpdate, onAssistantReply, request]
  )

  return { loading, sendMessage }
}

export default useSendMessage
