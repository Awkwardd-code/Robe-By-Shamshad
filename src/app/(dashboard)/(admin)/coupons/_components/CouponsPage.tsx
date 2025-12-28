/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { Fragment, useCallback, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Edit, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Skeleton } from "@/components/ui/skeleton";

interface Coupon {
  _id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  discountPercentage?: number;
  discountedPrice?: number;
  appliesTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CouponForm {
  _id?: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  discountPercentage: string;
  discountedPrice: string;
}

const DEFAULT_PAGE_LIMIT = 10;
const CODE_LENGTH = 14;
const COUPON_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

const generateCouponCode = () => {
  let value = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    value += COUPON_CHARS[Math.floor(Math.random() * COUPON_CHARS.length)];
  }
  return value;
};

const formatInputDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getCouponStatus = (startDate: string, endDate: string) => {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "unknown";
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
};

const parseNumberInput = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageLimit, setPageLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [isFetching, setIsFetching] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [isUpdatingCoupon, setIsUpdatingCoupon] = useState(false);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);

  const [selectedCoupon, setSelectedCoupon] = useState<CouponForm | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  const [newCoupon, setNewCoupon] = useState<CouponForm>({
    name: "",
    code: generateCouponCode(),
    startDate: "",
    endDate: "",
    discountPercentage: "",
    discountedPrice: "",
  });

  const resetNewCoupon = useCallback(() => {
    setNewCoupon({
      name: "",
      code: generateCouponCode(),
      startDate: "",
      endDate: "",
      discountPercentage: "",
      discountedPrice: "",
    });
  }, []);

  const fetchCoupons = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `/api/coupons?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to fetch coupons");
      }
      const data = await response.json();
      setCoupons(data.coupons || []);
      setTotalPages(data.totalPages || 1);
      const resolvedLimit =
        typeof data.pageLimit === "number" && data.pageLimit > 0
          ? data.pageLimit
          : data.coupons?.length || DEFAULT_PAGE_LIMIT;
      setPageLimit(resolvedLimit);
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch coupons");
    } finally {
      setIsFetching(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const openAddModal = () => {
    resetNewCoupon();
    setIsAddModalOpen(true);
  };

  const openUpdateModal = (couponId: string) => {
    const found = coupons.find((coupon) => coupon._id === couponId);
    if (!found) return;
    setSelectedCoupon({
      _id: found._id,
      name: found.name,
      code: found.code,
      startDate: formatInputDate(found.startDate),
      endDate: formatInputDate(found.endDate),
      discountPercentage:
        typeof found.discountPercentage === "number" && found.discountPercentage > 0
          ? String(found.discountPercentage)
          : "",
      discountedPrice:
        typeof found.discountedPrice === "number" && found.discountedPrice > 0
          ? String(found.discountedPrice)
          : "",
    });
    setIsUpdateModalOpen(true);
  };

  const openDeleteModal = (couponId: string) => {
    setCouponToDelete(couponId);
    setIsDeleteModalOpen(true);
  };

  const validateDates = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Please provide valid start and end dates.";
    }
    if (end.getTime() < start.getTime()) {
      return "End date must be after the start date.";
    }
    return "";
  };

  const validateDiscountFields = (percentage: string, discountedPrice: string) => {
    const percentageValue = parseNumberInput(percentage);
    const priceValue = parseNumberInput(discountedPrice);
    const hasPercentage = percentageValue !== null && percentageValue > 0;
    const hasPrice = priceValue !== null && priceValue > 0;
    if (hasPercentage && hasPrice) {
      return "Provide either a discount percentage or a discounted price.";
    }
    if (!hasPercentage && !hasPrice) {
      return "Provide a discount percentage or a discounted price.";
    }
    if (hasPercentage && percentageValue > 100) {
      return "Discount percentage must be between 1 and 100.";
    }
    return "";
  };

  const handleAddSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCoupon.name.trim()) {
      toast.error("Coupon name is required.");
      return;
    }
    const dateError = validateDates(newCoupon.startDate, newCoupon.endDate);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    const discountError = validateDiscountFields(
      newCoupon.discountPercentage,
      newCoupon.discountedPrice
    );
    if (discountError) {
      toast.error(discountError);
      return;
    }

    setIsAddingCoupon(true);
    try {
      const discountPercentage = parseNumberInput(newCoupon.discountPercentage);
      const discountedPrice = parseNumberInput(newCoupon.discountedPrice);
      const payload = {
        name: newCoupon.name.trim(),
        code: newCoupon.code,
        startDate: newCoupon.startDate,
        endDate: newCoupon.endDate,
        discountPercentage,
        discountedPrice,
      };
      const response = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create coupon");
      }
      const data = await response.json();
      setCoupons((prev) => [data, ...prev]);
      setIsAddModalOpen(false);
      resetNewCoupon();
      toast.success("Coupon created successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create coupon");
    } finally {
      setIsAddingCoupon(false);
    }
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCoupon?._id) return;
    if (!selectedCoupon.name.trim()) {
      toast.error("Coupon name is required.");
      return;
    }
    const dateError = validateDates(selectedCoupon.startDate, selectedCoupon.endDate);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    const discountError = validateDiscountFields(
      selectedCoupon.discountPercentage,
      selectedCoupon.discountedPrice
    );
    if (discountError) {
      toast.error(discountError);
      return;
    }

    setIsUpdatingCoupon(true);
    try {
      const discountPercentage = parseNumberInput(selectedCoupon.discountPercentage);
      const discountedPrice = parseNumberInput(selectedCoupon.discountedPrice);
      const payload = {
        name: selectedCoupon.name.trim(),
        code: selectedCoupon.code,
        startDate: selectedCoupon.startDate,
        endDate: selectedCoupon.endDate,
        discountPercentage,
        discountedPrice,
      };
      const response = await fetch(`/api/coupons/${selectedCoupon._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update coupon");
      }
      const data = await response.json();
      setCoupons((prev) => prev.map((coupon) => (coupon._id === data._id ? data : coupon)));
      setIsUpdateModalOpen(false);
      setSelectedCoupon(null);
      toast.success("Coupon updated successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update coupon");
    } finally {
      setIsUpdatingCoupon(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;
    setIsDeletingCoupon(true);
    try {
      const response = await fetch(`/api/coupons/${couponToDelete}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete coupon");
      }
      setCoupons((prev) => prev.filter((coupon) => coupon._id !== couponToDelete));
      setIsDeleteModalOpen(false);
      setCouponToDelete(null);
      toast.success("Coupon deleted successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete coupon");
    } finally {
      setIsDeletingCoupon(false);
    }
  };

  const statusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase";
    if (status === "active") {
      return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`;
    }
    if (status === "upcoming") {
      return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
    }
    if (status === "expired") {
      return `${base} bg-rose-50 text-rose-700 border border-rose-200`;
    }
    return `${base} bg-gray-100 text-gray-500 border border-gray-200`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Admin Coupons
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500">Valid for all users.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search coupons by name or code"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-gray-400">
          {coupons.length} coupon{coupons.length === 1 ? "" : "s"} loaded
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`coupon-skeleton-${index}`}>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Skeleton className="h-8 w-20" />
                    </td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No coupons found. Create a new coupon to get started.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const status = getCouponStatus(coupon.startDate, coupon.endDate);
                  return (
                    <tr key={coupon._id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{coupon.name}</div>
                        <div className="text-xs text-gray-400">Applies to all users</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-lg bg-gray-100 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-gray-700">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        <div>{formatDisplayDate(coupon.startDate)}</div>
                        <div className="text-xs text-gray-400">to {formatDisplayDate(coupon.endDate)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={statusBadge(status)}>{status}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openUpdateModal(coupon._id)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(coupon._id)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-xs text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="cursor-pointer rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="cursor-pointer rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Transition appear show={isAddModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsAddModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white p-8 text-left shadow-2xl transition-all">
                  <Dialog.Title className="text-2xl font-bold text-gray-900">
                    Create Coupon
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-500">Valid for all users.</p>

                  <form onSubmit={handleAddSubmit} className="mt-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newCoupon.name}
                        onChange={(event) =>
                          setNewCoupon((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                        placeholder="Eid Special Coupon"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Coupon Code
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newCoupon.code}
                          readOnly
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 font-mono text-sm tracking-[0.2em] text-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewCoupon((prev) => ({ ...prev, code: generateCouponCode() }))
                          }
                          className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"
                          title="Regenerate code"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        Auto-generated 14 character code.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Discount Percentage
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="0.01"
                          value={newCoupon.discountPercentage}
                          onChange={(event) =>
                            setNewCoupon((prev) => ({
                              ...prev,
                              discountPercentage: event.target.value,
                              discountedPrice: event.target.value ? "" : prev.discountedPrice,
                            }))
                          }
                          placeholder="e.g. 10"
                          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Discounted Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCoupon.discountedPrice}
                          onChange={(event) =>
                            setNewCoupon((prev) => ({
                              ...prev,
                              discountedPrice: event.target.value,
                              discountPercentage: event.target.value ? "" : prev.discountPercentage,
                            }))
                          }
                          placeholder="e.g. 499"
                          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Use either discount percentage or discounted price.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={newCoupon.startDate}
                          onChange={(event) =>
                            setNewCoupon((prev) => ({ ...prev, startDate: event.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={newCoupon.endDate}
                          onChange={(event) =>
                            setNewCoupon((prev) => ({ ...prev, endDate: event.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingCoupon}
                        className="cursor-pointer rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isAddingCoupon ? "Creating..." : "Create Coupon"}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isUpdateModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedCoupon(null);
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white p-8 text-left shadow-2xl transition-all">
                  <Dialog.Title className="text-2xl font-bold text-gray-900">
                    Update Coupon
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-500">Valid for all users.</p>

                  {selectedCoupon && (
                    <form onSubmit={handleUpdateSubmit} className="mt-6 space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          value={selectedCoupon.name}
                          onChange={(event) =>
                            setSelectedCoupon((prev) =>
                              prev ? { ...prev, name: event.target.value } : prev
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          Coupon Code
                        </label>
                        <div>
                          <input
                            type="text"
                            value={selectedCoupon.code}
                            readOnly
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 font-mono text-sm tracking-[0.2em] text-gray-700"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                          Auto-generated 14 character code. Cannot be edited.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Discount Percentage
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.01"
                            value={selectedCoupon.discountPercentage}
                            onChange={(event) =>
                              setSelectedCoupon((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      discountPercentage: event.target.value,
                                      discountedPrice: event.target.value
                                        ? ""
                                        : prev.discountedPrice,
                                    }
                                  : prev
                              )
                            }
                            placeholder="e.g. 10"
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Discounted Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={selectedCoupon.discountedPrice}
                            onChange={(event) =>
                              setSelectedCoupon((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      discountedPrice: event.target.value,
                                      discountPercentage: event.target.value
                                        ? ""
                                        : prev.discountPercentage,
                                    }
                                  : prev
                              )
                            }
                            placeholder="e.g. 499"
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        Use either discount percentage or discounted price.
                      </p>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={selectedCoupon.startDate}
                            onChange={(event) =>
                              setSelectedCoupon((prev) =>
                                prev ? { ...prev, startDate: event.target.value } : prev
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-gray-700">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={selectedCoupon.endDate}
                            onChange={(event) =>
                              setSelectedCoupon((prev) =>
                                prev ? { ...prev, endDate: event.target.value } : prev
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUpdateModalOpen(false);
                            setSelectedCoupon(null);
                          }}
                          className="cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingCoupon}
                          className="cursor-pointer rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdatingCoupon ? "Updating..." : "Update Coupon"}
                        </button>
                      </div>
                    </form>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-md" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white p-8 text-left shadow-2xl transition-all">
                  <Dialog.Title className="text-2xl font-bold text-gray-900">
                    Delete Coupon
                  </Dialog.Title>
                  <p className="mt-3 text-sm text-gray-500">
                    Are you sure you want to delete this coupon? This action cannot be undone.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      disabled={isDeletingCoupon}
                      className="cursor-pointer rounded-lg bg-linear-to-r from-rose-500 to-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-rose-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeletingCoupon ? "Deleting..." : "Delete Coupon"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default CouponsPage;
