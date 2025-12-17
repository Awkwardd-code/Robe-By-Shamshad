/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { 
  Search, Eye, ChevronLeft, ChevronRight, User, Mail, Phone, 
  MapPin, Calendar, ShoppingBag, Edit, Save, X, 
  CheckCircle, XCircle, Shield, Lock, Unlock, Loader2 
} from 'lucide-react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Skeleton } from '@/components/ui/skeleton';

// Interfaces for type safety
interface UserType {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: string;
    isActive: boolean;
    isAdmin?: number;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
    };
    totalOrders: number;
    totalSpent: number;
    lastOrderDate?: string;
    createdAt: string;
    updatedAt: string;
}

const DEFAULT_PAGE_LIMIT = 10;

// Role options
const roleOptions = [
    { value: 'customer', label: 'Customer', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    { value: 'staff', label: 'Staff', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'vendor', label: 'Vendor', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [pageLimit, setPageLimit] = useState<number>(DEFAULT_PAGE_LIMIT);
    const [adminToggleId, setAdminToggleId] = useState<string | null>(null);

    // Get role color
    const getRoleColor = (role: string) => {
        const option = roleOptions.find(opt => opt.value === role);
        return option ? option.color : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    };

    // Get status color
    const getStatusColor = (isActive: boolean) => {
        return isActive 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    };

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchTerm]);

    const fetchUsers = async () => {
        setIsFetching(true);
        try {
            const response = await fetch(
                `/api/users?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
                setTotalPages(data.totalPages || 1);
                const resolvedLimit =
                    typeof data.pageLimit === 'number' && data.pageLimit > 0
                        ? data.pageLimit
                        : (data.users?.length || DEFAULT_PAGE_LIMIT);
                setPageLimit(resolvedLimit);
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to fetch users');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch users');
            console.error('Fetch users error:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleViewUser = (userId: string) => {
        const user = users.find((u) => u._id === userId);
        if (user) {
            setSelectedUser(user);
            setEditingUser({ ...user }); // Create a copy for editing
            setIsViewModalOpen(true);
        }
    };

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
    };

    const handleInputChange = (field: keyof UserType, value: any) => {
        if (!editingUser) return;
        setEditingUser({
            ...editingUser,
            [field]: value
        });
    };

    const handleAddressChange = (field: keyof NonNullable<UserType['address']>, value: string) => {
        if (!editingUser) return;
        setEditingUser({
            ...editingUser,
            address: {
                ...editingUser.address,
                [field]: value
            }
        });
    };

    const handleSaveUser = async () => {
        if (!editingUser || !selectedUser) return;

        setIsUpdating(true);
        try {
            const response = await fetch(`/api/users/${selectedUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editingUser),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                
                // Update users list
                setUsers(prevUsers => 
                    prevUsers.map(user => 
                        user._id === selectedUser._id ? updatedUser : user
                    )
                );

                // Update selected user
                setSelectedUser(updatedUser);
                setEditingUser({ ...updatedUser });
                setIsEditing(false);
                
                toast.success('User updated successfully!');
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to update user');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user');
            console.error('Update user error:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleActive = async () => {
        if (!selectedUser) return;

        setIsUpdating(true);
        try {
            const response = await fetch(`/api/users/${selectedUser._id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: !selectedUser.isActive }),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                
                // Update users list
                setUsers(prevUsers => 
                    prevUsers.map(user => 
                        user._id === selectedUser._id ? updatedUser : user
                    )
                );

                // Update selected user
                setSelectedUser(updatedUser);
                setEditingUser({ ...updatedUser });
                
                toast.success(`User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully!`);
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to update user status');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user status');
            console.error('Toggle user status error:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelEdit = () => {
        if (selectedUser) {
            setEditingUser({ ...selectedUser });
        }
        setIsEditing(false);
    };

    const handleAdminToggle = async (userId: string, nextValue: boolean) => {
        setAdminToggleId(userId);
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isAdmin: nextValue ? 1 : 0 }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to update admin status');
            }

            const updatedUser = data?.user;

            setUsers(prev =>
                prev.map(user =>
                    user._id === userId
                        ? {
                            ...user,
                            ...(updatedUser || {}),
                            isAdmin: updatedUser?.isAdmin ?? (nextValue ? 1 : 0),
                          }
                        : user
                )
            );

            if (selectedUser?._id === userId) {
                const updated = {
                    ...selectedUser,
                    ...(updatedUser || {}),
                    isAdmin: updatedUser?.isAdmin ?? (nextValue ? 1 : 0),
                };
                setSelectedUser(updated);
                if (editingUser) {
                    setEditingUser(updated);
                }
            }

            toast.success(`User is now ${nextValue ? 'an admin' : 'a regular user'}.`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update admin status');
        } finally {
            setAdminToggleId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="min-h-screen w-full bg-linear-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-6 md:p-10 font-sans">
            <style jsx global>{`
                * {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                *::-webkit-scrollbar {
                    display: none;
                }
                
                html, body {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar {
                    display: none;
                }
                
                .skeleton-pulse {
                    background: linear-gradient(
                        90deg,
                        rgba(229, 231, 235, 0.8) 0%,
                        rgba(209, 213, 219, 0.9) 50%,
                        rgba(229, 231, 235, 0.8) 100%
                    );
                    background-size: 200% 100%;
                    animation: pulse 1.5s ease-in-out infinite;
                }
                @keyframes pulse {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
            `}</style>

            <div className="flex flex-col items-center mb-10">
                <div className="flex items-center gap-4 mb-6">
                    <Image
                        src="/logo.jpg"
                        alt="Robe By ShamShad Logo"
                        width={80}
                        height={80}
                        className="rounded-full object-cover shadow-lg"
                    />
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        User Management
                    </h1>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 shadow-lg overflow-hidden">
                <div className="px-6 py-5 md:px-10 md:py-6">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        User Directory
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Manage user accounts, roles, and permissions
                    </p>
                </div>
                
                <div className="border-t border-gray-600 dark:border-gray-700 p-6 md:p-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                All Users
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {users.length} users found
                            </p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute top-1/2 -translate-y-1/2 left-4 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search users by name, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:focus:ring-indigo-400 transition-all duration-300 shadow-sm hover:shadow-md cursor-text"
                                aria-label="Search users"
                            />
                        </div>
                    </div>
                    
                    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-8">
                        {isFetching ? (
                            <div className="space-y-4">
                                {Array.from({ length: pageLimit || DEFAULT_PAGE_LIMIT }).map((_, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="h-12 w-12 rounded-full skeleton-pulse" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32 rounded-lg skeleton-pulse" />
                                                <Skeleton className="h-3 w-48 rounded-lg skeleton-pulse" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-20 rounded-full skeleton-pulse" />
                                            <Skeleton className="h-6 w-24 rounded-full skeleton-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24 rounded-lg skeleton-pulse" />
                                            <Skeleton className="h-3 w-32 rounded-lg skeleton-pulse" />
                                        </div>
                                        <Skeleton className="h-8 w-8 rounded-lg skeleton-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center p-8">
                                <div className="flex flex-col items-center justify-center">
                                    <User className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                                        No users found
                                    </p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                                        Users will appear here once they register
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border border-gray-200 dark:border-gray-700 rounded-2xl">
                                <table className="w-full min-w-275 divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                User
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Contact
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Role & Status
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Admin
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Activity
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Joined
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {users.map((user) => (
                                            <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 shrink-0">
                                                            {user.avatar ? (
                                                                <Image
                                                                    src={user.avatar}
                                                                    alt={user.name}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                                    <span className="text-sm font-semibold text-white">
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {user.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                ID: {user._id.substring(0, 8)}...
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {user.email}
                                                    </div>
                                                    {user.phone && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {user.phone}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-2">
                                                        <span className={`inline-flex justify-center items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                        </span>
                                                        <span className={`inline-flex justify-center items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.isActive)}`}>
                                                            {user.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={Boolean(user.isAdmin)}
                                                            onChange={(e) => handleAdminToggle(user._id, e.target.checked)}
                                                            disabled={adminToggleId === user._id || isUpdating}
                                                        />
                                                        <span className="text-xs">
                                                            {adminToggleId === user._id ? "Updating..." : user.isAdmin ? "Admin" : "User"}
                                                        </span>
                                                    </label>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {user.totalOrders} orders
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatCurrency(user.totalSpent)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(user.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleViewUser(user._id)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 cursor-pointer group"
                                                        title="View User Details"
                                                    >
                                                        <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                                        <span className="text-sm font-medium">View</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    
                    {/* Pagination */}
                    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <button
                                className="flex items-center gap-2 rounded-full bg-linear-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-medium text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                onClick={() => handlePageChange(currentPage > 1 ? currentPage - 1 : 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span className="hidden sm:inline">Previous</span>
                            </button>
                            <span className="block text-sm font-medium text-gray-600 dark:text-gray-300 sm:hidden">
                                Page {currentPage} of {totalPages}
                            </span>
                            <ul className="hidden sm:flex items-center gap-2">
                                {Array.from({ length: totalPages }, (_, index) => {
                                    const page = index + 1;
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <li key={page}>
                                                <button
                                                    onClick={() => handlePageChange(page)}
                                                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer ${currentPage === page
                                                        ? 'bg-[#2b2720] text-[#aca08e]'
                                                        : 'text-[#362e23] bg-white hover:bg-[#dbc59c]/10'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            </li>
                                        );
                                    }
                                    if (
                                        (page === currentPage - 2 && page > 1) ||
                                        (page === currentPage + 2 && page < totalPages)
                                    ) {
                                        return (
                                            <li key={page}>
                                                <span className="flex h-10 w-10 items-center justify-center text-gray-500 dark:text-gray-400">
                                                    ...
                                                </span>
                                            </li>
                                        );
                                    }
                                    return null;
                                })}
                            </ul>
                            <button
                                className="flex items-center gap-2 rounded-full bg-linear-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-medium text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                onClick={() => handlePageChange(currentPage < totalPages ? currentPage + 1 : totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <span className="hidden sm:inline">Next</span>
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* View User Modal */}
            <Transition appear show={isViewModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsViewModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/90 backdrop-blur-md" />
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
                                <Dialog.Panel className="w-full max-w-2xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                                    {selectedUser && editingUser && (
                                        <>
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                                        User Details
                                                    </Dialog.Title>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        User ID: {selectedUser._id}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!isEditing && (
                                                        <button
                                                            onClick={handleToggleActive}
                                                            disabled={isUpdating}
                                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                                                                selectedUser.isActive
                                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                                                                    : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                                            }`}
                                                            title={selectedUser.isActive ? 'Deactivate User' : 'Activate User'}
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : selectedUser.isActive ? (
                                                                <Lock className="h-4 w-4" />
                                                            ) : (
                                                                <Unlock className="h-4 w-4" />
                                                            )}
                                                            <span className="text-sm font-medium">
                                                                {selectedUser.isActive ? 'Deactivate' : 'Activate'}
                                                            </span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={handleEditToggle}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 cursor-pointer"
                                                        title={isEditing ? 'Cancel Edit' : 'Edit User'}
                                                    >
                                                        {isEditing ? (
                                                            <>
                                                                <X className="h-4 w-4" />
                                                                <span className="text-sm font-medium">Cancel</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Edit className="h-4 w-4" />
                                                                <span className="text-sm font-medium">Edit</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-6">
                                                {/* User Profile */}
                                                <div className="flex items-center gap-6">
                                                    <div className="relative">
                                                        {selectedUser.avatar ? (
                                                            <Image
                                                                src={selectedUser.avatar}
                                                                alt={selectedUser.name}
                                                                width={80}
                                                                height={80}
                                                                className="rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                                                            />
                                                        ) : (
                                                            <div className="h-20 w-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                                <span className="text-2xl font-bold text-white">
                                                                    {selectedUser.name.charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        {isEditing ? (
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Full Name
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={editingUser.name}
                                                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                        Role
                                                                    </label>
                                                                    <Listbox value={editingUser.role} onChange={(value) => handleInputChange('role', value)}>
                                                                        <div className="relative">
                                                                            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(editingUser.role)}`}>
                                                                                    {editingUser.role.charAt(0).toUpperCase() + editingUser.role.slice(1)}
                                                                                </span>
                                                                            </Listbox.Button>
                                                                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                                                {roleOptions.map((role) => (
                                                                                    <Listbox.Option
                                                                                        key={role.value}
                                                                                        value={role.value}
                                                                                        className={({ active }) =>
                                                                                            `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                                                                                active ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200' : 'text-gray-900 dark:text-white'
                                                                                            }`
                                                                                        }
                                                                                    >
                                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                                                                                            {role.label}
                                                                                        </span>
                                                                                    </Listbox.Option>
                                                                                ))}
                                                                            </Listbox.Options>
                                                                        </div>
                                                                    </Listbox>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                                                                    {selectedUser.name}
                                                                </h4>
                                                                <div className="flex gap-2 mt-2">
                                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                                                                        <Shield className="h-3 w-3" />
                                                                        {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                                                                    </span>
                                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.isActive)}`}>
                                                                        {selectedUser.isActive ? (
                                                                            <CheckCircle className="h-3 w-3" />
                                                                        ) : (
                                                                            <XCircle className="h-3 w-3" />
                                                                        )}
                                                                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Contact Information */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Contact Information
                                                    </h4>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                <Mail className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                {isEditing ? (
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Email Address
                                                                        </label>
                                                                        <input
                                                                            type="email"
                                                                            value={editingUser.email}
                                                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-sm"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                            {selectedUser.email}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <Phone className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                {isEditing ? (
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Phone Number
                                                                        </label>
                                                                        <input
                                                                            type="tel"
                                                                            value={editingUser.phone || ''}
                                                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-sm"
                                                                            placeholder="Enter phone number"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                            {selectedUser.phone || 'Not provided'}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Address Information */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Address
                                                    </h4>
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                            <MapPin className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            {isEditing ? (
                                                                <>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                            Street Address
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingUser.address?.street || ''}
                                                                            onChange={(e) => handleAddressChange('street', e.target.value)}
                                                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-sm"
                                                                            placeholder="Enter street address"
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                City
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={editingUser.address?.city || ''}
                                                                                onChange={(e) => handleAddressChange('city', e.target.value)}
                                                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-sm"
                                                                                placeholder="City"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                                Postal Code
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={editingUser.address?.postalCode || ''}
                                                                                onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                                                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 text-sm"
                                                                                placeholder="Postal Code"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : selectedUser.address ? (
                                                                <div className="space-y-1">
                                                                    {selectedUser.address.street && (
                                                                        <p className="text-sm text-gray-900 dark:text-white">
                                                                            {selectedUser.address.street}
                                                                        </p>
                                                                    )}
                                                                    {(selectedUser.address.city || selectedUser.address.state) && (
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                            {selectedUser.address.city}{selectedUser.address.city && selectedUser.address.state ? ', ' : ''}{selectedUser.address.state}
                                                                        </p>
                                                                    )}
                                                                    {selectedUser.address.postalCode && (
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                            {selectedUser.address.postalCode}
                                                                        </p>
                                                                    )}
                                                                    {selectedUser.address.country && (
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                            {selectedUser.address.country}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    No address provided
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* User Activity */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        User Activity
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                                                <ShoppingBag className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
                                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                    {selectedUser.totalOrders}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <span className="text-lg font-bold">৳</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
                                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                    {formatCurrency(selectedUser.totalSpent)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedUser.lastOrderDate && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                                                    <Calendar className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Order</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {formatDateTime(selectedUser.lastOrderDate)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Account Information */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Account Created</p>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatDateTime(selectedUser.createdAt)}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatDateTime(selectedUser.updatedAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsViewModalOpen(false)}
                                                        className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-300 cursor-pointer"
                                                    >
                                                        Close
                                                    </button>
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={handleSaveUser}
                                                            disabled={isUpdating}
                                                            className="inline-flex items-center gap-2 justify-center rounded-lg border border-transparent bg-linear-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:from-green-600 hover:to-emerald-700 transition-all duration-300 cursor-pointer disabled:opacity-70"
                                                        >
                                                            {isUpdating ? (
                                                                <>
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                    Saving...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Save className="h-4 w-4" />
                                                                    Save Changes
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
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

export default UsersPage;
