import { Metadata } from "next"
import {
  Newspaper,
  Sparkles,
  Shield,
  Users,
  Building2,
  ExternalLink,
  Mail,
  Github,
  Globe,
  Lock,
  BookOpen,
  Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Sobre | Diário do AMALIA",
  description:
    "Conheça o Diário do AMALIA, uma plataforma de agregação e sumarização de notícias com inteligência artificial desenvolvida pelo INESC TEC.",
}

export default function SobrePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative overflow-hidden px-4 py-16 md:py-24">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-bg.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl">
              Sobre o Diário do AMALIA
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-white/90 drop-shadow-md">
              Uma plataforma inovadora que utiliza inteligência artificial para
              agregar e sumarizar notícias em português europeu.
            </p>
          </div>
        </section>

        {/* Mission section */}
        <section className="border-b border-border px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-2 md:gap-16">
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                  A Nossa Missão
                </h2>
                <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                  O Diário do AMALIA foi criado com o objetivo de facilitar o
                  acesso a informação de qualidade em português europeu. Num
                  mundo com excesso de informação, oferecemos resumos claros
                  das notícias mais relevantes do dia, permitindo que
                  os utilizadores se mantenham informados de forma eficiente.
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                  Utilizamos o modelo de linguagem AMALIA, desenvolvido
                  especificamente para o português europeu, garantindo resumos
                  de alta qualidade que respeitam as particularidades da nossa
                  língua e cultura.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <FeatureCard
                  icon={<Newspaper className="h-6 w-6" />}
                  title="Agregação Automática"
                  description="Recolhemos notícias de diversas fontes portuguesas de confiança."
                />
                <FeatureCard
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Sumarização com IA"
                  description="Geramos resumos concisos utilizando o modelo AMALIA."
                />
                <FeatureCard
                  icon={<Shield className="h-6 w-6" />}
                  title="Transparência"
                  description="Citamos sempre as fontes originais de cada notícia."
                />
              </div>
            </div>
          </div>
        </section>

        {/* About AMALIA section */}
        <section className="bg-secondary/30 px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                O Modelo AMALIA
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
                O <a href="https://amaliallm.pt/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">AMALIA</a> é um modelo de linguagem aberto, criado especificamente
                para o português de Portugal e para a cultura portuguesa. Ao contrário
                dos modelos gerais feitos por grandes empresas tecnológicas, o AMALIA
                preserva os fatores de soberania linguística e cultural.
              </p>
            </div>

            {/* AMALIA Key Features */}
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <AmaliaFeatureCard
                icon={<Globe className="h-6 w-6" />}
                title="Promoção da Língua Portuguesa"
                description="Permite que empresas nacionais, Administração Pública e demais entidades se exprimam corretamente nas várias variantes do português."
              />
              <AmaliaFeatureCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Representatividade Cultural"
                description="Captura e preserva expressões idiomáticas, gírias e referências culturais próprias de Portugal."
              />
              <AmaliaFeatureCard
                icon={<Lock className="h-6 w-6" />}
                title="Soberania sobre os Dados"
                description="Possibilita aplicar os mais recentes avanços em IA a domínios como a Administração Pública, garantindo que dados confidenciais não saiam de território nacional."
              />
              <AmaliaFeatureCard
                icon={<Lightbulb className="h-6 w-6" />}
                title="Investigação e Inovação"
                description="Estimula a investigação e inovação colaborativa, juntando vários centros de investigação e contribuindo para avançar o conhecimento nacional na fronteira da IA."
              />
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <StatCard value="9B" label="Parâmetros" />
              <StatCard value="32K" label="Dimensão do Contexto" />
              <StatCard value="PT-PT" label="Otimizado para Português Europeu" />
            </div>
          </div>
        </section>

        {/* Team section */}
        <section className="border-b border-border px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                A Equipa
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
                O Diário do AMALIA é desenvolvido pelo INESC TEC, uma instituição
                de investigação e desenvolvimento em ciência e tecnologia
                sediada no Porto.
              </p>
            </div>

            <div className="mt-12 flex flex-col items-center justify-center gap-8 md:flex-row">
              <TeamCard
                icon={<Building2 className="h-8 w-8" />}
                title="INESC TEC"
                description="Instituto de Engenharia de Sistemas e Computadores, Tecnologia e Ciência"
                link="https://www.inesctec.pt"
              />
              <TeamCard
                icon={<Users className="h-8 w-8" />}
                title="Equipa de NLP"
                description="Laboratório de Processamento de Linguagem Natural"
                link="https://nlp.inesctec.pt"
              />
            </div>
          </div>
        </section>

        {/* Contact section */}
        {/* <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
              Entre em Contacto
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
              Tem questões, sugestões ou feedback? Gostaríamos de ouvir a sua
              opinião.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild variant="outline" className="gap-2">
                <a href="mailto:amalia@inesctec.pt">
                  <Mail className="h-4 w-4" />
                  amalia@inesctec.pt
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a
                  href="https://amaliallm.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="h-4 w-4" />
                  amaliallm.pt
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a
                  href="https://github.com/INESC-TEC"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </section> */}
      </main>

      <SiteFooter />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function AmaliaFeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <p className="font-serif text-3xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function TeamCard({
  icon,
  title,
  description,
  link,
}: {
  icon: React.ReactNode
  title: string
  description: string
  link: string
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div>
        <h3 className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
          {title}
          <ExternalLink className="h-3.5 w-3.5 opacity-50" />
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </a>
  )
}
