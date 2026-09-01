'use client';

import { useState, useRef, useEffect } from 'react';
import {
  LucideIcon, Gavel, Briefcase, Globe, HeartPulse,
  Microscope, Cpu, Theater, TreePine, Trophy,
  Users, MapPin, Newspaper, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { Subject } from '@/lib/types';
import { MAX_INDEX } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const iconMap: Record<string, LucideIcon> = {
  'política': Gavel,
  'economia': Briefcase,
  'internacional': Globe,
  'saúde': HeartPulse,
  'ciência': Microscope,
  'tecnologia': Cpu,
  'cultura': Theater,
  'ambiente': TreePine,
  'desporto': Trophy,
  'sociedade': Users,
  'local': MapPin,
};

function getIndexClasses(scoreValue: number) {
  const ratio = scoreValue / MAX_INDEX;
  if (ratio >= 0.6) return 'text-green-500 bg-green-500/10';
  if (ratio >= 0.3) return 'text-yellow-500 bg-yellow-500/10';
  return 'text-red-500 bg-red-500/10';
}

interface SubjectCardProps {
  subject: Subject;
  isExpanded: boolean;
  isLineExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

export function SubjectCard({ subject, isExpanded, isLineExpanded, onToggleExpand }: SubjectCardProps) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const primaryTopic = subject.topics?.[0];
  const topicName = primaryTopic?.name || 'Outro';
  const Icon = iconMap[topicName.toLowerCase()] || Newspaper;

  useEffect(() => {
    const checkOverflow = () => {
      if (titleRef.current) {
        const totalHeight = titleRef.current.scrollHeight;
        const clientHeight = titleRef.current.clientHeight;
        setIsOverflowing(totalHeight > clientHeight);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [subject.label, isExpanded]);

  return (
    <div
      className={cn(
        "group flex flex-col justify-between rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all hover:bg-primary/10 w-full text-left flex-1",
        !isLineExpanded ? "sm:min-h-[11rem]" : "h-full sm:min-h-[11rem]"
      )}
    >
      {/* Top Header Section */}
      <div className="flex justify-between items-center gap-3 w-full shrink-0">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-90 dark:opacity-100">
            {topicName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums flex items-center gap-1",
              getIndexClasses(subject.score)
            )}
          >
            {Math.round((subject.score / MAX_INDEX) * 100)}%
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div onClick={(e) => e.stopPropagation()}>
                  <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px] font-sans">
                Classificação da importância do assunto pelo AMALIA com base em diversos fatores como relevância e volume. Quanto maior a percentagem, maior a importância.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main text area */}
      <div className="mt-1 flex-1 flex flex-col justify-start overflow-hidden">
        <h3
          ref={titleRef}
          className={cn(
            "w-full font-serif text-base font-bold leading-normal sm:leading-snug text-foreground break-words",
            !isExpanded && "line-clamp-3"
          )}
        >
          {subject.label}
        </h3>

        {/* Displays Ler mais... only if content exceeds natural limits */}
        {(isOverflowing || isExpanded) && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleExpand(!isExpanded);
            }}
            className="inline-flex items-center gap-0.5 text-[11px] font-sans font-semibold text-primary hover:underline cursor-pointer mt-1 w-max z-10 shrink-0"
          >
            {isExpanded ? (
              <>
                Ler menos <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Ler mais <ChevronDown className="h-3 w-3" />
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Content Area */}
      <div className="flex items-center justify-between pt-1 mt-2 w-full shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {subject.count} notícias
        </span>
        <Icon
          className="h-7 w-7 text-primary/30 transition-colors group-hover:text-primary/60 shrink-0"
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}
