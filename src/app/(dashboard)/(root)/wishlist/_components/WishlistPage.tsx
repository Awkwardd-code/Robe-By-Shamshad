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
  Star,
} from "lucide-react";
import { useCommerce, type Product } from "@/context/CommerceContext";

const currencyFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export default function WishlistPage() {
  const { wishlistItems, addToCart, removeFromWishlist } = useCommerce();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showShareModal, setShowShareModal] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const normalizeCategory = (product: Product) =>
    product.category ?? product.categoryName ?? "Uncategorized";
  const isProductInStock = (product: Product) =>
    (product.stock ?? product.inventory?.quantity ?? 0) > 0;

  const filteredItems = useMemo(() => {
    const matchesCategory = wishlistItems.filter((item) =>
      selectedCategory === "All"
        ? true
        : normalizeCategory(item) === selectedCategory
    );

    return [...matchesCategory].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating": {
          const ratingA = a.rating ?? a.ratings?.averageRating ?? 0;
          const ratingB = b.rating ?? b.ratings?.averageRating ?? 0;
          return ratingB - ratingA;
        }
        default:
          return 0;
      }
    });
  }, [wishlistItems, selectedCategory, sortBy]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(wishlistItems.map(normalizeCategory)))],
    [wishlistItems]
  );

  const totalValue = useMemo(
    () => wishlistItems.reduce((sum, item) => sum + item.price, 0),
    [wishlistItems]
  );

  const itemsOnSale = useMemo(
    () =>
      wishlistItems.filter(
        (item) => item.oldPrice && item.oldPrice > item.price
      ).length,
    [wishlistItems]
  );

  const outOfStockItems = useMemo(
    () => wishlistItems.filter((product) => !isProductInStock(product)).length,
    [wishlistItems]
  );

  const handleRemoveItem = (id: string) => {
    setRemovingItemId(id);
    setTimeout(() => {
      removeFromWishlist(id);
      setRemovingItemId(null);
    }, 300);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
  };

  const handleMoveAllToCart = () => {
    const inStockItems = wishlistItems.filter(isProductInStock);
    if (inStockItems.length === 0) return;
    inStockItems.forEach((item) => addToCart(item));
    inStockItems.forEach((item) => removeFromWishlist(item.id));
  };

  const handleShareWishlist = () => {
    setShowShareModal(true);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-gray-900 font-medium">Wishlist</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                My Wishlist
                <span className="ml-3 text-2xl text-pink-500">
                  <Heart className="inline w-8 h-8" fill="currentColor" />
                </span>
              </h1>
              <p className="text-gray-600">
                Save items you love for later
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleShareWishlist}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleMoveAllToCart}
                className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                Add All to Cart
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-linear-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{wishlistItems.length}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <Heart className="w-8 h-8 text-pink-500" fill="currentColor" />
            </div>
          </div>
          
          <div className="bg-linear-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalValue)}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <Tag className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{itemsOnSale}</div>
                <div className="text-sm text-gray-600">On Sale</div>
              </div>
              <div className="w-8 h-8 bg-linear-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                %
              </div>
            </div>
          </div>
          
          <div className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{outOfStockItems}</div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Wishlist Items Grid */}
        <AnimatePresence>
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
{filteredItems.map((product) => {
                const ratingValue =
                  product.rating ?? product.ratings?.averageRating ?? 0;
                const reviewsCount =
                  product.reviewsCount ?? product.ratings?.totalReviews ?? 0;
                const discountPercent =
                  product.oldPrice && product.oldPrice > product.price
                    ? Math.round(
                        ((product.oldPrice - product.price) / product.oldPrice) * 100
                      )
                    : 0;
                const inStock = isProductInStock(product);
                return (
                  <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: removingItemId === product.id ? 0 : 1, 
                      scale: removingItemId === product.id ? 0.8 : 1 
                    }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="relative group"
                >
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden h-full flex flex-col">
                    {/* Product Image */}
                    <div className="relative h-64 overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
                        <Link href={`/products/${product.slug ?? product.id}`}>
                          <Image
                            src={product.image || "/images/placeholder.jpg"}
                            alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </Link>
                      
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {discountPercent > 0 && (
                          <span className="px-3 py-1 bg-linear-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-sm">
                            -{discountPercent}%
                          </span>
                        )}
                        {!inStock && (
                          <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-sm">
                            Out of Stock
                          </span>
                        )}
                        {product.tags && product.tags.length > 0 && (
                          <span className="px-3 py-1 bg-linear-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full shadow-sm">
                            #{product.tags[0]}
                          </span>
                        )}
                      </div>
                      
                      {/* Quick Actions Overlay */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!inStock}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                              inStock
                                ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {inStock ? 'Add to Cart' : 'Out of Stock'}
                          </button>
                        <Link
                          href={`/products/${product.slug ?? product.id}`}
                          className="p-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Quick View"
                        >
                            <Eye className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(product.id)}
                        className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Category */}
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {normalizeCategory(product)}
                        </span>
                      </div>

                      {/* Product Name */}
                      <Link href={`/products/${product.slug ?? product.id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                        {product.shortDescription ??
                          product.description ??
                          "No description provided."}
                      </p>

                      {/* Tags */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                          {product.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{product.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                            className={`w-4 h-4 ${i < Math.round(ratingValue) ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {ratingValue.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({reviewsCount})
                        </span>
                      </div>

                      {/* Price and Actions */}
                      <div className="mt-auto pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-gray-900">
                                {formatCurrency(product.price)}
                              </span>
                              {product.oldPrice && product.oldPrice > product.price && (
                                <span className="text-sm text-gray-400 line-through">
                                  {formatCurrency(product.oldPrice)}
                                </span>
                              )}
                            </div>
                            {discountPercent > 0 && product.oldPrice && (
                              <div className="text-xs font-medium text-red-600 mt-1">
                                Save {formatCurrency(product.oldPrice - product.price)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={!inStock}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                inStock
                                  ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyWishlistState />
          )}
        </AnimatePresence>

        {/* Recommendations */}
        {wishlistItems.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">You might also like</h2>
              <Link
                href="/products"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="aspect-square bg-linear-to-br from-gray-100 to-gray-200 rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <ShareModal onClose={() => setShowShareModal(false)} />
        )}
      </div>
    </div>
  );
}

function EmptyWishlistState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 bg-white rounded-2xl shadow-sm"
    >
      <div className="w-24 h-24 mx-auto mb-6 bg-linear-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center">
        <Heart className="w-12 h-12 text-pink-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">Your wishlist is empty</h3>
      <p className="text-gray-600 max-w-md mx-auto mb-8">
        Save items you love by clicking the heart icon. They'll appear here for easy access.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
        >
          <ShoppingBag className="w-5 h-5" />
          Start Shopping
        </Link>
        <Link
          href="/collections/trending"
          className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Tag className="w-5 h-5" />
          View Trending
        </Link>
      </div>
    </motion.div>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    // In a real app, copy the actual wishlist URL
    navigator.clipboard.writeText("https://example.com/wishlist/share/abc123");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Share Wishlist</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            Share your wishlist with friends and family. They can see the items you've saved.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">My Wishlist</div>
                <div className="text-sm text-gray-500">Shared via Your Store</div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value="https://example.com/wishlist/share/abc123"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2 pt-4">
            {["Facebook", "Twitter", "WhatsApp", "Email"].map((platform) => (
              <button
                key={platform}
                className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full mb-2"></div>
                <span className="text-xs text-gray-700">{platform}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
