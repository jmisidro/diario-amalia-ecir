import React from "react"
import type { Metadata, Viewport } from "next"
import { Source_Serif_4, Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"

/*
Sets fonts, global styles, theme handling,
and the base HTML wrapper used by all pages.
*/

import "./globals.css"

const _sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
})

const _inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Diário do AMALIA",
  description: `O Diário do AMALIA, desenvolvido pelo UPorto, agrega notícias diárias e gera resumos inteligentes com o modelo de linguagem AMALIA.
    Permite também ao utilizador falar com o AMALIA IA sobre as notícias do dia.`,
  keywords: [
    "AMALIA AI",
    "AMALIA LMM",
    "Diário do AMALIA",
    "AMALIA",
    "notícias",
    "notícias Portugal",
    "agregador notícias",
    "AI português",
    "LLM português",
    "resumos inteligentes"
  ],
  authors: [{ name: "UPorto" }],
  creator: "UPorto",
  publisher: "UPorto",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: "https://diariodoamalia.inesctec.pt",
    title: "Diário do AMALIA",
    description: "Resumos de notícias diárias gerados pelo modelo AMALIA LMM.",
    siteName: "Diário do AMALIA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diário do AMALIA",
    description: "Resumos de notícias diárias gerados pelo modelo AMALIA LMM.",
  },
}

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gaId = "G-VGLYSMG59Z";

  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${_sourceSerif.variable} ${_inter.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>

        {/* Only render scripts if GA_ID is present */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
