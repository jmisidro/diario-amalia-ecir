'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Newspaper } from 'lucide-react';
import type { DailySummary as DailySummaryType } from '@/lib/types';
import type { Topic } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

interface DailySummaryProps {
  summary: Partial<DailySummaryType> & { summary: string };
}

const PREVIEW_LENGTH = 280;

export function DailySummary({ summary }: DailySummaryProps) {
  const [expanded, setExpanded] = useState(false);

  // force re-render every minute so "há X min" updates automatically
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((x) => x + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const text = summary?.summary || '';
  const isLong = text.length > PREVIEW_LENGTH;
  const hasTopics = summary?.topTopics && summary.topTopics.length > 0;

  function timeAgo(dateString?: string) {
    if (!dateString) return '';

    const now = new Date();
    const past = new Date(dateString);

    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);

    if (diff < 60) return 'agora mesmo';
    if (minutes < 60) return `há ${minutes} min`;
    if (hours < 24) return `há ${hours} h`;
    return `há ${days} dias`;
  }

  const getTruncatedMarkdown = () => {
    if (!isLong || expanded) return text;

    const truncated = text.slice(0, PREVIEW_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    const cleanTruncated =
      lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;

    return cleanTruncated + '...';
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground md:text-2xl">
            Resumo do Dia
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Gerado automaticamente pelo modelo AMALIA
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="text-sm leading-relaxed text-foreground/85 md:text-base prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-lg font-bold my-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-md font-bold my-2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-base font-semibold my-1" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="text-primary hover:underline" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside my-2" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside my-2" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-2 last:mb-0" {...props} />
              ),
            }}
          >
            {getTruncatedMarkdown()}
          </ReactMarkdown>
        </div>

        {isLong && (
          <Button
            variant="link"
            size="sm"
            className="mt-2 h-auto p-0 text-xs font-semibold text-primary"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Ler menos' : 'Ler mais'}
          </Button>
        )}
      </div>

      {(hasTopics || summary.createdAt) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {hasTopics && (
              <>
                <div className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex flex-wrap gap-1.5">
                  {summary.topTopics?.map((topic, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="border-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      {topic.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>

          {summary.createdAt && (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo(summary.createdAt)}
            </div>
          )}
        </div>
      )}

    </section>
  );
}
