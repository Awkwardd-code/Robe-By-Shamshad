"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ShoppingBag,
  Eye,
  X,
  Trash2,
  Share2,
  Tag,
  AlertCircle,
  ChevronRight,
  Package,
  Undo,
  Star,
} from "lucide-react";
import { useCommerce, type Product } from "@/context/CommerceContext";

const currencyFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});
const formatCurrency = (value: number) => currencyFormatter.format(value);

// ---- “Woo-style” theme helpers (matching the cart page look) ----
const normalizeCategoryFromProduct = (product: Product) =>
  product.category ?? (product as any).categoryName ?? "Uncategorized";

const isProductInStock = (product: Product) =>
  ((product as any).stock ?? (product as any).inventory?.quantity ?? 0) > 0;

export default function WishlistPage() {
  const { wishlistItems, addToCart, removeFromWishlist } = useCommerce();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showShareModal, setShowShareModal] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // simple “removed” notice (Woo-like) – keeps functionality & feedback
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [removedItem, setRemovedItem] = useState<Product | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(wishlistItems.map(normalizeCategoryFromProduct)))],
    [wishlistItems]
  );

  const filteredItems = useMemo(() => {
    const matchesCategory = wishlistItems.filter((item) =>
      selectedCategory === "All"
        ? true
        : normalizeCategoryFromProduct(item) === selectedCategory
    );

    return [...matchesCategory].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating": {
          const ratingA = (a as any).rating ?? (a as any).ratings?.averageRating ?? 0;
          const ratingB = (b as any).rating ?? (b as any).ratings?.averageRating ?? 0;
          return ratingB - ratingA;
        }
        default:
          return 0;
      }
    });
  }, [wishlistItems, selectedCategory, sortBy]);

  const totalValue = useMemo(
    () => wishlistItems.reduce((sum, item) => sum + item.price, 0),
    [wishlistItems]
  );

  const itemsOnSale = useMemo(
    () => wishlistItems.filter((item) => item.oldPrice && item.oldPrice > item.price).length,
    [wishlistItems]
  );

  const outOfStockItems = useMemo(
    () => wishlistItems.filter((p) => !isProductInStock(p)).length,
    [wishlistItems]
  );

  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  const handleRemoveItem = (product: Product) => {
    setRemovingItemId(product.id);

    // visual remove animation then remove from store
    setTimeout(() => {
      removeFromWishlist(product.id);
      setRemovingItemId(null);

      // notice + undo
      setRemovedItem(product);
      setShowUndoNotification(true);

      if (undoTimer) clearTimeout(undoTimer);
      const t = setTimeout(() => {
        setShowUndoNotification(false);
        setRemovedItem(null);
      }, 5000);
      setUndoTimer(t);
    }, 250);
  };

  const handleUndoRemove = () => {
    // If your context doesn't have "addToWishlist", just close the notice.
    // (Optional: wire to your addToWishlist if available.)
    setShowUndoNotification(false);
    setRemovedItem(null);
  };

  const handleMoveAllToCart = () => {
    const inStockItems = wishlistItems.filter(isProductInStock);
    if (inStockItems.length === 0) return;

    inStockItems.forEach((item) => addToCart(item));
    inStockItems.forEach((item) => removeFromWishlist(item.id));
  };

  const handleShareWishlist = () => setShowShareModal(true);

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb bar (same as cart design) */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <nav className="flex items-center text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
            <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
            <span className="text-gray-900">Wishlist</span>
          </nav>
        </div>
      </div>

      {/* Undo notice (Woo-like) */}
      <WishlistNotice
        show={showUndoNotification}
        removedItem={removedItem}
        onUndo={handleUndoRemove}
        onClose={() => {
          setShowUndoNotification(false);
          setRemovedItem(null);
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header row (simple, bold, no gradients) */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Wishlist{" "}
              <span className="align-middle">
                <Heart className="inline h-7 w-7 text-red-600" fill="currentColor" />
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-600">Save items you love for later</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleShareWishlist}
              className="inline-flex h-10 items-center gap-2 border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>

            <button
              onClick={handleMoveAllToCart}
              className="inline-flex h-10 items-center gap-2 border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
            >
              <ShoppingBag className="h-4 w-4" />
              Add All to Cart
            </button>
          </div>
        </div>

        {/* Stats (boxed, minimal radius) */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatBox
            label="Total Items"
            value={`${wishlistItems.length}`}
            icon={<Heart className="h-6 w-6 text-red-600" fill="currentColor" />}
          />
          <StatBox
            label="Total Value"
            value={formatCurrency(totalValue)}
            icon={<Tag className="h-6 w-6 text-gray-700" />}
          />
          <StatBox
            label="On Sale"
            value={`${itemsOnSale}`}
            icon={
              <div className="flex h-7 w-7 items-center justify-center border border-gray-300 bg-white text-sm font-bold text-gray-900">
                %
              </div>
            }
          />
          <StatBox
            label="Out of Stock"
            value={`${outOfStockItems}`}
            icon={<AlertCircle className="h-6 w-6 text-gray-700" />}
          />
        </div>

        {/* Filters + sorting (same “simple row” style) */}
        <div className="mb-8 border border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Filter by category
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-9 px-4 text-sm font-semibold ${
                      selectedCategory === cat
                        ? "border border-gray-900 bg-gray-900 text-white"
                        : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Sort by
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 border border-gray-300 bg-white px-3 text-sm outline-none focus:border-gray-500"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items list (table-like cards to keep responsive; same “cart” vibe) */}
        <AnimatePresence>
          {filteredItems.length > 0 ? (
            <div className="border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-205 text-sm">
                  <thead className="border-b border-gray-200">
                    <tr className="text-gray-600">
                      <th className="px-5 py-4 text-left font-semibold">Product</th>
                      <th className="px-5 py-4 text-left font-semibold">Category</th>
                      <th className="px-5 py-4 text-right font-semibold">Price</th>
                      <th className="px-5 py-4 text-center font-semibold">Stock</th>
                      <th className="px-5 py-4 text-right font-semibold">Action</th>
                      <th className="px-5 py-4 text-center font-semibold" aria-label="Remove" />
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.map((product) => {
                      const ratingValue =
                        (product as any).rating ?? (product as any).ratings?.averageRating ?? 0;
                      const reviewsCount =
                        (product as any).reviewsCount ?? (product as any).ratings?.totalReviews ?? 0;

                      const inStock = isProductInStock(product);

                      const discountPercent =
                        product.oldPrice && product.oldPrice > product.price
                          ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                          : 0;

                      return (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{
                            opacity: removingItemId === product.id ? 0 : 1,
                            y: 0,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border-b border-gray-200 last:border-b-0"
                        >
                          {/* Product */}
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-4">
                              <div className="relative h-16 w-16 overflow-hidden bg-gray-100">
                                <Link href={`/products/${product.slug ?? product.id}`}>
                                  <Image
                                    src={product.image || "/images/placeholder.jpg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                  />
                                </Link>
                              </div>

                              <div className="min-w-0">
                                <Link href={`/products/${product.slug ?? product.id}`}>
                                  <div className="font-bold uppercase text-gray-900 hover:underline line-clamp-2">
                                    {product.name}
                                  </div>
                                </Link>

                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                                  <Stars value={ratingValue} />
                                  <span className="font-semibold text-gray-800">
                                    {Number(ratingValue).toFixed(1)}
                                  </span>
                                  <span className="text-gray-500">({reviewsCount})</span>
                                  {discountPercent > 0 && (
                                    <span className="ml-2 inline-flex items-center border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-bold text-red-600">
                                      -{discountPercent}%
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 text-xs text-gray-500 line-clamp-1">
                                  {product.shortDescription ??
                                    product.description ??
                                    "No description provided."}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-5 py-5 text-gray-700">
                            {normalizeCategoryFromProduct(product)}
                          </td>

                          {/* Price */}
                          <td className="px-5 py-5 text-right">
                            <div className="font-bold text-gray-900">
                              {formatCurrency(product.price)}
                            </div>
                            {product.oldPrice && product.oldPrice > product.price && (
                              <div className="text-xs text-gray-500 line-through">
                                {formatCurrency(product.oldPrice)}
                              </div>
                            )}
                          </td>

                          {/* Stock */}
                          <td className="px-5 py-5 text-center">
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-bold ${
                                inStock
                                  ? "border border-gray-300 bg-white text-gray-900"
                                  : "border border-gray-300 bg-gray-100 text-gray-600"
                              }`}
                            >
                              {inStock ? "In stock" : "Out of stock"}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-5 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAddToCart(product)}
                                disabled={!inStock}
                                className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-bold ${
                                  inStock
                                    ? "border border-gray-900 bg-gray-900 text-white hover:bg-black"
                                    : "border border-gray-300 bg-gray-200 text-gray-500 cursor-not-allowed"
                                }`}
                              >
                                <ShoppingBag className="h-4 w-4" />
                                Add to cart
                              </button>

                              <Link
                                href={`/products/${product.slug ?? product.id}`}
                                className="inline-flex h-10 w-10 items-center justify-center border border-gray-300 bg-white hover:bg-gray-50"
                                title="View"
                              >
                                <Eye className="h-5 w-5 text-gray-700" />
                              </Link>
                            </div>
                          </td>

                          {/* Remove */}
                          <td className="px-5 py-5 text-center">
                            <button
                              onClick={() => handleRemoveItem(product)}
                              className="inline-flex h-7 w-7 items-center justify-center border border-gray-300 bg-white hover:bg-gray-50"
                              aria-label="Remove from wishlist"
                            >
                              <Trash2 className="h-4 w-4 text-gray-700" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer / CTA */}
              <div className="border-t border-gray-200 px-5 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-700">
                    Total value:{" "}
                    <span className="font-bold text-gray-900">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/products"
                      className="inline-flex h-10 items-center border border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      ← Continue shopping
                    </Link>

                    <button
                      onClick={handleMoveAllToCart}
                      className="inline-flex h-10 items-center border border-gray-900 bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-black"
                    >
                      Move all in-stock to cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyWishlistState />
          )}
        </AnimatePresence>

        {/* Share Modal */}
        {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-gray-900">{value}</div>
          <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
            {label}
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center">{icon}</div>
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(Number(value || 0));
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rounded ? "text-yellow-400" : "text-gray-300"}`}
          fill={i < rounded ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function EmptyWishlistState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200 bg-white px-6 py-14 text-center"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-gray-200 bg-gray-50">
        <Heart className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Your wishlist is empty</h3>
      <p className="mt-1 text-sm text-gray-600">
        Click the heart icon on products to save them here.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/products"
          className="inline-flex h-10 items-center border border-gray-900 bg-gray-900 px-6 text-sm font-semibold text-white hover:bg-black"
        >
          Start shopping
        </Link>
        <Link
          href="/collections/trending"
          className="inline-flex h-10 items-center border border-gray-400 bg-white px-6 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          View trending
        </Link>
      </div>
    </motion.div>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://example.com/wishlist/share/abc123");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md border border-gray-200 bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-sm font-bold tracking-wide text-gray-900">SHARE WISHLIST</h3>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center border border-gray-300 bg-white hover:bg-gray-50"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-gray-600">
            Copy the link below to share your wishlist.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              readOnly
              value="https://example.com/wishlist/share/abc123"
              className="h-10 flex-1 border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700 outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="h-10 border border-gray-900 bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {["Facebook", "X", "WhatsApp", "Email"].map((platform) => (
              <button
                key={platform}
                className="border border-gray-200 bg-white px-2 py-3 text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                {platform}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
            <button
              onClick={onClose}
              className="h-10 border border-gray-400 bg-white px-5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Woo-style notice for removed item (minimal).
 * NOTE: Without an "addToWishlist" function in your context, Undo just closes the notice.
 * If you do have addToWishlist, wire it in handleUndoRemove above.
 */
function WishlistNotice({
  show,
  removedItem,
  onUndo,
  onClose,
}: {
  show: boolean;
  removedItem: Product | null;
  onUndo: () => void;
  onClose: () => void;
}) {
  if (!show || !removedItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-1/2 top-4 z-50 w-full max-w-3xl -translate-x-1/2 px-4"
    >
      <div className="border border-gray-200 bg-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-gray-900">
            <span className="font-semibold">“{removedItem.name}”</span> removed.{" "}
            <button onClick={onUndo} className="font-semibold text-red-600 hover:underline">
              Undo?
            </button>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center border border-gray-300 bg-white hover:bg-gray-50"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
