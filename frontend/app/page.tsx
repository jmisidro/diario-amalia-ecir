"use client"

import { useState, useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HeroSection } from "@/components/hero-section"
import { DailySummary } from "@/components/daily-summary"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { DailySummary as DailySummaryType } from "@/lib/types"
import { toLocalDateString } from "@/lib/utils"

import useGetDailySummary from '@/app/hooks/useGetDailySummary';

export default function HomePage() {
  const today = toLocalDateString(new Date());

  const { summary: dailySummary, loading } = useGetDailySummary('all', today);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />

        {/* Daily summary section */}
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A carregar resumo diário...</p>
            </div>
          ) : dailySummary ? (
            <div className="flex flex-col gap-6">
              <DailySummary summary={dailySummary} />
              <div className="flex justify-center">
                <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent">
                  <Link href="/noticias">Ver todas as notícias do dia</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <p className="text-sm text-muted-foreground">Ocorreu um erro. O resumo do dia será apresentado assim que possível.</p>
              <div className="flex justify-center">
                <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent">
                  <Link href="/noticias">Ver todas as notícias do dia</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
