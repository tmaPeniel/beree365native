
import { useState, useMemo, useCallback } from 'react';

interface DayData {
  day: number;
  date: string;
  chapters: any[];
  progressPercentage: number;
  completed: boolean;
}

interface UseLazyReadingDataProps {
  data: DayData[];
  pageSize?: number;
  prefetchSize?: number;
}

export const useLazyReadingData = ({
  data,
  pageSize = 50,
  prefetchSize = 20
}: UseLazyReadingDataProps) => {
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0]));
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: pageSize });

  // Calculate total pages
  const totalPages = Math.ceil(data.length / pageSize);

  // Get currently loaded data
  const loadedData = useMemo(() => {
    const result: DayData[] = [];
    
    for (const pageIndex of loadedPages) {
      const startIndex = pageIndex * pageSize;
      const endIndex = Math.min(startIndex + pageSize, data.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        if (data[i]) {
          result[i] = data[i];
        }
      }
    }
    
    return result;
  }, [data, loadedPages, pageSize]);

  // Load specific page
  const loadPage = useCallback((pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setLoadedPages(prev => new Set([...prev, pageIndex]));
    }
  }, [totalPages]);

  // Load pages around a specific day
  const loadAroundDay = useCallback((dayNumber: number) => {
    const dayIndex = data.findIndex(d => d.day === dayNumber);
    if (dayIndex === -1) return;

    const targetPage = Math.floor(dayIndex / pageSize);
    const pagesToLoad = new Set<number>();

    // Load current page and surrounding pages
    for (let i = Math.max(0, targetPage - 1); i <= Math.min(totalPages - 1, targetPage + 1); i++) {
      pagesToLoad.add(i);
    }

    setLoadedPages(prev => new Set([...prev, ...pagesToLoad]));
  }, [data, pageSize, totalPages]);

  // Update visible range for prefetching
  const updateVisibleRange = useCallback((start: number, end: number) => {
    setVisibleRange({ start, end });

    // Prefetch nearby pages
    const startPage = Math.max(0, Math.floor(start / pageSize) - 1);
    const endPage = Math.min(totalPages - 1, Math.floor(end / pageSize) + 1);

    const pagesToLoad = new Set<number>();
    for (let i = startPage; i <= endPage; i++) {
      pagesToLoad.add(i);
    }

    setLoadedPages(prev => new Set([...prev, ...pagesToLoad]));
  }, [pageSize, totalPages]);

  return {
    loadedData,
    loadedPages: Array.from(loadedPages),
    totalPages,
    loadPage,
    loadAroundDay,
    updateVisibleRange,
    isPageLoaded: (pageIndex: number) => loadedPages.has(pageIndex)
  };
};
