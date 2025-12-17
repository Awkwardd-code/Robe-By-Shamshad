/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { 
  Search, Eye, ChevronLeft, ChevronRight, Package, 
  CreditCard, Truck, CheckCircle, XCircle, Clock, 
  User, Mail, Phone as PhoneIcon, Home, 
  Edit, Save, X, Loader2
} from 'lucide-react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import Image from 'next/image';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPriceToBdt } from '@/lib/currency';
import { span } from 'framer-motion/client';

// Interfaces for type safety
interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    image?: string;
}

interface ShippingAddress {
    fullName: string;
    streetAddress: string;
    apartment?: string;
    city: string;
    zipCode: string;
    phone?: string;
}

interface Order {
    _id: string;
    orderId: string;
    user?: {
        _id?: string;
        name: string;
        email: string;
        phone?: string;
    };
    items: OrderItem[];
    shippingAddress: ShippingAddress;
    payment: {
        method: 'cash_on_delivery' | 'online_payment';
        status: 'pending' | 'paid' | 'failed' | 'refunded';
        transactionId?: string;
        amount: number;
        currency: string;
        paidAt?: string;
    };
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Additional fields from checkout process
    deliveryDate?: string;
    deliveryTime?: string;
    specialInstructions?: string;
}

const DEFAULT_PAGE_LIMIT = 10;

// Order status options
const orderStatusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
];

const OrderPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [editingStatus, setEditingStatus] = useState<string | null>(null);
    const [tempStatus, setTempStatus] = useState<Order['status'] | ''>('');
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [pageLimit, setPageLimit] = useState<number>(DEFAULT_PAGE_LIMIT);

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'processing':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'shipped':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'delivered':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    // Get status icon
    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return <Clock className="h-4 w-4" />;
            case 'processing':
                return <Package className="h-4 w-4" />;
            case 'shipped':
                return <Truck className="h-4 w-4" />;
            case 'delivered':
                return <CheckCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    // Get payment method color
    const getPaymentMethodColor = (method: string) => {
        switch (method.toLowerCase()) {
            case 'cash_on_delivery':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'online_payment':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    // Get payment status color
    const getPaymentStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'refunded':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const fetchOrders = useCallback(async () => {
        setIsFetching(true);
        try {
            const response = await fetch(
                `/api/orders?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setOrders(data.orders || []);
                setTotalPages(data.totalPages || 1);
                const resolvedLimit =
                    typeof data.pageLimit === 'number' && data.pageLimit > 0
                        ? data.pageLimit
                        : (data.orders?.length || DEFAULT_PAGE_LIMIT);
                setPageLimit(resolvedLimit);
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to fetch orders');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch orders');
            console.error('Fetch orders error:', error);
        } finally {
            setIsFetching(false);
        }
    }, [currentPage, searchTerm]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleViewOrder = (orderId: string) => {
        const order = orders.find((o) => o._id === orderId);
        if (order) {
            setSelectedOrder(order);
            setIsViewModalOpen(true);
        }
    };

    const handleEditStatus = (orderId: string) => {
        const order = orders.find((o) => o._id === orderId);
        if (order) {
            setEditingStatus(orderId);
            setTempStatus(order.status);
            setStatusModalOrder(order);
            setIsStatusModalOpen(true);
        }
    };

    const handleCancelEdit = () => {
        setEditingStatus(null);
        setTempStatus('');
        setStatusModalOrder(null);
        setIsStatusModalOpen(false);
    };

    const handleStatusChange = async (orderId: string) => {
        if (!tempStatus) return;
        const nextStatus = tempStatus as Order['status'];

        setIsUpdatingStatus(true);
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: nextStatus }),
            });

            if (response.ok) {
                const updatedOrder = await response.json();
                
                // Update orders list
                setOrders(prevOrders => 
                    prevOrders.map(order => 
                        order._id === orderId ? { ...order, status: nextStatus } : order
                    )
                );

                // Update selected order if it's open
                if (selectedOrder && selectedOrder._id === orderId) {
                    setSelectedOrder({ ...selectedOrder, status: nextStatus });
                }

                if (statusModalOrder && statusModalOrder._id === orderId) {
                    setStatusModalOrder({ ...statusModalOrder, status: nextStatus });
                }

                setEditingStatus(null);
                setTempStatus('');
                setIsStatusModalOpen(false);
                setStatusModalOrder(null);
                toast.success('Order status updated successfully!');
            } else {
                const errorData = await response.json();
                toast.error(errorData?.error || 'Failed to update order status');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update order status');
            console.error('Update order status error:', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatShortDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const formatPaymentMethod = (method: string) => {
        switch (method.toLowerCase()) {
            case 'cash_on_delivery':
                return 'Cash on Delivery';
            case 'online_payment':
                return 'Online Payment';
            default:
                return method.charAt(0).toUpperCase() + method.slice(1);
        }
    };

    const formatPaymentStatus = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const formatStatus = (status: string) => {
        const option = orderStatusOptions.find(opt => opt.value === status);
        return option ? option.label : status.charAt(0).toUpperCase() + status.slice(1);
    };

    const buildAddressString = (address: ShippingAddress) => {
        const parts = [
            address.streetAddress,
            address.apartment,
            address.city,
            address.zipCode,
        ].filter(Boolean);
        return parts.join(', ');
    };

    const renderStatusEditor = (order: Order) => (
        <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                {formatStatus(order.status)}
            </span>
            <button
                onClick={() => handleEditStatus(order._id)}
                className="p-1 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors cursor-pointer"
                title="Edit Status"
            >
                <Edit className="h-3 w-3" />
            </button>
        </div>
    );

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
                        alt="Robe By Shamshad Logo"
                        width={80}
                        height={80}
                        className="rounded-full object-cover shadow-lg"
                    />
                    <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Order Management
                    </h1>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 shadow-lg overflow-hidden">
                <div className="px-6 py-5 md:px-10 md:py-6">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Order Catalog
                    </h3>
                </div>
                
                <div className="border-t border-gray-600 dark:border-gray-700 p-6 md:p-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            All Orders
                        </h3>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute top-1/2 -translate-y-1/2 left-4 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search orders by ID, customer name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:focus:ring-indigo-400 transition-all duration-300 shadow-sm hover:shadow-md cursor-text"
                                aria-label="Search orders"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--color-gray-300)_var(--color-gray-100)] dark:[scrollbar-color:var(--color-gray-600)_var(--color-gray-800)] pb-8">
                        {isFetching ? (
                            <div className="space-y-4" style={{ minWidth: "1200px" }}>
                                {Array.from({ length: pageLimit || DEFAULT_PAGE_LIMIT }).map((_, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32 rounded-lg skeleton-pulse" />
                                            <Skeleton className="h-3 w-48 rounded-lg skeleton-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24 rounded-lg skeleton-pulse" />
                                            <Skeleton className="h-3 w-32 rounded-lg skeleton-pulse" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-6 w-28 rounded-full skeleton-pulse" />
                                        </div>
                                        <Skeleton className="h-8 w-8 rounded-lg skeleton-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center p-8">
                                <div className="flex flex-col items-center justify-center">
                                    <Package className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                                        No orders found
                                    </p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                                        Orders will appear here once customers make purchases
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-2xl">
                                <table
                                    className="w-full divide-y divide-gray-200 dark:divide-gray-700"
                                    style={{ minWidth: "1200px" }}
                                >
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "120px" }}
                                            >
                                                Order ID
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "180px" }}
                                            >
                                                Customer
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "150px" }}
                                            >
                                                Date
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "120px" }}
                                            >
                                                Items
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "100px" }}
                                            >
                                                Amount
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "140px" }}
                                            >
                                                Payment
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider min-w-40">
                                                Status
                                            </th>
                                           
                                            <th
                                                scope="col"
                                                className="px-6 py-4 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                                                style={{ minWidth: "100px" }}
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {orders.map((order) => (
                                            <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    style={{ minWidth: "120px" }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {order.orderId}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatShortDate(order.createdAt)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    style={{ minWidth: "180px" }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {order.shippingAddress.fullName}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {order.user?.email || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                                                    style={{ minWidth: "150px" }}
                                                >
                                                    {formatDate(order.createdAt)}
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    style={{ minWidth: "120px" }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {order.items[0]?.productName || 'No items'}
                                                            {order.items.length > 1 && ` +${order.items.length - 1} more`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    style={{ minWidth: "100px" }}
                                                >
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {formatPriceToBdt(order.total)}
                                                    </span>
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap"
                                                    style={{ minWidth: "140px" }}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(order.payment.method)}`}>
                                                            {formatPaymentMethod(order.payment.method)}
                                                        </span>
                                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment.status)}`}>
                                                            {formatPaymentStatus(order.payment.status)}
                                                        </span>
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-4 whitespace-nowrap min-w-40">
                                                    {renderStatusEditor(order)}
                                                </td>
                                                <td
                                                    className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                                                    style={{ minWidth: "100px" }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewOrder(order._id)}
                                                            className="px-4 py-2 cursor-pointer bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                            title="View Order Details"
                                                        >
                                                            <Eye className="h-4 w-4 inline mr-1" />
                                                            View
                                                        </button>
                                                    </div>
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

            {/* View Order Modal */}
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
                                <Dialog.Panel className="w-full max-w-5xl transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-8 text-left shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                                    {selectedOrder && (
                                        <>
                                            <div className="flex justify-between items-start mb-6">
                                                <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                                    Order Details - {selectedOrder.orderId}
                                                </Dialog.Title>
                                                <button
                                                    onClick={() => setIsViewModalOpen(false)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                                >
                                                    <X className="h-5 w-5 text-gray-500" />
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-6">
                                                {/* Order Status & Summary */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${getStatusColor(selectedOrder.status).split(' ')[0]} ${getStatusColor(selectedOrder.status).split(' ')[1]}`}>
                                                                {getStatusIcon(selectedOrder.status)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                    {formatStatus(selectedOrder.status)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleEditStatus(selectedOrder._id)}
                                                            className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors cursor-pointer"
                                                            title="Edit Status"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    </div>
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                <CreditCard className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Payment</p>
                                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                    {formatPaymentStatus(selectedOrder.payment.status)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                <Package className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Items</p>
                                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                    {selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? 's' : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${getPaymentMethodColor(selectedOrder.payment.method).split(' ')[0]} ${getPaymentMethodColor(selectedOrder.payment.method).split(' ')[1]}`}>
                                                                <CreditCard className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Method</p>
                                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                    {formatPaymentMethod(selectedOrder.payment.method)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Customer Information */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Customer Information
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                                <User className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {selectedOrder.shippingAddress.fullName}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                                <Mail className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {selectedOrder.user?.email || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {(selectedOrder.user?.phone || selectedOrder.shippingAddress.phone) && (
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                                    <PhoneIcon className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {selectedOrder.shippingAddress.phone || selectedOrder.user?.phone}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Shipping Address */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                            <Home className="h-5 w-5" />
                                                        </div>
                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            Shipping Address
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-2 pl-11">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {selectedOrder.shippingAddress.fullName}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            {selectedOrder.shippingAddress.streetAddress}
                                                        </p>
                                                        {selectedOrder.shippingAddress.apartment && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                {selectedOrder.shippingAddress.apartment}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.zipCode}
                                                        </p>
                                                        {selectedOrder.shippingAddress.phone && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                Phone: {selectedOrder.shippingAddress.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Order Items - Detailed View */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Order Items ({selectedOrder.items.length})
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {selectedOrder.items.map((item, index) => (
                                                            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                                                                <div className="flex items-center gap-4">
                                                                    {item.image ? (
                                                                        <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                                            <Image
                                                                                src={item.image}
                                                                                alt={item.productName}
                                                                                fill
                                                                                className="object-cover"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="h-16 w-16 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                                            <Package className="h-8 w-8 text-gray-400" />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                            {item.productName}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                            Product ID: {item.productId}
                                                                        </p>
                                                                        <div className="flex items-center gap-4 mt-1">
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                Quantity: <span className="font-medium">{item.quantity}</span>
                                                                            </p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                Unit Price: <span className="font-medium">{formatPriceToBdt(item.unitPrice)}</span>
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                        {formatPriceToBdt(item.totalPrice)}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        Total
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Payment Information */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Payment Information
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                                                            <p className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${getPaymentMethodColor(selectedOrder.payment.method)}`}>
                                                                {formatPaymentMethod(selectedOrder.payment.method)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Status</p>
                                                            <p className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${getPaymentStatusColor(selectedOrder.payment.status)}`}>
                                                                {formatPaymentStatus(selectedOrder.payment.status)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Transaction ID</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {selectedOrder.payment.transactionId || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Paid At</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {selectedOrder.payment.paidAt ? formatDate(selectedOrder.payment.paidAt) : 'Not paid'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Amount</p>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {formatPriceToBdt(selectedOrder.payment.amount)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Currency</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {selectedOrder.payment.currency}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Order Summary */}
                                                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                        Order Summary
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-gray-600 dark:text-gray-300">Subtotal</span>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {formatPriceToBdt(selectedOrder.subtotal)}
                                                            </span>
                                                        </div>
                                                        {selectedOrder.shippingCost > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600 dark:text-gray-300">Shipping Cost</span>
                                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {formatPriceToBdt(selectedOrder.shippingCost)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {selectedOrder.taxAmount > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600 dark:text-gray-300">Tax</span>
                                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {formatPriceToBdt(selectedOrder.taxAmount)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {selectedOrder.discountAmount > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600 dark:text-gray-300">Discount</span>
                                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                                    -{formatPriceToBdt(selectedOrder.discountAmount)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount</span>
                                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                                    {formatPriceToBdt(selectedOrder.total)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Additional Information */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Order Created</p>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatDate(selectedOrder.createdAt)}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatDate(selectedOrder.updatedAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Order Notes & Special Instructions */}
                                                {(selectedOrder.notes || selectedOrder.specialInstructions) && (
                                                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                                            Additional Information
                                                        </h4>
                                                        {selectedOrder.notes && (
                                                            <div className="mb-3">
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Order Notes</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                    {selectedOrder.notes}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {selectedOrder.specialInstructions && (
                                                            <div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Special Instructions</p>
                                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                    {selectedOrder.specialInstructions}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Close Button */}
                                                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsViewModalOpen(false)}
                                                        className="inline-flex justify-center rounded-lg border border-transparent bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
                                                    >
                                                        Close
                                                    </button>
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

            {/* Status Update Modal */}
            <Transition appear show={isStatusModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={handleCancelEdit}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm" />
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
                                <Dialog.Panel className="w-full max-w-md transform rounded-3xl bg-white/95 dark:bg-gray-800/95 p-6 text-left shadow-2xl transition-all">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                        Update Order Status
                                        {statusModalOrder ? ` - ${statusModalOrder.orderId}` : ''}
                                    </Dialog.Title>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Select new status</p>
                                            <Listbox value={tempStatus} onChange={setTempStatus}>
                                                <div className="relative">
                                                    <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-300 sm:text-sm">
                                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tempStatus || statusModalOrder?.status || 'pending')}`}>
                                                            {formatStatus(tempStatus || statusModalOrder?.status || 'pending')}
                                                        </span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                            <ChevronLeft className="h-5 w-5 text-gray-400 rotate-90" />
                                                        </span>
                                                    </Listbox.Button>
                                                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                                        {orderStatusOptions.map((statusOption) => (
                                                            <Listbox.Option
                                                                key={statusOption.value}
                                                                value={statusOption.value as Order['status']}
                                                                className={({ active }) =>
                                                                    `relative cursor-default select-none py-2 pl-3 pr-4 ${
                                                                        active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                                                    }`
                                                                }
                                                            >
                                                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${statusOption.color}`}>
                                                                    {statusOption.label}
                                                                </span>
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </div>
                                            </Listbox>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="inline-flex justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 shadow transition-all duration-200 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!tempStatus || isUpdatingStatus || !statusModalOrder}
                                            onClick={() => statusModalOrder && handleStatusChange(statusModalOrder._id)}
                                            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-linear-to-r from-green-500 to-green-600 px-5 py-2 text-sm font-semibold text-white hover:from-green-600 hover:to-green-700 shadow disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                                        >
                                            {isUpdatingStatus ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save
                                                </>
                                            )}
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

export default OrderPage;
