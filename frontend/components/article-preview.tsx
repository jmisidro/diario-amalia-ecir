import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import Image from "next/image"

import type { NewsArticle } from "@/lib/types"
import { SOURCE_LOGOS } from "@/lib/constants"

export function ArticlePreview({ article }: { article: NewsArticle }) {
  const logo = SOURCE_LOGOS[article.site_name]
  const logoUrl = typeof logo === "string" ? logo : logo?.light

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-semibold leading-snug text-foreground">{article.title}</h4>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{article.summary}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {article.topics.map((topic) => (
              <span
                key={topic.name}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {topic.name}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {logoUrl && (
                <Image
                  src={logoUrl || "/placeholder.svg"}
                  alt={article.site_name}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded object-contain"
                  unoptimized
                />
              )}
              <span>{article.site_name}</span>
              <span>•</span>
              <span>{article.author}</span>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              <a href={article.link} target="_blank" rel="noopener noreferrer">
                Ver artigo <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
