/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Search,
    Heart,
    ShoppingCart,
    User,
    Menu,
    X,
    ChevronRight,
    Package,
    Settings,
    LogOut,
    UserCircle,
    Mail,
    Clock,
    MapPin,
    Phone,
    Sparkles,
    Crown,
    Truck,
    CreditCard,
    Star,
    Tag,
    Percent,
    Award,
    Home,
    ChevronDown,
    ChevronUp,
    Bell,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@/context/AuthContext";
import { useCommerce, type CartEntry } from "@/context/CommerceContext";

/* ----------------------------- Brand Config ----------------------------- */
const BRAND_NAME = "ROBE BY SHAMSHAD";
const LOGO_SRC = "/logo.jpg";

/* ----------------------------- COLORS (From Screenshot Analysis) ----------------------------- */
const COLORS = {
    // Primary colors from screenshot
    primary: "#1F1B18", // Dark charcoal for main text (ROB BY SHAMSHAD)
    secondary: "#6B0F1A", // Deep burgundy/maroon accent
    accent: "#C41E3A", // Bright red for SALE highlights
    light: "#F5EFE9", // Cream/beige background
    gold: "#D4A76A", // Gold accent
    gray: "#8C7F78", // Warm gray for secondary text
    border: "#E7E2DE", // Light beige border
    white: "#FFFFFF",
};

/* ----------------------------- FONTS (From Screenshot Analysis) ----------------------------- */
// Based on the screenshot analysis:
// 1. Main brand: Bold, modern sans-serif (like Montserrat Bold/Black)
// 2. Subtitle: Elegant script/serif (like Playfair Display)
// 3. Navigation: Clean sans-serif (like Inter/Open Sans)

const FONTS = {
    brand: "var(--font-montserrat), 'Montserrat', sans-serif",
    subtitle: "var(--font-playfair), 'Playfair Display', serif",
    nav: "var(--font-inter), 'Inter', sans-serif",
    body: "var(--font-inter), 'Inter', sans-serif",
};

/* ----------------------------- Skeleton Components ----------------------------- */
const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse bg-[#F5EFE9] rounded ${className}`} />
);

const UserAvatarSkeleton = () => (
    <div className="relative h-9 w-9 rounded-full bg-linear-to-br from-[#F6F3F1] to-[#E7E2DE] animate-pulse">
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-[#6B0F1A]/10 to-[#D4A76A]/10" />
    </div>
);

const NavItemSkeleton = () => (
    <div className="flex items-center gap-1">
        <Skeleton className="h-5 w-16" />
    </div>
);

const ProfileQuickStatsSkeleton = () => (
    <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-[#E7E2DE] bg-[#F5EFE9] px-3 py-2">
                <Skeleton className="h-2.5 w-8 mb-1.5" />
                <Skeleton className="h-3.5 w-6" />
            </div>
        ))}
    </div>
);

/* ----------------------------- Animations ----------------------------- */
const panelVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.14 } },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring" as const, stiffness: 360, damping: 28 },
    },
    exit: { opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.12 } },
};

const drawerVariants = {
    hidden: { x: "100%" },
    visible: {
        x: 0,
        transition: { type: "spring" as const, stiffness: 320, damping: 30 },
    },
    exit: {
        x: "100%",
        transition: { type: "spring" as const, stiffness: 320, damping: 34 },
    },
};

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3 }
    }
};

const scaleIn = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: { type: "spring", stiffness: 300 }
    }
};

/* ----------------------------- Helpers ----------------------------- */
function useEscToClose(isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);
}

function useLockBodyScroll(locked: boolean) {
    useEffect(() => {
        if (!locked) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [locked]);
}

function formatCurrency(amount: number) {
    return `BDT ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/* ----------------------------- UI Components ----------------------------- */
const IconButton = ({
    icon: Icon,
    label,
    onClick,
    count = 0,
    active = false,
    loading = false,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    count?: number;
    active?: boolean;
    loading?: boolean;
}) => {
    const displayCount = count > 99 ? "99+" : count.toString();

    if (loading) {
        return (
            <div className="relative flex h-9 w-9 items-center justify-center">
                <Skeleton className="h-full w-full rounded-full" />
            </div>
        );
    }

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`relative cursor-pointer flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${active
                ? "bg-[#F5EFE9] text-[#6B0F1A]"
                : "text-[#1F1B18] hover:bg-[#F6F3F1] hover:text-[#1F1B18]"
                }`}
            aria-label={label}
            type="button"
        >
            <Icon className="h-5 w-5" />
            {count > 0 && (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C41E3A] px-1 text-[10px] font-bold text-white"
                >
                    {displayCount}
                </motion.span>
            )}
        </motion.button>
    );
};

const Button = ({
    variant = "primary",
    size = "md",
    leftIcon: LeftIcon,
    children,
    loading = false,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline" | "sale";
    size?: "sm" | "md" | "lg";
    leftIcon?: React.ComponentType<{ className?: string }>;
    loading?: boolean;
}) => {
    const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2";
    const sizes = {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base"
    }[size];

    const variants = {
        primary: "bg-[#1F1B18] text-white hover:bg-[#2C2621] focus:ring-[#1F1B18]/30",
        secondary: "bg-[#F5EFE9] text-[#1F1B18] hover:bg-[#E7E2DE] focus:ring-[#F5EFE9]",
        outline: "border border-[#E7E2DE] bg-transparent text-[#1F1B18] hover:bg-[#F5EFE9] focus:ring-[#E7E2DE]",
        sale: "bg-[#C41E3A] text-white hover:bg-[#D63B54] focus:ring-[#C41E3A]/30"
    }[variant];

    const { onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, className, ...restProps } = props;
    const classes = `${base} ${sizes} ${variants}${className ? ` ${className}` : ""}`;

    if (loading) {
        return (
            <div className={classes}>
                <Skeleton className="h-4 w-full rounded" />
            </div>
        );
    }

    return (
        <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            className={classes}
            {...restProps}
        >
            {LeftIcon ? <LeftIcon className="h-4 w-4" /> : null}
            {children}
        </motion.button>
    );
};

const PanelShell = ({
    isOpen,
    onClose,
    topOffset,
    maxWidthClass,
    align = "right",
    children,
    withBackdrop = true,
}: {
    isOpen: boolean;
    onClose: () => void;
    topOffset: number;
    maxWidthClass: string;
    align?: "right" | "center";
    children: React.ReactNode;
    withBackdrop?: boolean;
}) => {
    useEscToClose(isOpen, onClose);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {withBackdrop && (
                        <motion.div
                            variants={backdropVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                            onClick={onClose}
                        />
                    )}

                    <div
                        className={`fixed left-0 right-0 z-50 px-4 pointer-events-none ${align === "right" ? "flex justify-end" : "flex justify-center"
                            }`}
                        style={{ top: topOffset }}
                    >
                        <motion.div
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`pointer-events-auto w-full ${maxWidthClass} rounded-xl border border-[#E7E2DE] bg-white shadow-2xl`}
                            role="dialog"
                            aria-modal="true"
                        >
                            {children}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};


/* ----------------------------- Panels ----------------------------- */

type NavItem = {
    label: string;
    href: string;
    highlight?: boolean;
    isSale?: boolean;
    isNew?: boolean;
    categorySlug?: string;
};

const STATIC_NAV_ITEMS: NavItem[] = [
    { label: "HOME", href: "/" },
    { label: "PRODUCTS", href: "/products" },
    { label: "SALE", href: "/sales", highlight: true },
    { label: "ABOUT US", href: "/about" },
];

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

type CategoryMeta = {
    name: string;
    slug: string;
};


const SearchPanel = ({
    isOpen,
    onClose,
    topOffset,
    categories,
    isLoading,
    onPickCategory,
    onSearch,
}: {
    isOpen: boolean;
    onClose: () => void;
    topOffset: number;
    categories: string[];
    isLoading: boolean;
    onPickCategory: (categoryName: string) => void;
    onSearch: (query: string) => void;
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const recentSearches = ["Winter Collection", "Silk", "Premium", "New Arrivals"];
    const availableCategories = categories.length ? categories : [];

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;
        onSearch(query);
        onClose();
    };

    useEffect(() => {
        if (!isOpen) return;
        const frame = requestAnimationFrame(() => setSearchQuery(""));
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    return (
        <PanelShell
            isOpen={isOpen}
            onClose={onClose}
            topOffset={topOffset}
            maxWidthClass="max-w-2xl"
            align="center"
        >
            <div className="p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2
                            className="text-xl font-bold text-[#1F1B18]"
                            style={{ fontFamily: FONTS.brand }}
                        >
                            Search Products
                        </h2>
                        <p
                            className="mt-1 text-sm text-[#8C7F78]"
                            style={{ fontFamily: FONTS.body }}
                        >
                            Discover premium fashion collections
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer rounded-full p-2 hover:bg-[#F5EFE9] transition-colors"
                        type="button"
                        aria-label="Close search"
                    >
                        <X className="h-5 w-5 text-[#8C7F78]" />
                    </button>
                </div>

                <form className="relative mb-6" onSubmit={handleSubmit}>
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8C7F78]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="What are you looking for?"
                        className="w-full rounded-lg border border-[#E7E2DE] bg-white py-3 pl-12 pr-20 text-[#1F1B18] placeholder-[#8C7F78] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/20 transition-all"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[#6B0F1A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5E0D17] transition-colors"
                    >
                        Search
                    </button>
                </form>

                <div className="mb-6">
                    <h3
                        className="mb-3 text-sm font-semibold text-[#1F1B18]"
                        style={{ fontFamily: FONTS.nav }}
                    >
                        Recent Searches
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                            <button
                                key={term}
                                onClick={() => {
                                    setSearchQuery(term);
                                    onSearch(term);
                                    onClose();
                                }}
                                className="rounded-full bg-[#F5EFE9] px-3 py-1.5 text-sm text-[#1F1B18] transition-colors hover:bg-[#E7E2DE]"
                                type="button"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-2">
                    <h3
                        className="mb-3 text-sm font-semibold text-[#1F1B18]"
                        style={{ fontFamily: FONTS.nav }}
                    >
                        Categories
                    </h3>

                    <div className="flex flex-wrap gap-2">
                        {isLoading
                            ? Array.from({ length: 4 }).map((_, idx) => (
                                <Skeleton
                                    key={`search-skeleton-${idx}`}
                                    className="h-8 w-20 rounded-full"
                                />
                            ))
                            : availableCategories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => {
                                        onPickCategory(category);
                                        onClose();
                                    }}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${category === "Sale"
                                        ? "bg-[#C41E3A] text-white hover:bg-[#D63B54]"
                                        : "bg-[#F5EFE9] text-[#1F1B18] hover:bg-[#E7E2DE]"
                                        }`}
                                    type="button"
                                >
                                    {category}
                                </button>
                            ))}
                    </div>
                </div>
            </div>
        </PanelShell>
    );
};

const WishlistPanel = ({
    isOpen,
    onClose,
    topOffset,
}: {
    isOpen: boolean;
    onClose: () => void;
    topOffset: number;
}) => {
    const { wishlistItems, addToCart, removeFromWishlist } = useCommerce();
    const itemCount = wishlistItems.length;

    return (
        <PanelShell
            isOpen={isOpen}
            onClose={onClose}
            topOffset={topOffset}
            maxWidthClass="max-w-sm"
            align="right"
        >
            <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-[#F5EFE9] p-2">
                            <Heart className="h-5 w-5 text-[#C41E3A]" />
                        </div>
                        <div>
                            <h2
                                className="text-base font-bold text-[#1F1B18]"
                                style={{ fontFamily: FONTS.brand }}
                            >
                                Wishlist
                            </h2>
                            <p className="text-xs text-[#8C7F78]">
                                {itemCount} {itemCount === 1 ? "item" : "items"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer rounded-full p-2 hover:bg-[#F5EFE9] transition-colors"
                        type="button"
                        aria-label="Close wishlist"
                    >
                        <X className="h-4 w-4 text-[#8C7F78]" />
                    </button>
                </div>

                {itemCount > 0 ? (
                    <>
                        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                            {wishlistItems.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 rounded-lg border border-[#E7E2DE] p-2.5 hover:bg-[#F5EFE9] transition-colors"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5EFE9]">
                                        {product.image ? (
                                            <Image
                                                src={product.image}
                                                alt={product.name}
                                                width={48}
                                                height={48}
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            <Package className="h-5 w-5 text-[#8C7F78]" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[#1F1B18]">
                                            {product.name}
                                        </p>
                                        <div className="mt-0.5 flex items-center justify-between">
                                            <span className="text-xs text-[#8C7F78]">
                                                {product.category ?? "Collection"}
                                            </span>
                                            <span className="text-sm font-bold text-[#1F1B18]">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                onClick={() => addToCart(product)}
                                            >
                                                Add to cart
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => removeFromWishlist(product.id)}
                                                className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C41E3A]"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                                href="/products"
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E7E2DE] bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#1F1B18] transition-colors hover:border-[#C41E3A] hover:bg-[#F5EFE9]"
                            >
                                Browse
                            </Link>
                            <Link
                                href="/wishlist"
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#C41E3A] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-[#8C7F78]"
                            >
                                <Heart className="h-4 w-4" />
                                View All
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="py-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5EFE9]">
                            <Heart className="h-6 w-6 text-[#8C7F78]" />
                        </div>
                        <p
                            className="text-sm font-semibold text-[#1F1B18]"
                            style={{ fontFamily: FONTS.brand }}
                        >
                            Wishlist is empty
                        </p>
                        <p className="mt-1 text-xs text-[#8C7F78]">Save items you love</p>
                        <div className="mt-3">
                            <Button variant="primary" size="sm" type="button">
                                Start Shopping
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </PanelShell>
    );
};

const CartPanel = ({
    isOpen,
    onClose,
    topOffset,
}: {
    isOpen: boolean;
    onClose: () => void;
    topOffset: number;
}) => {
    const { cartItems, addToCart, removeFromCart } = useCommerce();

    const subtotal = useMemo(
        () =>
            cartItems.reduce(
                (sum, entry) => sum + entry.product.price * entry.quantity,
                0
            ),
        [cartItems]
    );

    const handleDecrease = (entry: CartEntry) => {
        if (entry.quantity <= 1) {
            removeFromCart(entry.product.id);
            return;
        }
        removeFromCart(entry.product.id);
        addToCart(entry.product, entry.quantity - 1);
    };

    const handleIncrease = (entry: CartEntry) => {
        addToCart(entry.product, 1);
    };

    return (
        <PanelShell
            isOpen={isOpen}
            onClose={onClose}
            topOffset={topOffset}
            maxWidthClass="max-w-sm"
            align="right"
        >
            <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-[#F5EFE9] p-2">
                            <ShoppingCart className="h-5 w-5 text-[#1F1B18]" />
                        </div>
                        <div>
                            <h2
                                className="text-base font-bold text-[#1F1B18]"
                                style={{ fontFamily: FONTS.brand }}
                            >
                                Shopping Cart
                            </h2>
                            <p className="text-xs text-[#8C7F78]">
                                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer rounded-full p-2 hover:bg-[#F5EFE9] transition-colors"
                        type="button"
                        aria-label="Close cart"
                    >
                        <X className="h-4 w-4 text-[#8C7F78]" />
                    </button>
                </div>

                {cartItems.length > 0 ? (
                    <>
                        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                            {cartItems.map((entry) => (
                                <div
                                    key={entry.product.id}
                                    className="flex items-center gap-3 rounded-lg border border-[#E7E2DE] p-2.5 hover:bg-[#F5EFE9] transition-colors"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F5EFE9]">
                                        {entry.product.image ? (
                                            <Image
                                                src={entry.product.image}
                                                alt={entry.product.name}
                                                width={48}
                                                height={48}
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            <Package className="h-5 w-5 text-[#8C7F78]" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[#1F1B18]">
                                            {entry.product.name}
                                        </p>
                                        <div className="mt-0.5 flex items-center justify-between">
                                            <span className="text-xs text-[#8C7F78]">
                                                {entry.product.category ?? "Collection"}
                                            </span>
                                            <span className="text-sm font-bold text-[#1F1B18]">
                                                {formatCurrency(entry.product.price)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2DE] bg-white px-2 py-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDecrease(entry)}
                                                    className="text-[#8C7F78] hover:text-[#1F1B18]"
                                                    aria-label="Decrease quantity"
                                                >
                                                    -
                                                </button>
                                                <span className="w-5 text-center text-xs font-semibold text-[#1F1B18]">
                                                    {entry.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleIncrease(entry)}
                                                    className="text-[#8C7F78] hover:text-[#1F1B18]"
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(entry.product.id)}
                                                className="cursor-pointer rounded-md p-1.5 hover:bg-[#F5EFE9] transition-colors"
                                                type="button"
                                                aria-label="Remove item"
                                            >
                                                <X className="h-4 w-4 text-[#8C7F78]" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 rounded-lg bg-[#F5EFE9] p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-[#8C7F78]">Subtotal</span>
                                <span className="text-sm font-extrabold text-[#1F1B18]">
                                    {formatCurrency(subtotal)}
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#8C7F78]">
                                Free shipping over {formatCurrency(2000)}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Link
                                    href="/cart"
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E7E2DE] bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#1F1B18] transition-colors hover:border-[#C41E3A] hover:bg-[#F5EFE9]"
                                >
                                    View Cart
                                </Link>
                                <Link
                                    href="/checkout"
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1F1B18] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-[#2C2621]"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Checkout
                                </Link>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F5EFE9]">
                            <ShoppingCart className="h-6 w-6 text-[#8C7F78]" />
                        </div>
                        <p
                            className="text-sm font-semibold text-[#1F1B18]"
                            style={{ fontFamily: FONTS.brand }}
                        >
                            Cart is empty
                        </p>
                        <p className="mt-1 text-xs text-[#8C7F78]">Add products to continue</p>
                        <div className="mt-3">
                            <Button variant="primary" size="sm" type="button">
                                Start Shopping
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </PanelShell>
    );
};

const ProfileDropdown = ({
    user,
    isOpen,
    onClose,
    onLogout,
    topOffset,
    loading = false,
    logoutLoading = false,
}: {
    user: AuthUser | null;
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    topOffset: number;
    loading?: boolean;
    logoutLoading?: boolean;
}) => {
    useEscToClose(isOpen, onClose);
    const { cartItems, wishlistItems } = useCommerce();
    const [orderCount, setOrderCount] = useState<number | null>(null);
    const [isOrdersLoading, setIsOrdersLoading] = useState(false);

    useEffect(() => {
        const userId = user?.id;
        if (!isOpen || !userId) return;
        let isActive = true;
        const controller = new AbortController();

        const resolveOrderCount = async () => {
            setIsOrdersLoading(true);
            setOrderCount(null);
            try {
                let page = 1;
                let totalPages = 1;
                let matchedCount = 0;

                while (page <= totalPages) {
                    const response = await fetch(`/api/orders?page=${page}&limit=50`, {
                        cache: "no-store",
                        signal: controller.signal,
                    });

                    if (!response.ok) {
                        throw new Error("Failed to load orders");
                    }

                    const data = await response.json();
                    const orders = Array.isArray(data?.orders) ? data.orders : [];

                    matchedCount += orders.reduce((acc: number, order: unknown) => {
                        if (!order || typeof order !== "object") return acc;
                        const record = order as { userId?: unknown };
                        const rawUserId = record.userId;
                        if (typeof rawUserId === "string") {
                            return rawUserId === userId ? acc + 1 : acc;
                        }
                        if (rawUserId && typeof rawUserId === "object") {
                            const oid = rawUserId as { $oid?: unknown; toString?: () => string };
                            if (typeof oid.$oid === "string") {
                                return oid.$oid === userId ? acc + 1 : acc;
                            }
                            if (typeof oid.toString === "function") {
                                return oid.toString() === userId ? acc + 1 : acc;
                            }
                        }
                        return acc;
                    }, 0);

                    totalPages = typeof data?.totalPages === "number" ? data.totalPages : page;
                    page += 1;
                }

                if (isActive) setOrderCount(matchedCount);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    console.error("Failed to load order count", error);
                }
                if (isActive) setOrderCount(0);
            } finally {
                if (isActive) setIsOrdersLoading(false);
            }
        };

        void resolveOrderCount();

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [isOpen, user?.id]);

    if (!user && !loading) {
        return null;
    }

    const isAdmin = user?.isAdmin === 1;
    const joinedYear = new Date().getFullYear().toString();
    const displayName = user?.name || "ROBE Member";
    const displayEmail = user?.email;

    const cartCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
    const wishlistCount = wishlistItems.length;
    const ordersValue = orderCount === null || isOrdersLoading ? "..." : `${orderCount}`;

    const quickStats = [
        { label: "Orders", value: ordersValue },
        { label: "Wishlist", value: `${wishlistCount}` },
        { label: "Cart", value: `${cartCount}` }
    ];

    const menuItems = [
        { icon: UserCircle, label: "My Profile", href: "/profile" },
        // { icon: Package, label: "My Orders", href: "/orders" },
        ...(isAdmin
            ? [
                { icon: Crown, label: "AdminDashboard", href: "/dashboard" },
            ]
            : []),
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={onClose}
                    />

                    <div
                        className="fixed right-4 z-50 pointer-events-none"
                        style={{ top: topOffset }}
                    >
                        <motion.div
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="pointer-events-auto w-90 overflow-hidden rounded-xl border border-[#E7E2DE] bg-white shadow-2xl"
                        >
                            <div className="px-5 pt-5 pb-4">
                                {loading ? (
                                    <>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-4">
                                                <Skeleton className="h-12 w-12 rounded-full" />
                                                <div className="min-w-0">
                                                    <Skeleton className="h-5 w-32 mb-2" />
                                                    <Skeleton className="h-4 w-24 mb-1" />
                                                    <Skeleton className="h-3 w-28" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                        </div>
                                        <div className="mt-4">
                                            <ProfileQuickStatsSkeleton />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-4">
                                                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#1F1B18] text-white overflow-hidden">
                                                    {user?.avatar ? (
                                                        <Image
                                                            src={user.avatar}
                                                            alt={displayName}
                                                            fill
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <User className="h-5 w-5" />
                                                    )}
                                                    {isAdmin && (
                                                        <span className="absolute -bottom-1 -right-1 inline-flex items-center rounded-full bg-[#F5EFE9] px-2 py-1 text-[10px] font-bold text-[#6B0F1A] shadow">
                                                            <Crown className="h-3 w-3" />
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-extrabold text-[#1F1B18]" style={{ fontFamily: FONTS.brand }}>
                                                        {displayName}
                                                    </p>
                                                    {displayEmail && (
                                                        <p className="truncate text-sm text-[#8C7F78]">
                                                            {displayEmail}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 text-xs text-[#8C7F78]">
                                                        Member since{" "}
                                                        <span className="font-semibold text-[#1F1B18]">
                                                            {joinedYear}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={onClose}
                                                className="cursor-pointer rounded-full p-2 hover:bg-[#F5EFE9] transition-colors"
                                                aria-label="Close profile"
                                                type="button"
                                            >
                                                <X className="h-4 w-4 text-[#8C7F78]" />
                                            </button>
                                        </div>

                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {quickStats.map((s) => (
                                                <div
                                                    key={s.label}
                                                    className="rounded-lg border border-[#E7E2DE] bg-[#F5EFE9] px-3 py-2"
                                                >
                                                    <p className="text-[11px] font-semibold text-[#8C7F78]">
                                                        {s.label}
                                                    </p>
                                                    <p className="mt-0.5 text-sm font-extrabold text-[#1F1B18]">
                                                        {s.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        type="button"
                                        leftIcon={Sparkles}
                                        loading={loading}
                                    >
                                        Rewards
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        leftIcon={Package}
                                        loading={loading}
                                    >
                                        Orders
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t border-[#E7E2DE]">
                                <div className="py-2">
                                    {loading ? (
                                        <>
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-center gap-4 px-5 py-3">
                                                    <Skeleton className="h-5 w-5 rounded" />
                                                    <Skeleton className="h-4 flex-1" />
                                                    <Skeleton className="h-4 w-4 rounded" />
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        menuItems.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <a
                                                    key={item.label}
                                                    href={item.href}
                                                    onClick={onClose}
                                                    className="flex items-center gap-4 px-5 py-3 text-sm font-semibold text-[#1F1B18] transition hover:bg-[#F5EFE9]"
                                                    style={{ fontFamily: FONTS.nav }}
                                                >
                                                    <Icon className="h-5 w-5 text-[#8C7F78]" />
                                                    <span className="flex-1">{item.label}</span>
                                                    <ChevronRight className="h-4 w-4 text-[#E7E2DE]" />
                                                </a>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="border-t border-[#E7E2DE] bg-linear-to-r from-[#FDF4F2] via-white to-[#FDF4F2] px-5 py-4">
                                    <Button
                                        type="button"
                                        variant="sale"
                                        size="sm"
                                        className="w-full uppercase tracking-[0.28em] text-[11px] shadow-sm hover:shadow-md"
                                        onClick={onLogout}
                                        leftIcon={LogOut}
                                        loading={logoutLoading}
                                        disabled={logoutLoading}
                                    >
                                        Sign Out
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

const MobileMenu = ({
    isOpen,
    onClose,
    navItems,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    navItems: NavItem[];
    isLoading: boolean;
}) => {
    useEscToClose(isOpen, onClose);
    useLockBodyScroll(isOpen);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 z-40 bg-black/50"
                        onClick={onClose}
                    />

                    <motion.div
                        variants={drawerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-white shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={LOGO_SRC}
                                        alt={BRAND_NAME}
                                        className="h-10 w-10 object-contain"
                                    />
                                    <div className="text-sm leading-tight">
                                        <div
                                            className="font-extrabold tracking-[0.14em] text-[#1F1B18]"
                                            style={{ fontFamily: FONTS.brand }}
                                        >
                                            {BRAND_NAME}
                                        </div>

                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2 hover:bg-[#F5EFE9] transition-colors"
                                    type="button"
                                    aria-label="Close menu"
                                >
                                    <X className="h-5 w-5 text-[#8C7F78]" />
                                </button>
                            </div>

                            <nav className="mb-8 space-y-1">
                                {isLoading ? (
                                    <>
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={i} className="border-b border-[#F5EFE9] py-3">
                                                <NavItemSkeleton />
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    navItems.map((item) => (
                                        <a
                                            key={item.label}
                                            href={item.href}
                                            onClick={onClose}
                                            className={`block border-b border-[#F5EFE9] py-3 font-medium transition ${item.highlight
                                                ? "text-[#C41E3A] hover:text-[#D63B54]"
                                                : "text-[#1F1B18] hover:text-[#6B0F1A]"
                                                } last:border-b-0`}
                                            style={{ fontFamily: FONTS.nav }}
                                        >
                                            {item.label}
                                        </a>
                                    ))
                                )}
                            </nav>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

/* ----------------------------- Main Header ----------------------------- */
export default function Header() {
    const headerRef = useRef<HTMLElement | null>(null);
    const router = useRouter();

    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [panelTop, setPanelTop] = useState(88);
    const [scrolled, setScrolled] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState<CategoryMeta[]>([]);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading, refreshUser, setUser } = useAuth();
    const { cartItems, wishlistItems, isLoading: commerceLoading } = useCommerce();
    const activeCategorySlugs = searchParams.getAll("category");

    const categoryNames = useMemo(() => categoryOptions.map((category) => category.name), [categoryOptions]);

    const categoryLinks = useMemo(() => {
        return categoryOptions.slice(0, 6).map((c) => ({
            name: c.name,
            slug: c.slug,
        }));
    }, [categoryOptions]);

    const onPickCategory = (categoryName: string) => {
        const found = categoryOptions.find((c) => c.name === categoryName);
        if (!found) return;
        router.push(`/products?category=${encodeURIComponent(found.slug)}`);
    };

    const onSearchProducts = (query: string) => {
        const params = new URLSearchParams();
        const trimmed = query.trim();
        if (trimmed) params.set("search", trimmed);
        const suffix = params.toString();
        router.push(`/products${suffix ? `?${suffix}` : ""}`);
    };
    const navItems = useMemo<NavItem[]>(() => {
        const first = STATIC_NAV_ITEMS[0];
        const middle = STATIC_NAV_ITEMS.slice(1);
        const categoryItems = categoryLinks.map((category) => ({
            label: category.name,
            href: `/products?category=${encodeURIComponent(category.slug)}`,
            categorySlug: category.slug,
        }));
        return [first, ...categoryItems, ...middle];
    }, [categoryLinks]);

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        (async () => {
            try {
                setIsCategoriesLoading(true);
                const response = await fetch("/api/categories?limit=12", { signal: controller.signal });
                if (!response.ok) {
                    throw new Error("Unable to load categories");
                }
                const data: { categories?: Array<{ name?: string; slug?: string }> } = await response.json();
                if (!isActive) return;
                if (Array.isArray(data.categories)) {
                    setCategoryOptions(
                        data.categories
                            .map((category) => {
                                const name = category.name?.trim();
                                if (!name) return null;
                                const slug = category.slug?.trim() || slugify(name);
                                return { name, slug };
                            })
                            .filter((item): item is CategoryMeta => Boolean(item))
                    );
                }
                setIsCategoriesLoading(false);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    console.error("Failed to load categories", error);
                }
                if (isActive) {
                    setIsCategoriesLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;

        const update = () => setPanelTop(el.offsetHeight + 8);
        update();

        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };

        const ro = new ResizeObserver(update);
        ro.observe(el);
        window.addEventListener("resize", update);
        window.addEventListener("scroll", handleScroll);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const cartCount = useMemo(() => cartItems.reduce((sum, entry) => sum + entry.quantity, 0), [cartItems]);
    const wishlistCount = wishlistItems.length;

    const profilePanelTop = Math.max(32, panelTop - 20);

    const togglePanel = (panel: string) => {
        setActivePanel((prev) => (prev === panel ? null : panel));
        setMobileMenuOpen(false);
    };

    const handleProfileClick = async () => {
        if (user || authLoading) {
            togglePanel("profile");
            return;
        }
        togglePanel("profile");
        const profile = await refreshUser(true);
        if (!profile) {
            closeAll();
            router.push("/login");
        }
    };

    const closeAll = () => {
        setActivePanel(null);
        setMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            if (!response.ok) {
                throw new Error("Logout failed");
            }
            setUser(null);
            closeAll();
            router.push("/login");
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const isNavActive = (href: string) => {
        if (href === "/") return pathname === "/";
        if (href.startsWith("/products")) return pathname.startsWith("/products");
        return pathname === href;
    };


    useLockBodyScroll(Boolean(activePanel) || mobileMenuOpen);

    return (
        <>
            <header
                ref={headerRef}
                className={`sticky top-0 z-30 transition-all duration-300 ${scrolled
                    ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-[#E7E2DE]"
                    : "bg-white/95 border-b border-[#E7E2DE] shadow-sm backdrop-filter backdrop-blur-xl"
                    }`}
            >
                {/* Announcement Bar */}
                <div className="w-full bg-[#6B0F1A]">
                    <div className="container mx-auto px-3">
                        <p
                            className="py-1 text-center  text-[9px] font-semibold uppercase tracking-[0.18em] text-[#F5EFE9] md:text-[10px]"
                            style={{ fontFamily: FONTS.nav }}
                        >
                            Welcome Gift: Free Delivery on Your First Purchase
                        </p>
                    </div>
                </div>

                {/* Main Header Bar */}
                <div className="container mx-auto px-3 py-0.5">
                    <div className="relative flex items-center justify-between gap-2">
                        {/* Logo (left) - Visible on all devices */}
                        <Link href="/" className="flex items-center gap-2" onClick={closeAll}>
                            <motion.div
                                whileHover={{ rotate: 5, scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative"
                            >
                                <div className="absolute inset-0 rounded-full bg-linear-to-br from-[#6B0F1A]/5 to-[#D4A76A]/5 blur-sm" />
                                <img
                                    src={LOGO_SRC}
                                    alt={BRAND_NAME}
                                    className="relative h-10 w-10 object-contain "
                                />
                            </motion.div>
                        </Link>

                        {/* Brand Center with Curvy Design - Hidden on mobile, visible on desktop */}
                        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-full -translate-x-1/2 -translate-y-1/2 justify-center md:flex">
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="relative"
                            >
                                {/* Curvy background effect */}
                                <svg
                                    className="absolute -top-2 -left-3 -right-3 -bottom-2 text-[#F5EFE9] opacity-60"
                                    viewBox="0 0 200 40"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M10,20 Q100,5 190,20"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M10,25 Q100,40 190,25"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="0.5"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {/* Main brand name with curvy effect */}
                                <div className="relative">
                                    <h1
                                        className="text-center text-[14px] font-black leading-tight"
                                        style={{
                                            fontFamily: FONTS.brand,
                                            textShadow: '0.5px 0.5px 1px rgba(31, 27, 24, 0.1)'
                                        }}
                                    >
                                        {/* Curvy text effect using multiple layers */}
                                        <span className="relative inline-block">
                                            {/* Base text */}
                                            <span className="text-[#1F1B18] tracking-[0.18em]">
                                                {BRAND_NAME}
                                            </span>

                                            {/* Top curvy highlight */}
                                            <span
                                                className="absolute top-0 left-0 text-transparent bg-clip-text bg-linear-to-r from-transparent via-[#D4A76A]/30 to-transparent tracking-[0.18em]"
                                                style={{
                                                    transform: 'translateY(-1px)',
                                                    fontFamily: FONTS.brand,
                                                    fontWeight: '900'
                                                }}
                                            >
                                                {BRAND_NAME}
                                            </span>

                                            {/* Bottom shadow for depth */}
                                            <span
                                                className="absolute top-0 left-0 text-transparent bg-clip-text bg-linear-to-r from-transparent via-[#6B0F1A]/10 to-transparent tracking-[0.18em]"
                                                style={{
                                                    transform: 'translateY(1px)',
                                                    fontFamily: FONTS.brand,
                                                    fontWeight: '900'
                                                }}
                                            >
                                                {BRAND_NAME}
                                            </span>
                                        </span>
                                    </h1>

                                    {/* Curvy underline */}
                                    <svg
                                        className="mx-auto mt-1"
                                        width="80"
                                        height="8"
                                        viewBox="0 0 80 8"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M0,4 C20,0 60,0 80,4"
                                            stroke="url(#curve-gradient)"
                                            strokeWidth="0.8"
                                            strokeLinecap="round"
                                            fill="none"
                                        />
                                        <defs>
                                            <linearGradient id="curve-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#6B0F1A" stopOpacity="0.3" />
                                                <stop offset="50%" stopColor="#D4A76A" stopOpacity="0.5" />
                                                <stop offset="100%" stopColor="#6B0F1A" stopOpacity="0.3" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>

                                {/* Subtle subtitle */}
                                <p className="text-center text-[8px] font-medium tracking-[0.3em] text-[#8C7F78] mt-1 uppercase">
                                    Premium Fashion
                                </p>
                            </motion.div>
                        </div>

                        {/* Mobile Brand Name - Only shown on mobile devices */}
                        {/*  <div className="md:hidden flex justify-center ml-8">
                            <div className="text-center">
                                <h1
                                    className="text-[12px] font-black tracking-[0.15em] text-[#1F1B18]"
                                    style={{ fontFamily: FONTS.brand }}
                                >
                                    {BRAND_NAME}
                                </h1>
                                <p className="text-[6px] font-medium tracking-[0.25em] text-[#8C7F78] mt-0.5 uppercase">
                                    Premium Fashion
                                </p>
                            </div>
                        </div> */}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2">
                                <IconButton
                                    icon={Search}
                                    label="Search"
                                    onClick={() => togglePanel("search")}
                                    active={activePanel === "search"}
                                />
                                <IconButton
                                    icon={Heart}
                                    label="Wishlist"
                                    onClick={() => togglePanel("wishlist")}
                                    active={activePanel === "wishlist"}
                                    count={wishlistCount}
                                    loading={commerceLoading}
                                />
                                <IconButton
                                    icon={ShoppingCart}
                                    label="Cart"
                                    onClick={() => togglePanel("cart")}
                                    active={activePanel === "cart"}
                                    count={cartCount}
                                    loading={commerceLoading}
                                />
                                <button
                                    onClick={handleProfileClick}
                                    className={`relative h-9 cursor-pointer w-9 rounded-full flex items-center justify-center transition-all duration-200 ${activePanel === "profile" && (user || authLoading)
                                        ? "bg-linear-to-br from-[#F5EFE9] to-[#E7E2DE]"
                                        : "bg-linear-to-br from-[#F6F3F1] to-[#E7E2DE]"
                                        } hover:bg-linear-to-br hover:from-[#efe8e4] hover:to-[#E7E2DE]`}
                                    aria-label={user ? "Open profile menu" : "Sign in"}
                                    type="button"
                                    disabled={authLoading}
                                >
                                    {authLoading ? (
                                        <UserAvatarSkeleton />
                                    ) : user?.avatar ? (
                                        <Image
                                            src={user.avatar}
                                            alt={user.name || "Profile"}
                                            fill
                                            sizes="36px"
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full bg-linear-to-br from-[#6B0F1A]/10 to-[#D4A76A]/10" />
                                            <User className="relative h-5 w-5 text-[#6B0F1A]" />
                                        </div>
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    closeAll();
                                    setMobileMenuOpen(true);
                                }}
                                className="cursor-pointer rounded-full p-2 hover:bg-linear-to-br hover:from-[#F6F3F1] hover:to-[#E7E2DE] md:hidden"
                                aria-label="Open menu"
                                type="button"
                            >
                                <Menu className="h-6 w-6 text-[#6B0F1A]" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Desktop Navigation Bar */}
                <div className="hidden md:block border-t border-[#E7E2DE]/10 bg-white/95">
                    <div className="container mx-auto px-0">
                        <nav className="flex items-center justify-center py-0.5">
                            <div className="relative w-[80%]">
                                {/* Subtle navigation container */}
                                <div className="relative overflow-x-auto py-1 scrollbar-hide">
                                    <div className="flex items-center justify-center gap-0.5 min-w-max mx-auto px-4">
                                        {isCategoriesLoading ? (
                                            // Skeleton for desktop nav items
                                            Array.from({ length: 8 }).map((_, index) => (
                                                <div key={index} className="px-3 py-1.5">
                                                    <NavItemSkeleton />
                                                </div>
                                            ))
                                        ) : (
                                            navItems.map((item, index) => {
                                                const isCategoryActive = Boolean(
                                                    item.categorySlug && activeCategorySlugs.includes(item.categorySlug)
                                                );
                                                const isActive = item.categorySlug
                                                    ? isCategoryActive
                                                    : isNavActive(item.href);
                                                const isSale = item.label === "SALE" || item.isSale;
                                                const isNew = item.label === "NEW ARRIVALS" || item.label === "New Arrivals";

                                                return (
                                                    <motion.div
                                                        key={item.label}
                                                        initial={false}
                                                        animate={isActive ? "active" : "inactive"}
                                                        variants={{
                                                            active: {
                                                                scale: 1,
                                                                opacity: 1,
                                                                transition: { duration: 0.15 }
                                                            },
                                                            inactive: {
                                                                scale: 0.98,
                                                                opacity: 0.95,
                                                                transition: { duration: 0.1 }
                                                            }
                                                        }}
                                                        className="relative"
                                                    >
                                                        {/* Active background */}
                                                        {isActive && (
                                                            <motion.div
                                                                layoutId="nav-active-bg"
                                                                className="absolute inset-0 -z-10 rounded-lg bg-linear-to-r from-[#6B0F1A]/3 to-[#D4A76A]/2"
                                                                transition={{ type: "spring", stiffness: 320, damping: 35 }}
                                                            />
                                                        )}

                                                        {/* Subtle connection lines between items */}
                                                        {index < navItems.length - 1 && (
                                                            <div className="absolute right-0 top-1/2 h-2 w-px -translate-y-1/2 bg-linear-to-b from-transparent via-[#E7E2DE]/40 to-transparent" />
                                                        )}

                                                        <Link
                                                            href={item.href}
                                                            onClick={closeAll}
                                                            className={`
                                            relative flex items-center justify-center gap-1
                                            rounded-lg px-3 py-1.5
                                            text-[10px] font-medium uppercase tracking-[0.15em]
                                            transition-all duration-150
                                            group
                                            ${isActive
                                                                    ? 'text-[#6B0F1A]'
                                                                    : isSale
                                                                        ? 'text-[#C41E3A] hover:text-[#D63B54]'
                                                                        : isNew
                                                                            ? 'text-[#1F1B18] hover:text-[#6B0F1A]'
                                                                            : 'text-[#8C7F78] hover:text-[#1F1B18]'
                                                                }
                                        `}
                                                            style={{ fontFamily: FONTS.nav }}
                                                        >
                                                            {/* Icon indicators for special items */}
                                                            {isSale && (
                                                                <motion.div
                                                                    animate={{ rotate: [0, 3, -3, 0] }}
                                                                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                                                                    className="relative"
                                                                >
                                                                    <span className="relative text-[#C41E3A] text-[10px]">🔥</span>
                                                                </motion.div>
                                                            )}

                                                            {isNew && !isSale && (
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.05, 1] }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                    className="relative"
                                                                >
                                                                    <Sparkles className="h-2.5 w-2.5 text-[#D4A76A]" />
                                                                </motion.div>
                                                            )}

                                                            {/* Text */}
                                                            <span className={`
                                            relative transition-all duration-200
                                            ${isActive
                                                                    ? 'font-semibold'
                                                                    : 'group-hover:font-medium'
                                                                }
                                        `}>
                                                                {item.label}
                                                            </span>

                                                            {/* Micro badge for sale */}
                                                            {isSale && !isActive && (
                                                                <motion.span
                                                                    animate={{ scale: [1, 1.03, 1] }}
                                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                                    className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-linear-to-r from-[#C41E3A] to-[#FF3366] ring-0.5 ring-white"
                                                                />
                                                            )}

                                                            {/* Active indicator dot */}
                                                            {isActive && (
                                                                <motion.div
                                                                    layoutId="nav-active-dot"
                                                                    className="absolute -bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-linear-to-r from-[#6B0F1A] to-[#D4A76A]"
                                                                    transition={{ type: "spring", stiffness: 420, damping: 40 }}
                                                                />
                                                            )}
                                                        </Link>

                                                        {/* Hover effect */}
                                                        <div className={`
                                        absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-150
                                        ${!isActive ? 'group-hover:opacity-30' : ''}
                                        ${isSale
                                                                ? 'bg-linear-to-r from-[#C41E3A]/2 via-transparent to-[#FF3366]/2'
                                                                : 'bg-linear-to-r from-[#6B0F1A]/2 via-transparent to-[#D4A76A]/2'
                                                            }
                                    `} />
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>

                {/* Mobile Navigation Bar */}
                <div className="md:hidden border-t border-[#E7E2DE]/30 bg-white/95">
                    <div className="container mx-auto px-4 py-0.5">
                        <nav className="flex items-center justify-center">
                            <div className="relative w-[80%]">
                                <div className="relative overflow-x-auto py-1 scrollbar-hide">
                                    <div className="flex items-center justify-center gap-1.5 min-w-max mx-auto px-2">
                                        {isCategoriesLoading ? (
                                            // Skeleton for mobile nav items
                                            Array.from({ length: 4 }).map((_, index) => (
                                                <div key={index} className="px-3 py-1.5">
                                                    <NavItemSkeleton />
                                                </div>
                                            ))
                                        ) : (
                                            navItems.map((item) => {
                                                const isCategoryActive = Boolean(
                                                    item.categorySlug && activeCategorySlugs.includes(item.categorySlug)
                                                );
                                                const isActive = item.categorySlug
                                                    ? isCategoryActive
                                                    : isNavActive(item.href);
                                                const isSale = item.label === "SALE" || item.isSale;
                                                const isNew = item.label === "NEW ARRIVALS" || item.label === "New Arrivals";

                                                return (
                                                    <motion.div
                                                        key={item.label}
                                                        whileTap={{ scale: 0.95 }}
                                                        className="relative"
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            onClick={closeAll}
                                                            className={`
                                    relative flex items-center justify-center
                                    rounded-full px-3 py-1.5
                                    text-[9px] font-medium uppercase tracking-[0.12em]
                                    transition-all duration-150
                                    ${isActive
                                                                    ? 'bg-linear-to-r from-[#F5EFE9] to-[#F5EFE9]/80 text-[#6B0F1A] shadow-[0_1px_3px_rgba(31,27,24,0.05)]'
                                                                    : isSale
                                                                        ? 'text-[#C41E3A] hover:bg-linear-to-r hover:from-[#C41E3A]/5 hover:to-[#FF3366]/5'
                                                                        : isNew
                                                                            ? 'text-[#1F1B18] hover:bg-linear-to-r hover:from-[#6B0F1A]/5 hover:to-[#D4A76A]/5'
                                                                            : 'text-[#8C7F78] hover:bg-linear-to-r hover:from-[#1F1B18]/5 hover:to-[#6B0F1A]/5 hover:text-[#1F1B18]'
                                                                }
                                `}
                                                            style={{ fontFamily: FONTS.nav }}
                                                        >
                                                            {/* Icon indicators for mobile */}
                                                            {isSale && (
                                                                <span className="mr-1 text-[8px]">🔥</span>
                                                            )}

                                                            {isNew && !isSale && (
                                                                <Sparkles className="mr-1 h-2 w-2 text-[#D4A76A]" />
                                                            )}

                                                            <span className={`
                                    ${isActive ? 'font-semibold' : ''}
                                    ${isSale && !isActive ? 'font-bold' : ''}
                                `}>
                                                                {item.label}
                                                            </span>

                                                            {/* Active indicator for mobile */}
                                                            {isActive && (
                                                                <div className="absolute -bottom-0.5 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full bg-linear-to-r from-[#6B0F1A] to-[#D4A76A]" />
                                                            )}
                                                        </Link>

                                                        {/* Sale badge for mobile */}
                                                        {isSale && !isActive && (
                                                            <div className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-linear-to-r from-[#C41E3A] to-[#FF3366] ring-0.5 ring-white" />
                                                        )}
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Panels */}
            <SearchPanel
                isOpen={activePanel === "search"}
                onClose={closeAll}
                topOffset={panelTop}
                categories={categoryNames}
                isLoading={isCategoriesLoading}
                onPickCategory={onPickCategory}
                onSearch={onSearchProducts}
            />

            <WishlistPanel
                isOpen={activePanel === "wishlist"}
                onClose={closeAll}
                topOffset={panelTop}
            />
            <CartPanel
                isOpen={activePanel === "cart"}
                onClose={closeAll}
                topOffset={panelTop}
            />
            <ProfileDropdown
                user={user}
                isOpen={activePanel === "profile"}
                onClose={closeAll}
                onLogout={handleLogout}
                topOffset={profilePanelTop}
                loading={authLoading}
                logoutLoading={isLoggingOut}
            />

            {/* Mobile Drawer */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={closeAll}
                navItems={navItems}
                isLoading={isCategoriesLoading}
            />
            <style jsx global>{`
                .hide-scrollbar {
                scrollbar-width: none;
                -ms-overflow-style: none;
                }

                .hide-scrollbar::-webkit-scrollbar {
                display: none;
                }
                
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
            button {
                cursor: pointer;
            }
        `}</style>
        </>
    );
}
