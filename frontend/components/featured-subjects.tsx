'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SubjectCard } from './subject-card';
import type { Subject } from '@/lib/types';

interface FeaturedSubjectsProps {
  subjects: Subject[];
  onSubjectClick: (subject: Subject) => void;
  activeSubjectId?: string | null;
  onClearFilter?: () => void;
  onTopicSelectForChat?: (subject: Subject) => void;
  selectedSubjectForChat?: Subject | null;
}

export function FeaturedSubjects({
  subjects,
  onSubjectClick,
  activeSubjectId,
  onClearFilter,
  onTopicSelectForChat,
  selectedSubjectForChat
}: FeaturedSubjectsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const itemsPerPage = 4;

  // Reset to the first page automatically whenever the subjects array changes
  useEffect(() => {
    setCurrentPage(0);
    setExpandedSubjectId(null);
  }, [subjects]);

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => b.count - a.count);
  }, [subjects]);

  const totalPages = Math.ceil(sortedSubjects.length / itemsPerPage);

  const currentView = sortedSubjects.slice(
    currentPage * itemsPerPage,
    (currentPage * itemsPerPage) + itemsPerPage
  );

  const isLineExpanded = expandedSubjectId !== null;

  if (subjects.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      {/* Top Header Section */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
          Assuntos do Dia
        </h2>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {currentView.map((subject) => {
          const isSelectedForChat = selectedSubjectForChat?._id?.toString() === subject._id?.toString();
          const isCurrentFilterActive = activeSubjectId?.toString() === subject._id?.toString();

          const subjectUniqueId = subject._id?.toString() || subject.label;
          const isThisCardExpanded = expandedSubjectId === subjectUniqueId;

          const itemKey = subject.snapshot_date
            ? `${subject.snapshot_date}-${subject.label}`
            : `live-${subject.label}`;

          return (
            <div key={itemKey} className="flex flex-col gap-2 h-full justify-between">
              <button
                onClick={() => onSubjectClick(subject)}
                onDoubleClick={() => {
                  if (isCurrentFilterActive && onClearFilter) {
                    onClearFilter();
                  }
                }}
                className={cn(
                  "group text-left transition-transform duration-200 active:scale-[0.98] h-full w-full flex flex-col flex-1 items-stretch",
                  isCurrentFilterActive ? 'ring-2 ring-primary rounded-xl' : ''
                )}
              >
                <SubjectCard
                  subject={subject}
                  isExpanded={isThisCardExpanded}
                  isLineExpanded={isLineExpanded}
                  onToggleExpand={(expand) => {
                    setExpandedSubjectId(expand ? subjectUniqueId : null);
                  }}
                />
              </button>

              {onTopicSelectForChat && (
                <button
                  onClick={() => onTopicSelectForChat(subject)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all w-full shrink-0',
                    isSelectedForChat
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                  )}
                >
                  <MessageCircle className="h-3 w-3" />
                  {isSelectedForChat ? 'Assunto selecionado' : 'Perguntar ao AMALIA'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Area */}
      {(totalPages > 1 || (activeSubjectId != null && onClearFilter)) && (
        <div className="relative flex items-center justify-center min-h-[2.25rem] mt-2 w-full">

          {/* Centered Pagination System */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-full bg-transparent border-border hover:bg-muted"
                onClick={() => {
                  setExpandedSubjectId(null);
                  setCurrentPage((prev) => prev - 1);
                }}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setExpandedSubjectId(null);
                      setCurrentPage(idx);
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      currentPage === idx
                        ? "w-5 bg-gradient-to-r from-primary via-purple-600 to-primary"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Ir para a página ${idx + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-full bg-transparent border-border hover:bg-muted"
                onClick={() => {
                  setExpandedSubjectId(null);
                  setCurrentPage((prev) => prev + 1);
                }}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Clear Filter Button */}
          {activeSubjectId != null && onClearFilter && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden sm:block">
              <button
                onClick={onClearFilter}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm"
              >
                <X className="h-3 w-3" />
                Limpar filtro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Small Screen Fallback for Clear Filter Button */}
      {activeSubjectId != null && onClearFilter && (
        <div className="flex justify-center sm:hidden mt-1">
          <button
            onClick={onClearFilter}
            className="flex items-center gap-1 rounded-full border border-border px-4 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-all"
          >
            <X className="h-3 w-3" />
            Limpar filtro
          </button>
        </div>
      )}
    </section>
  );
}
