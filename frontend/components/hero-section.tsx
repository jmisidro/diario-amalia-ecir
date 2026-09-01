import { MessageCircle, Newspaper, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center gap-6 overflow-hidden px-4 py-16 text-center md:py-24 lg:py-28">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.webp')" }}
      />

      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/30" />

      <div className="relative z-10 flex max-w-4xl flex-col items-center gap-6">
        <h1 className="flex items-center justify-center gap-3
          text-balance font-serif text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          <img
            src="/symbol-white.svg"
            alt=""
            className="h-10 w-auto object-contain block md:h-12 lg:h-14"
          />
          <span className="bg-gradient-to-r from-white via-[hsl(var(--primary))] to-white bg-clip-text text-transparent drop-shadow-lg">
            Diário do AMALIA
          </span>
        </h1>

        <p className="max-w-2xl text-pretty text-base leading-relaxed text-white/90 drop-shadow-md md:text-lg lg:text-xl">
          {"Fica a par de tudo o que acontece em Portugal com resumos inteligentes, gerados pelo AMALIA."}
        </p>

        {/* Feature cards */}
        <div className="mt-8 grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/noticias" className="group flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Newspaper className="h-6 w-6 text-white" />
            </div>
            <span className="font-serif text-lg font-semibold text-white">
              {"Mantém-te informado"}
            </span>
            <span className="text-sm leading-relaxed text-white/80">
              {"Recolhemos as notícias das principais fontes noticiárias portuguesas e apresentamo-las num formato de leitura fácil, rápida e moderna."}
            </span>
          </Link>

          <Link href="/temas" className="group flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="font-serif text-lg font-semibold text-white">
              {"Explora os temas da semana"}
            </span>
            <span className="text-sm leading-relaxed text-white/80">
              {"Descobre os temas mais importantes da semana e os artigos relacionados com cada um deles."}
            </span>
          </Link>

          <Link href="/chat" className="group flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="font-serif text-lg font-semibold text-white">
              {"Pergunta ao AMALIA"}
            </span>
            <span className="text-sm leading-relaxed text-white/80">
              {"Conversa com o AMALIA sobre eventos importantes, notícias de hoje, curiosidades e muito mais."}
            </span>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
          <p className="drop-shadow-md transition-colors hover:text-white">
            Lê as notícias mais recentes de 7 fontes nacionais.
          </p>
        </div>
      </div>
    </section>
  )
}
