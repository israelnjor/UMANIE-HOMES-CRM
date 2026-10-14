// components/ui/DataTable.tsx
"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "./Button";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: React.ReactNode;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

export default function DataTable<T extends object>({
  columns,
  data,
  keyExtractor,
  loading = false,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyTitle = "No records found",
  emptySubtitle = "Try adjusting your search or filters.",
  emptyAction,
  pageSize = 10,
  onRowClick,
  actions,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  // Search filter
  const filtered = searchable && search.trim()
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  // Sort
  const sorted = sortKey && sortDir
    ? [...filtered].sort((a, b) => {
       const av = String((a as Record<string, unknown>)[sortKey] ?? "");
       const bv = String((b as Record<string, unknown>)[sortKey] ?? "");

        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filtered;

  // Paginate
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
    setPage(1);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={14} className="text-ink-muted/50" />;
    if (sortDir === "asc") return <ChevronUp size={14} className="text-primary" />;
    return <ChevronDown size={14} className="text-primary" />;
  };

  const skeletonCols = actions ? columns.length + 1 : columns.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>

      {/* Search */}
      {searchable && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card",
              "placeholder:text-ink-muted text-ink outline-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            )}
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    style={{ width: col.width }}
                    className={cn(
                      "px-4 py-3 font-semibold text-ink-muted text-xs uppercase tracking-wide whitespace-nowrap",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.sortable && "cursor-pointer select-none hover:text-ink transition-colors"
                    )}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    <div className={cn(
                      "flex items-center gap-1",
                      col.align === "center" && "justify-center",
                      col.align === "right" && "justify-end",
                    )}>
                      {col.header}
                      {col.sortable && <SortIcon colKey={String(col.key)} />}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide w-24">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: skeletonCols }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-border rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={skeletonCols} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-ink">{emptyTitle}</p>
                    <p className="text-xs text-ink-muted mt-1">{emptySubtitle}</p>
                    {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={keyExtractor(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "bg-card transition-colors",
                      onRowClick && "cursor-pointer hover:bg-surface"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn(
                          "px-4 py-3 text-ink",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key as string] ?? "—")}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface">
            <p className="text-xs text-ink-muted">
              Showing <span className="font-medium text-ink">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-ink">{total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<ChevronLeft size={14} />}
              >
                Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                icon={<ChevronRight size={14} />}
                iconPosition="right"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}