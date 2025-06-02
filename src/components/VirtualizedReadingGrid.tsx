
import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import ExpandedDayCard from './ExpandedDayCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface DayData {
  day: number;
  date: string;
  chapters: any[];
  progressPercentage: number;
  completed: boolean;
}

interface VirtualizedReadingGridProps {
  data: DayData[];
  currentDayNumber: number;
  onScrollToDay?: (dayNumber: number) => void;
}

const VirtualizedReadingGrid: React.FC<VirtualizedReadingGridProps> = ({
  data,
  currentDayNumber,
  onScrollToDay
}) => {
  const isMobile = useIsMobile();
  const gridRef = useRef<Grid>(null);

  // Grid configuration based on device
  const gridConfig = useMemo(() => {
    const itemWidth = isMobile ? 180 : 300;
    const itemHeight = isMobile ? 180 : 200;
    const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const padding = isMobile ? 16 : 32;
    const availableWidth = containerWidth - padding;
    const columnsCount = Math.max(1, Math.floor(availableWidth / itemWidth));
    const rowsCount = Math.ceil(data.length / columnsCount);

    return {
      itemWidth,
      itemHeight,
      columnsCount,
      rowsCount,
      containerWidth: availableWidth,
      containerHeight: Math.min(800, rowsCount * itemHeight)
    };
  }, [isMobile, data.length]);

  // Cell renderer function
  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const itemIndex = rowIndex * gridConfig.columnsCount + columnIndex;
    const dayData = data[itemIndex];

    if (!dayData) {
      return <div style={style} />;
    }

    return (
      <div style={style} className="p-1.5">
        <ExpandedDayCard
          day={dayData.day}
          date={dayData.date}
          isToday={dayData.day === currentDayNumber}
          chapters={dayData.chapters}
          progressPercentage={dayData.progressPercentage}
          isMobile={isMobile}
        />
      </div>
    );
  }, [data, currentDayNumber, isMobile, gridConfig.columnsCount]);

  // Scroll to specific day
  const scrollToDay = useCallback((dayNumber: number) => {
    if (!gridRef.current) return;

    const dayIndex = data.findIndex(d => d.day === dayNumber);
    if (dayIndex === -1) return;

    const rowIndex = Math.floor(dayIndex / gridConfig.columnsCount);
    gridRef.current.scrollToItem({
      rowIndex,
      columnIndex: dayIndex % gridConfig.columnsCount,
      align: 'center'
    });
  }, [data, gridConfig.columnsCount]);

  // Expose scroll function
  useEffect(() => {
    if (onScrollToDay) {
      onScrollToDay(scrollToDay);
    }
  }, [scrollToDay, onScrollToDay]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucune donnée de plan de lecture disponible</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Grid
        ref={gridRef}
        height={gridConfig.containerHeight}
        width={gridConfig.containerWidth}
        columnCount={gridConfig.columnsCount}
        columnWidth={gridConfig.itemWidth}
        rowCount={gridConfig.rowsCount}
        rowHeight={gridConfig.itemHeight}
        itemData={data}
        className="mx-auto"
        style={{ margin: '0 auto' }}
      >
        {Cell}
      </Grid>
    </div>
  );
};

export default VirtualizedReadingGrid;
