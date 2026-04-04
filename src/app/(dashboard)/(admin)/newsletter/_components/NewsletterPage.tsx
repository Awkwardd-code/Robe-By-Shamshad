"use client";

import { useEffect, useMemo, useState } from "react";

interface NewsletterSubscriber {
  _id?: string;
  name: string;
  email: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

interface NewsletterResponse {
  subscribers: NewsletterSubscriber[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  filters?: {
    search?: string;
    source?: string;
  };
}

const PAGE_LIMIT = 20;

const formatDateTime = (isoDate?: string) => {
  if (!isoDate) return "N/A";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilterInput, setSourceFilterInput] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSubscribers = async (
    nextPage: number,
    options?: { search?: string; source?: string }
  ) => {
    try {
      setLoading(true);
      setError("");

      const searchValue = options?.search ?? searchTerm;
      const sourceValue = options?.source ?? sourceFilter;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_LIMIT),
      });

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }
      if (sourceValue && sourceValue !== "all") {
        params.set("source", sourceValue);
      }

      const response = await fetch(
        `/api/newsletter?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to fetch subscribers.");
      }
      const data: NewsletterResponse = await response.json();
      setSubscribers(data.subscribers || []);
      setTotalCount(data.totalCount || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError((err as Error)?.message || "Failed to fetch subscribers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers(1, { search: "", source: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatSource = (source?: string) => {
    if (!source) return "Unknown";
    return source
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const summaryText = useMemo(() => {
    if (loading) return "Loading subscribers...";
    if (error) return error;
    if (subscribers.length === 0) return "No subscribers found.";
    const prefix = `Showing ${(page - 1) * PAGE_LIMIT + 1}-${Math.min(page * PAGE_LIMIT, totalCount)} of ${totalCount}`;
    if (!searchTerm.trim() && sourceFilter === "all") return prefix;
    return `${prefix} (filtered)`;
  }, [loading, error, subscribers, totalCount, page, searchTerm, sourceFilter]);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const handlePrev = () => {
    if (!canGoPrev) return;
    const targetPage = page - 1;
    fetchSubscribers(targetPage);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    const targetPage = page + 1;
    fetchSubscribers(targetPage);
  };

  const handleRefresh = () => {
    fetchSubscribers(page);
  };

  const handleApplyFilters = () => {
    const nextSearch = searchInput.trim();
    const nextSource = sourceFilterInput;
    setSearchTerm(nextSearch);
    setSourceFilter(nextSource);
    fetchSubscribers(1, { search: nextSearch, source: nextSource });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setSourceFilterInput("all");
    setSourceFilter("all");
    fetchSubscribers(1, { search: "", source: "all" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track every enrollment from the preview masterclass form.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex cursor-pointer items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 p-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Search
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email, source"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
          <div className="w-full md:w-52">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Source
            </label>
            <select
              value={sourceFilterInput}
              onChange={(event) => setSourceFilterInput(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Sources</option>
              <option value="preview-masterclass">Preview Masterclass</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading}
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={loading}
              className="cursor-pointer rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {summaryText}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canGoPrev || loading}
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext || loading}
              className="cursor-pointer rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Joined At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                    Fetching subscribers...
                  </td>
                </tr>
              )}
              {!loading && subscribers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                    No subscribers yet.
                  </td>
                </tr>
              )}
              {!loading &&
                subscribers.map((subscriber) => (
                  <tr key={subscriber._id || subscriber.email}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {subscriber.name || "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {subscriber.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatSource(subscriber.source)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {formatDateTime(subscriber.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
