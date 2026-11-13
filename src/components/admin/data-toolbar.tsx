"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type StatusOption = { value: string; label: string };

type DataToolbarProps = {
  filterKey: string;
  searchValue: string;
  statusValue?: string;
  statusOptions?: StatusOption[];
  searchPlaceholder: string;
  statusLabel?: string;
  total: number;
  filtered: number;
};

const DEBOUNCE_MS = 300;

export function DataToolbar({
  filterKey,
  searchValue,
  statusValue = "",
  statusOptions,
  searchPlaceholder,
  statusLabel = "Semua status",
  total,
  filtered,
}: DataToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchValue);
  const timerRef = useRef<number | null>(null);

  const push = (nextSearch: string, nextStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSearch.trim()) {
      params.set("q", nextSearch.trim());
    } else {
      params.delete("q");
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (search === searchValue) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      push(search, statusValue);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchValue, statusValue]);

  const hasFilter = Boolean(searchValue.trim() || statusValue);

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center dark:border-zinc-800">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <Input
          id={`search-${filterKey}`}
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          className="pl-9"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && search) {
              setSearch("");
              push("", statusValue);
            }
          }}
        />
      </div>

      {statusOptions ? (
        <div className="sm:w-52">
          <label className="sr-only" htmlFor={`status-${filterKey}`}>
            {statusLabel}
          </label>
          <Select
            id={`status-${filterKey}`}
            value={statusValue}
            onChange={(event) => push(search, event.target.value)}
          >
            <option value="">{statusLabel}</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <p className="text-xs whitespace-nowrap text-zinc-500">
          {filtered === total ? `${total} data` : `${filtered} dari ${total}`}
        </p>
        {hasFilter ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              router.replace(pathname, { scroll: false });
            }}
          >
            <X className="h-4 w-4" aria-hidden />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
