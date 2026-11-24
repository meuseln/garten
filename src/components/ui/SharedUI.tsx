import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export const ModuleHeader: React.FC<{
  title: string;
  subtitle?: string;
  accentHex?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
    <div>
      <h1 className="font-display text-xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, maxWidthClass = 'max-w-2xl', children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-white/95 dark:bg-[#161D1A]/95 backdrop-blur-xs border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-display text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 sm:p-8 text-center space-y-3">
    <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
    <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg bg-[#233A29] text-white text-sm font-medium hover:opacity-90 transition"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const SegmentedTabs: React.FC<{
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div className="flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-neutral-800/70 rounded-xl w-full sm:w-fit overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`px-3.5 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap shrink-0 min-h-[40px] ${
          activeTab === tab.id
            ? 'bg-white dark:bg-[#161D1A] text-neutral-900 dark:text-neutral-100 shadow-xs'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export function usePagination<T>(items: T[], pageSize = 6) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems,
    pageItems,
  };
}

export const PaginationControls: React.FC<{
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  itemLabel?: string;
}> = ({ page, totalPages, totalItems, onPageChange, itemLabel = 'Einträge' }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="min-h-[44px] px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs font-medium inline-flex items-center gap-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Zurück</span>
      </button>

      <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num text-center">
        Seite <strong className="text-neutral-900 dark:text-neutral-100">{page}</strong> / {totalPages}
        <span className="hidden sm:inline"> · {totalItems} {itemLabel}</span>
      </div>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="min-h-[44px] px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs font-medium inline-flex items-center gap-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
      >
        <span>Weiter</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
