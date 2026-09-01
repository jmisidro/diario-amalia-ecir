import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useTheme } from "@/components/theme-provider"
import { SOURCE_LOGOS } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const calculateDate = (date: string | Date) => {
  const now = new Date();
  const newsDate = new Date(date);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const newsDay = new Date(newsDate.getFullYear(), newsDate.getMonth(), newsDate.getDate());

  const diffInDays = (today.getTime() - newsDay.getTime()) / (1000 * 60 * 60 * 24);

  // Older than yesterday
  if (diffInDays > 1) {
    const day = newsDate.getDate().toString().padStart(2, '0');
    const month = newsDate.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
  }

  // Yesterday
  if (diffInDays === 1) {
    return 'Ontem';
  }

  // Today
  const elapsed = (now.getTime() - newsDate.getTime()) / 1000 / 60; // Minutes
  const threshold = 120; // 2 hours

  if (elapsed > 0 && elapsed < threshold) {
    if (elapsed < 60) {
      return `Há ${Math.floor(elapsed)} minutos`;
    }
    return 'Há 1 hora';
  }
  if (elapsed <= 0){
    return 'Agora';
  } else {
    const hours = newsDate.getHours().toString().padStart(2, '0');
    const minutes = newsDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

export const toLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const asTopicArray = (raw: unknown): { name: string; rank: number }[] => {
  const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return arr.map((t, i) => {
    if (t && typeof t === "object" && "name" in t) {
      return {
        name: typeof (t as any).name === "string" ? (t as any).name : "Outro",
        rank: typeof (t as any).rank === "number" ? (t as any).rank : i,
      };
    }
    // raw string/number/etc fallback
    return { name: typeof t === "string" ? t : "Geral", rank: i };
  });
};

export const sanitizeNews = (item: any) => ({
  ...item,
  title: item.title || "Sem título",
  site_name: item.site_name || item.source || "Fonte desconhecida",
  link: item.link || item.sourceUrl || "#",
  topics: asTopicArray(item.topic ?? item.topics),
  summary: item.summary || "Sem resumo disponível",
  author: item.author || "Redação",
  score: item.score ?? "N/A",
});

export function useSourceLogo(siteName: string): string | null {
  const { theme } = useTheme()

  const effectiveTheme = theme === "system"
    ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme

  const logo = SOURCE_LOGOS[siteName]
  if (!logo) return null
  if (typeof logo === "string") return logo
  return logo[effectiveTheme]
}

/**
 * Basic debounce function to rate-limit calls.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

// ── Markdown & Chat Helpers ───────────────────────────────────────────────────

export function normalise(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ")
}

/**
 * Walk React children recursively and replace [[FONTE:N]] sentinel strings
 * with the rendered component from renderChip.
 */
export function transformChildren(
  children: React.ReactNode,
  renderChip: (idx: number, key: string) => React.ReactNode
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return splitOnSentinels(child, renderChip)
    }
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<{ children?: React.ReactNode }>
      if (element.props && element.props.children) {
        return React.cloneElement(element, {
          children: transformChildren(element.props.children, renderChip),
        })
      }
    }
    return child
  })
}

export function splitOnSentinels(
  text: string,
  renderChip: (idx: number, key: string) => React.ReactNode
): React.ReactNode[] {
  const parts = text.split(/(\[\[FONTE:\d+\]\])/g)
  return parts.map((part, i) => {
    const m = part.match(/\[\[FONTE:(\d+)\]\]/)
    if (m) {
      const idx = parseInt(m[1], 10)
      return renderChip(idx, `cite-${i}`)
    }
    return part
  })
}

export const formatCountLabel = (count: number, singular: string, plural: string) => {
  return `${count} ${count === 1 ? singular : plural}`
}
