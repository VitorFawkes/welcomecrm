
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import type { AnalyticsData } from '../types';
import { startOfMonth, subDays } from 'date-fns';

type Granularity = 'day' | 'week' | 'month';
type AnalysisMode = 'cohort' | 'activity';

interface DateRange {
    start: Date;
    end: Date;
}

interface AnalyticsContextType {
    data: AnalyticsData;
    filteredData: AnalyticsData;
    loading: boolean;
    error: Error | null;

    // Controls
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;

    granularity: Granularity;
    setGranularity: (g: Granularity) => void;

    mode: AnalysisMode;
    setMode: (m: AnalysisMode) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, loading, error } = useAnalyticsData();

    // Default state
    const [dateRange, setDateRange] = useState<DateRange>({
        start: startOfMonth(subDays(new Date(), 30)),
        end: new Date(),
    });

    const [granularity, setGranularity] = useState<Granularity>('day');
    const [mode, setMode] = useState<AnalysisMode>('activity');

    // Filter Logic can be expanded here.
    const filteredData = useMemo(() => {
        return data;
    }, [data]);

    const value = {
        data,
        filteredData,
        loading,
        error,
        dateRange,
        setDateRange,
        granularity,
        setGranularity,
        mode,
        setMode,
    };

    return (
        <AnalyticsContext.Provider value={value}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
};
