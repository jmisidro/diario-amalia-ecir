"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Newspaper, MessageCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-1.4">
          <div className="flex h-9 w-9 items-center justify-center">
            <img
              src="/symbol-black.svg"
              className="h-5 w-auto block dark:hidden"
            />
            <img
              src="/symbol-white.svg"
              className="h-5 w-auto hidden dark:block"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold leading-tight text-foreground">
              {"Diário do AMALIA"}
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
              pathname === "/"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            )}
          >
            Início
          </Link>
          <Link
            href="/noticias"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
              pathname === "/noticias"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            )}
          >
            Notícias do Dia
          </Link>
          <Link
            href="/temas"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
              pathname === "/temas"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            )}
          >
            Temas da Semana
          </Link>
          <Link
            href="/participantes"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
              pathname === "/participantes"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            )}
          >
            Participantes
          </Link>
          <Link
            href="/sobre"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
              pathname === "/sobre"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground"
            )}
          >
            Sobre
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild size="sm" className="gap-2">
            <Link href="/chat">
              <MessageCircle className="h-4 w-4" />
              Pergunta ao AMALIA
            </Link>
          </Button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              Início
            </Link>
            <Link
              href="/noticias"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/noticias"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              Notícias do Dia
            </Link>
            <Link
              href="/temas"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/temas"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              Temas da Semana
            </Link>
            <Link
              href="/participantes"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/participantes"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              Participantes
            </Link>
            <Link
              href="/sobre"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/sobre"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              Sobre
            </Link>
          </nav>
          <div className="mt-3 border-t border-border pt-3">
            <Button asChild size="sm" className="w-full gap-2">
              <Link href="/chat" onClick={() => setMobileMenuOpen(false)}>
                <MessageCircle className="h-4 w-4" />
                Pergunta ao AMALIA
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
