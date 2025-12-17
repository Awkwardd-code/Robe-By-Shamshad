"use client";

import { useEffect, useMemo, useState } from "react";

interface NewsletterSubscriber {
  _id?: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSubscribers = async (nextPage: number) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `/api/newsletter?page=${nextPage}&limit=${PAGE_LIMIT}`,
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
    fetchSubscribers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryText = useMemo(() => {
    if (loading) return "Loading subscribers...";
    if (error) return error;
    if (subscribers.length === 0) return "No subscribers found.";
    return `Showing ${(page - 1) * PAGE_LIMIT + 1}-${Math.min(page * PAGE_LIMIT, totalCount)} of ${totalCount}`;
  }, [loading, error, subscribers, totalCount, page]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stay on top of every mango-lover who joined your community.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {summaryText}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canGoPrev || loading}
              className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext || loading}
              className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-500">
                    Fetching mango fans...
                  </td>
                </tr>
              )}
              {!loading && subscribers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-500">
                    No subscribers yet.
                  </td>
                </tr>
              )}
              {!loading &&
                subscribers.map((subscriber) => (
                  <tr key={subscriber._id || subscriber.email}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {subscriber.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {subscriber.source || "Unknown"}
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
