"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import { Edit, Plus, Trash2, X, Search, Upload, Eye, EyeOff, ArrowUpDown } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type FeatureAlign = "left" | "center";
type FeatureIconTone = "primary" | "muted";
type FeatureItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  href?: string;
  align: FeatureAlign;
  iconTone: FeatureIconTone;
  order: number;
  isActive: boolean;
};

type FeatureFormState = Omit<FeatureItem, "id">;

const DEFAULT_FORM: FeatureFormState = {
  title: "",
  description: "",
  imageUrl: "",
  imagePublicId: "",
  href: "",
  align: "left",
  iconTone: "primary",
  order: 1,
  isActive: true,
};

export default function FeaturesGridPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [sortField, setSortField] = useState<keyof FeatureItem>("order");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formState, setFormState] = useState<FeatureFormState>(DEFAULT_FORM);
  const [editingFeature, setEditingFeature] = useState<FeatureItem | null>(null);
  const [featureToDelete, setFeatureToDelete] = useState<FeatureItem | null>(null);

  const uploadImage = async (file: File, existingPublicId?: string) => {
    setIsImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (existingPublicId) {
        formData.append("oldPublicId", existingPublicId);
      }

      const response = await fetch("/api/upload/image", {
        method: existingPublicId ? "PUT" : "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to upload image");
      }

      return {
        imageUrl: data.imageUrl as string,
        imagePublicId: data.publicId as string,
      };
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload image");
      return null;
    } finally {
      setIsImageUploading(false);
    }
  };

  const removeImage = async (publicId?: string) => {
    if (!publicId) return true;
    try {
      const response = await fetch(
        `/api/upload/image?publicId=${encodeURIComponent(publicId)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to delete image");
      }
      return true;
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete image");
      return false;
    }
  };

  const fetchFeatures = async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/features-grid?admin=true&limit=100", {
        cache: "no-store",
      });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData?.error || "Failed to load features");
        return;
      }
      const data = (await response.json()) as { features?: FeatureItem[] };
      setFeatures(Array.isArray(data.features) ? data.features : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load features");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void fetchFeatures();
  }, []);

  const sortedAndFilteredFeatures = useMemo(() => {
    let result = [...features];
    
    // Filter
    const needle = searchTerm.trim().toLowerCase();
    if (needle) {
      result = result.filter((feature) => {
        return (
          feature.title.toLowerCase().includes(needle) ||
          feature.description.toLowerCase().includes(needle) ||
          (feature.href || "").toLowerCase().includes(needle)
        );
      });
    }
    
    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      return sortDirection === "asc" 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    
    return result;
  }, [features, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof FeatureItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleOpenAddModal = () => {
    setFormState(DEFAULT_FORM);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (feature: FeatureItem) => {
    setEditingFeature(feature);
    setFormState({
      title: feature.title,
      description: feature.description,
      imageUrl: feature.imageUrl,
      imagePublicId: feature.imagePublicId,
      href: feature.href ?? "",
      align: feature.align,
      iconTone: feature.iconTone,
      order: feature.order,
      isActive: feature.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleDeletePrompt = (feature: FeatureItem) => {
    setFeatureToDelete(feature);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (mode: "add" | "edit") => {
    if (mode === "edit" && !editingFeature) {
      toast.error("Select a feature to edit");
      return;
    }
    if (!formState.imageUrl) {
      toast.error("Please upload a feature image");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formState,
        href: formState.href?.trim() || "",
      };

      const response = await fetch(
        mode === "add"
          ? "/api/features-grid"
          : `/api/features-grid?id=${encodeURIComponent(editingFeature?.id || "")}`,
        {
          method: mode === "add" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData?.error || "Failed to save feature");
        return;
      }

      toast.success(mode === "add" ? "Feature added" : "Feature updated");
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditingFeature(null);
      await fetchFeatures();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save feature");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!featureToDelete) return;
    setIsDeleting(true);
    try {
      if (featureToDelete.imagePublicId) {
        await removeImage(featureToDelete.imagePublicId);
      }
      const response = await fetch(
        `/api/features-grid?id=${encodeURIComponent(featureToDelete.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData?.error || "Failed to delete feature");
        return;
      }
      toast.success("Feature deleted");
      setIsDeleteModalOpen(false);
      setFeatureToDelete(null);
      await fetchFeatures();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete feature");
    } finally {
      setIsDeleting(false);
    }
  };

  const SortableHeader = ({ field, children }: { field: keyof FeatureItem; children: React.ReactNode }) => (
    <th className="pb-3 cursor-pointer select-none" onClick={() => handleSort(field)}>
      <div className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-black" : "text-gray-300"}`} />
      </div>
    </th>
  );

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-linear-to-r from-gray-900 to-black p-6 md:p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-300 mb-2">
                Home • Features Management
              </p>
              <h1 className="text-2xl md:text-3xl font-bold">
                Features Grid
              </h1>
              <p className="mt-2 text-gray-300 max-w-2xl">
                Manage the 8 feature tiles shown on the storefront. Each tile represents a key feature or service.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all duration-200 cursor-pointer"
              type="button"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              Add New Feature
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white p-4 shadow-lg border border-gray-100">
            <div className="text-sm text-gray-500">Total Features</div>
            <div className="text-2xl font-bold mt-1">{features.length}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-lg border border-gray-100">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">
              {features.filter(f => f.isActive).length}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-lg border border-gray-100">
            <div className="text-sm text-gray-500">Hidden</div>
            <div className="text-2xl font-bold mt-1 text-gray-400">
              {features.filter(f => !f.isActive).length}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-lg border border-gray-100">
            <div className="text-sm text-gray-500">Max Order</div>
            <div className="text-2xl font-bold mt-1">
              {Math.max(...features.map(f => f.order), 0)}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-xl">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search features by title, description, or link..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                {isFetching ? (
                  <span className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-ping rounded-full bg-blue-500"></div>
                    Loading...
                  </span>
                ) : (
                  `${sortedAndFilteredFeatures.length} of ${features.length} features`
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full min-w-250 text-left text-sm">
              <thead className="bg-gray-50/80">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <SortableHeader field="title">
                    <span className="pl-4">Title & Description</span>
                  </SortableHeader>
                  <SortableHeader field="order">
                    <span>Order</span>
                  </SortableHeader>
                  <th className="pb-3">Image</th>
                  <SortableHeader field="align">
                    <span>Align</span>
                  </SortableHeader>
                  <SortableHeader field="iconTone">
                    <span>Tone</span>
                  </SortableHeader>
                  <SortableHeader field="isActive">
                    <span>Status</span>
                  </SortableHeader>
                  <th className="pb-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAndFilteredFeatures.map((feature) => (
                  <tr 
                    key={feature.id} 
                    className="hover:bg-gray-50/50 transition-colors duration-150"
                  >
                    <td className="py-4 pl-4">
                      <div className="font-semibold text-gray-900">
                        {feature.title || "Untitled"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {feature.description || "No description"}
                      </div>
                      {feature.href ? (
                        <div className="mt-2 text-xs">
                          <a 
                            href={feature.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {feature.href.length > 40 ? `${feature.href.substring(0, 40)}...` : feature.href}
                          </a>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4">
                      <div className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 font-mono text-sm font-semibold text-gray-700">
                        {feature.order}
                      </div>
                    </td>
                    <td className="py-4">
                      {feature.imageUrl ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                          <Image
                            src={feature.imageUrl}
                            alt={feature.title || "Feature image"}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                          <span className="text-xs text-gray-400">No image</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize">
                        {feature.align === "center" ? (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                            Center
                          </>
                        ) : (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                            Left
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        feature.iconTone === "primary" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          feature.iconTone === "primary" ? "bg-blue-500" : "bg-gray-400"
                        }`}></div>
                        {feature.iconTone}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          feature.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {feature.isActive ? (
                            <>
                              <Eye className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              Hidden
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(feature)}
                          className="group inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                          type="button"
                        >
                          <Edit className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(feature)}
                          className="group inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isFetching && sortedAndFilteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="mx-auto max-w-md space-y-3">
                        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">No features found</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? "Try a different search term" : "Add your first feature to get started"}
                          </p>
                        </div>
                        {!searchTerm && (
                          <button
                            onClick={handleOpenAddModal}
                            className="mx-auto inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 cursor-pointer"
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                            Add First Feature
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Feature"
      >
        <FeatureForm
          formState={formState}
          onChange={setFormState}
          onSubmit={() => handleSave("add")}
          isSaving={isSaving}
          isImageUploading={isImageUploading}
          onUploadImage={uploadImage}
          onRemoveImage={removeImage}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Feature"
      >
        <FeatureForm
          formState={formState}
          onChange={setFormState}
          onSubmit={() => handleSave("edit")}
          isSaving={isSaving}
          isImageUploading={isImageUploading}
          onUploadImage={uploadImage}
          onRemoveImage={removeImage}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Feature"
        size="sm"
      >
        <div className="p-2">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-center text-sm text-gray-600">
            Are you sure you want to delete <strong>{featureToDelete?.title || "this feature"}</strong>? 
            This action cannot be undone.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              type="button"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                "Delete Feature"
              )}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        theme="colored"
        toastClassName="!rounded-xl"
      />
    </div>
  );
}

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = "lg"
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  size?: "sm" | "lg";
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
              <Dialog.Panel className={`w-full ${
                size === "sm" ? "max-w-md" : "max-w-2xl"
              } transform rounded-2xl bg-white p-6 text-left shadow-2xl transition-all`}>
                <div className="mb-6 flex items-center justify-between">
                  <Dialog.Title className="text-xl font-bold text-gray-900">
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-colors cursor-pointer"
                    type="button"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function FeatureForm({
  formState,
  onChange,
  onSubmit,
  isSaving,
  isImageUploading,
  onUploadImage,
  onRemoveImage,
}: {
  formState: FeatureFormState;
  onChange: (next: FeatureFormState) => void;
  onSubmit: () => void;
  isSaving: boolean;
  isImageUploading: boolean;
  onUploadImage: (
    file: File,
    existingPublicId?: string
  ) => Promise<{ imageUrl: string; imagePublicId: string } | null>;
  onRemoveImage: (publicId?: string) => Promise<boolean>;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    const result = await onUploadImage(file, formState.imagePublicId);
    if (result) {
      onChange({
        ...formState,
        imageUrl: result.imageUrl,
        imagePublicId: result.imagePublicId,
      });
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleRemoveImage = async () => {
    if (!formState.imagePublicId) return;
    const success = await onRemoveImage(formState.imagePublicId);
    if (success) {
      onChange({ ...formState, imageUrl: "", imagePublicId: "" });
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <textarea
              value={formState.title}
              onChange={(event) =>
                onChange({ ...formState, title: event.target.value })
              }
              rows={2}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition"
              placeholder={"FREE\nDELIVERY"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formState.description}
              onChange={(event) =>
                onChange({ ...formState, description: event.target.value })
              }
              rows={2}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition"
              placeholder="Cash / card / mobile"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link (Optional)
            </label>
            <input
              type="text"
              value={formState.href ?? ""}
              onChange={(event) =>
                onChange({ ...formState, href: event.target.value })
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 focus:border-black focus:ring-2 focus:ring-black/10 focus:outline-none transition"
              placeholder="/products"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feature Image *
            </label>
            <div
              className={`mt-2 rounded-xl border-2 border-dashed ${
                isDragging ? "border-black bg-blue-50" : "border-gray-300 hover:border-gray-400"
              } transition-colors p-4`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {formState.imageUrl ? (
                    <Image
                      src={formState.imageUrl}
                      alt="Feature preview"
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">Upload image</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-3">
                    Drag and drop an image here, or click to browse
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <label className="cursor-pointer rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isImageUploading}
                      />
                      {isImageUploading ? (
                        <span className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Uploading...
                        </span>
                      ) : (
                        "Choose Image"
                      )}
                    </label>
                    {formState.imageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Recommended: 512×512 PNG or JPG
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Alignment
            </label>
            <select
              value={formState.align}
              onChange={(event) =>
                onChange({
                  ...formState,
                  align: event.target.value as FeatureAlign,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
            >
              <option value="left">Left Aligned</option>
              <option value="center">Center Aligned</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Icon Tone
            </label>
            <select
              value={formState.iconTone}
              onChange={(event) =>
                onChange({
                  ...formState,
                  iconTone: event.target.value as FeatureIconTone,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
            >
              <option value="primary">Primary Color</option>
              <option value="muted">Muted / Gray</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Display Order
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={formState.order}
              onChange={(event) =>
                onChange({
                  ...formState,
                  order: Math.max(1, Number(event.target.value) || 1),
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    onChange({ ...formState, isActive: event.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-emerald-500 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
              </div>
              Active Feature
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FORM)}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 transition-colors cursor-pointer"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Saving...
            </>
          ) : (
            "Save Feature"
          )}
        </button>
      </div>
    </form>
  );
}
