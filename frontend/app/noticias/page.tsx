'use client';

import { useState, useEffect, useCallback, useRef, useMemo} from 'react';
import { Loader2, Newspaper, X } from 'lucide-react';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewsCard } from '@/components/news-card';
import { DailySummary } from '@/components/daily-summary';
import { NewsFilters } from '@/components/news-filters';
import { Pagination } from '@/components/pagination';
import { FeaturedSubjects } from '@/components/featured-subjects';
import { AskAmaliaBar } from "@/components/ask-amalia-bar"

import { toLocalDateString } from '@/lib/utils'

import useGetDailyNews from '@/app/hooks/useGetDailyNews';
import useGetDailySummary from '@/app/hooks/useGetDailySummary';
import useSearchNews from '@/app/hooks/useSearch';
import useGetSubjects from '@/app/hooks/useGetSubjects';
import useGetNewsBySubject from '@/app/hooks/useGetNewsBySubject';

import type { Subject } from "@/lib/types"

const NEWS_PER_PAGE = 9;
const MAX_SELECTED_NEWS = 6

export default function NoticiasPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [debugMode, setDebugMode] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');

  const [sortBy, setSortBy] = useState<'date' | 'importance'>('date');

  const formattedDate = toLocalDateString(selectedDate);

  const { news, loading: newsLoading } = useGetDailyNews(
    selectedTopic,
    selectedSource,
    toLocalDateString(selectedDate)
  );

  const { summary: dailySummary, loading: summaryLoading } = useGetDailySummary(
    selectedTopic,
    toLocalDateString(selectedDate)
  );

  const today = new Date();
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();

  const { subjects, loading: subjectsLoading } = useGetSubjects(
    selectedTopic,
    toLocalDateString(selectedDate)
  );

  const {
    results: searchResults,
    loading: searchLoading,
    searchNews,
    clearSearch,
  } = useSearchNews();

  const {
    results: subjectResults,
    loading: subjectLoading,
    fetchBySubject,
    clearResults: clearSubject,
  } = useGetNewsBySubject();

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const isSearchMode = searchResults.length > 0 || (searchQuery && searchLoading);
  const isSubjectMode = activeSubjectId !== null;

  const lastDisplayedRef = useRef(news);

  const displayedNews = isSearchMode
    ? searchResults
    : isSubjectMode && !subjectLoading && subjectResults.length > 0
      ? subjectResults
      : isSubjectMode && subjectLoading
        ? lastDisplayedRef.current
        : news;

  const sortedNews = useMemo(() => {
    const items = [...displayedNews];

    return items.sort((a, b) => {
      if (sortBy === 'importance') {
        const scoreA = a.score?.index || 0;
        const scoreB = b.score?.index || 0;

        if (scoreB === scoreA) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return scoreB - scoreA;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [displayedNews, sortBy]);

  const loading = newsLoading || summaryLoading || searchLoading;

  const newsGridRef = useRef<HTMLDivElement | null>(null);

  const totalPages = Math.ceil(displayedNews.length / NEWS_PER_PAGE);
  const startIdx = (currentPage - 1) * NEWS_PER_PAGE;
  const endIdx = startIdx + NEWS_PER_PAGE;
  const paginatedNews = sortedNews.slice(startIdx, endIdx);

  useEffect(() => {
    setCurrentPage(1);
  }, [news, searchResults, subjectResults]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!subjectLoading && !loading) {
      lastDisplayedRef.current = displayedNews;
    }
  }, [displayedNews, subjectLoading, loading]);

  const scrollToGrid = () => {
    if (newsGridRef.current) {
      const offset = 80;
      const top = newsGridRef.current.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToGrid();
  }, [currentPage]);

  // Debug mode...
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'D' && e.shiftKey) {
        if (debugMode) setDebugMode(false);
        else {
          const secret = process.env.NEXT_PUBLIC_DEBUG_PASSWORD;
          if (!secret) return;
          const input = prompt("Modo de Debug - Introduza a palavra-passe:");
          if (input === secret) setDebugMode(true);
          else if (input !== null) alert("Acesso negado.");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      clearSubject();
      setActiveSubjectId(null);
      setCurrentPage(1);
      await searchNews(searchQuery);
    }
  };

  const handleClearSubjectFilter = () => {
    setActiveSubjectId(null);
    setCurrentPage(1);
    clearSubject();
  };

  const handleSubjectClick = async (subject: Subject) => {
    setSearchQuery('');
    clearSearch();
    clearSubject();

    const currentIdStr = subject._id?.toString();

    if (activeSubjectId === currentIdStr) {
      handleClearSubjectFilter();
      return;
    }

    setActiveSubjectId(subject._id);
    setCurrentPage(1);
    scrollToGrid();

    const targetDate = subject.snapshot_date
      ? new Date(subject.snapshot_date).toISOString().split('T')[0]
      : formattedDate;

    await fetchBySubject(subject._id);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
  };

  const handleClearAll = () => {
    setSearchQuery('');
    clearSearch();
    clearSubject();
    setActiveSubjectId(null);
    setCurrentPage(1);
    lastDisplayedRef.current = news;
  };


  // Selection state for "Ask AMALIA" feature
  const [selectedNewsIds, setSelectedNewsIds] = useState<Set<string>>(new Set())
  const [selectedSubjectForChat, setSelectedSubjectForChat] = useState<Subject | null>(null)
  const isSelectionMode = selectedNewsIds.size > 0 || selectedSubjectForChat !== null

  // News selection toggle (max 6)
  const handleNewsSelect = (articleId: string) => {
    setSelectedSubjectForChat(null) // deselect subject when selecting news
    setSelectedNewsIds((prev) => {
      const next = new Set(prev)
      if (next.has(articleId)) {
        next.delete(articleId)
      } else if (next.size < MAX_SELECTED_NEWS) {
        next.add(articleId)
      }
      return next
    })
  }

  // Subject selection for chat (selects entire subject)
  const handleSubjectSelectForChat = (subject: Subject) => {
    setSelectedNewsIds(new Set()) // deselect news when selecting subject
    setSelectedSubjectForChat((prev) => (prev?._id?.toString() === subject._id?.toString() ? null : subject))
  }

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedNewsIds(new Set())
    setSelectedSubjectForChat(null)
  }

  const selectedNews = displayedNews.filter((n) => {
    const articleKey = n._id || (n as any)._id?.toString() || n.link;
    return selectedNewsIds.has(articleKey);
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-8">

          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
              Notícias do dia
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Explora e filtra as principais notícias agregadas pelo AMALIA
            </p>
          </div>

          {dailySummary && !loading && !isSearchMode && (
            <DailySummary summary={dailySummary} />
          )}

          <FeaturedSubjects
            subjects={subjects}
            onSubjectClick={handleSubjectClick}
            activeSubjectId={activeSubjectId}
            onClearFilter={handleClearAll}
            onTopicSelectForChat={handleSubjectSelectForChat}
            selectedSubjectForChat={selectedSubjectForChat}
          />

          {!isSearchMode && (
            <NewsFilters
              selectedDate={selectedDate}
              selectedTopic={selectedTopic}
              selectedSource={selectedSource}
              sortBy={sortBy}
              onDateChange={(date) => {
                clearSearch();
                clearSubject();
                setActiveSubjectId(null);
                setSelectedDate(date);
              }}
              onTopicChange={(topic) => {
                clearSearch();
                clearSubject();
                setActiveSubjectId(null);
                setSelectedTopic(topic);
              }}
              onSourceChange={(source) => {
                clearSearch();
                clearSubject();
                setActiveSubjectId(null);
                setSelectedSource(source);
              }}
              onSortChange={setSortBy}
            />
          )}

          {/* Search Bar */}
          {isToday && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pesquisar notícias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSearch}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Pesquisar
              </button>
              {isSearchMode && (
                <button
                  onClick={handleClearSearch}
                  className="rounded-lg border border-border px-3 py-2 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isSearchMode ? 'A pesquisar notícias...' : 'A carregar notícias...'}
              </p>
            </div>
          ) : displayedNews.length === 0 && !subjectLoading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
              <Newspaper className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-lg font-semibold text-foreground">
                {isSearchMode ? 'Nenhum resultado encontrado' : 'Sem notícias encontradas'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSearchMode ? 'Tente outra pesquisa.' : 'Tente alterar os filtros ou selecionar outra data.'}
              </p>
            </div>
          ) : (
            <>

              <div className="flex items-center justify-between border-b border-border pb-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {displayedNews.length}{' '}
                  {displayedNews.length === 1 ? 'notícia' : 'notícias'}{' '}
                  encontrada
                  {displayedNews.length !== 1 ? 's' : ''}
                </p>
                {totalPages > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                )}
              </div>

              <div
                ref={newsGridRef}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {paginatedNews.map((news) => (
                  <NewsCard
                    key={news._id || news.link}
                    article={news}
                    debugMode={debugMode}
                    isSelectable={!selectedSubjectForChat}
                    isSelected={selectedNewsIds.has(news._id || (news as any)._id || news.link)}
                    onSelect={handleNewsSelect}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />

      {/* Ask AMALIA sticky bar */}
      <AskAmaliaBar
        selectedNews={selectedNews}
        selectedSubject={selectedSubjectForChat}
        onClear={handleClearSelection}
      />
    </div>
  );
}
