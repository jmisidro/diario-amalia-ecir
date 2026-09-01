import { Suspense } from "react"
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { ChatInterface } from "@/components/chat-interface"
import { Loader2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Pergunta ao AMALIA | Diário do AMALIA",
  description:
    "Faça perguntas sobre as notícias do dia ao AMALIA, o modelo de linguagem para português europeu do UPorto.",
}

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <ChatInterface />
      </Suspense>
    </div>
  )
}
