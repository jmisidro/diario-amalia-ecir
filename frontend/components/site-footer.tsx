import { ExternalLink } from "lucide-react"
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center">
                <img
                  src="/AMALIA-logos/symbol/symbol-black.png"
                  alt="Logótipo AMALIA"
                  className="h-6 w-auto block dark:hidden"
                />
                <img
                  src="/AMALIA-logos/symbol/symbol-white.png"
                  alt="Logótipo AMALIA"
                  className="h-6 w-auto hidden dark:block"
                />
              </div>
              <span className="font-serif text-base font-bold text-foreground">
                {"Diário do AMALIA"}
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {"Agregação e resumo de notícias com inteligência artificial, desenvolvido pelo UPorto, utilizando o modelo de linguagem AMALIA."}
            </p>
          </div>

          <div className="flex gap-12">
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {"Navegação"}
              </h4>
              <Link
                href="/noticias"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {"Notícias"}
              </Link>
              <Link
                href="/chat"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Pergunta ao AMALIA
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Sobre
              </h4>
              <a
                href="https://www.inesctec.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                UPorto
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://amaliallm.pt/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Projeto AMALIA
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Legal
              </h4>
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Termos
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacidade
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            {"2026 UPorto. Todos os direitos reservados. Desenvolvido com o modelo de linguagem AMALIA."}
          </p>
        </div>
      </div>
    </footer>
  )
}
