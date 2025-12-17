"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X,
  Undo,
  Plus,
  Minus,
  Package,
} from "lucide-react";
import { useCommerce, type CartEntry } from "@/context/CommerceContext";

const currencyFormatter = new Intl.NumberFormat("bn-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export default function CartPage() {
  const { cartItems, addToCart, removeFromCart } = useCommerce();
  const [couponCode, setCouponCode] = useState("");
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [removedItem, setRemovedItem] = useState<CartEntry | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const subtotal = cartItems.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0
  );
  const total = subtotal;

  const handleRemoveItem = (id: string) => {
    const entry = cartItems.find((item) => item.product.id === id);
    if (!entry) return;
    setRemovedItem(entry);
    removeFromCart(id);
    setShowUndoNotification(true);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setShowUndoNotification(false);
      setRemovedItem(null);
    }, 5000);
  };

  const handleUndoRemove = () => {
    if (removedItem) {
      addToCart(removedItem.product, removedItem.quantity);
      setShowUndoNotification(false);
      setRemovedItem(null);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const entry = cartItems.find((item) => item.product.id === id);
    if (!entry || entry.quantity === newQuantity) return;
    removeFromCart(id);
    addToCart(entry.product, newQuantity);
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      // Here you would typically validate and apply the coupon
      alert(`Coupon "${couponCode}" applied!`);
      setCouponCode("");
    }
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900 font-medium">Cart</span>
          </nav>
        </div>

        {/* Undo Notification */}
        <AnimatedNotification show={showUndoNotification} onUndo={handleUndoRemove} removedItem={removedItem} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h2>
              
              <div className="space-y-6">
                {cartItems.map((entry) => {
                  const product = entry.product;
                  const description =
                    product.shortDescription ??
                    product.description ??
                    product.category ??
                    "";
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row gap-4 pb-6 border-b border-gray-200 last:border-0 last:pb-0"
                    >
                      <div className="relative w-full sm:w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={product.image || "/images/placeholder.jpg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 128px) 100vw, 128px"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              {product.name}
                            </h3>
                            {description && (
                              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                                {description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              {product.category && (
                                <span>Category: {product.category}</span>
                              )}
                              {product.unit && <span>Unit: {product.unit}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(product.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            aria-label="Remove item"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() =>
                                  updateQuantity(product.id, entry.quantity - 1)
                                }
                                className="p-2 hover:bg-gray-100 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-4 py-2 min-w-12 text-center font-medium">
                                {entry.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(product.id, entry.quantity + 1)
                                }
                                className="p-2 hover:bg-gray-100 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-gray-600 text-sm">Quantity</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(product.price * entry.quantity)}
                            </div>
                            {entry.quantity > 1 && (
                              <div className="text-sm text-gray-600">
                                {formatCurrency(product.price)} each
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Cart Empty State */}
              {cartItems.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-600 mb-6">Add some products to get started!</p>
                  <Link
                    href="/products"
                    className="inline-block bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    Continue Shopping
                  </Link>
                </div>
              )}
            </div>

            {/* Coupon Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Coupon</h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Apply coupon
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Cart Totals */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">CART TOTALS</h2>
                
                {/* Subtotal */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Product</span>
                    <span className="text-gray-600">Price</span>
                  </div>
                  
                  {cartItems.map((entry) => (
                    <div
                      key={entry.product.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-900">
                        {entry.product.name} × {entry.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(entry.product.price * entry.quantity)}
                      </span>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Subtotal</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
              <div className="space-y-4 border-t border-gray-200 pt-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">
                          {formatCurrency(total)}
                        </div>
                        <div className="text-sm text-gray-600">Including all taxes</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <div className="mt-8">
                  <Link
                    href="/checkout"
                    className="block w-full bg-linear-to-r from-blue-600 to-purple-600 text-white font-bold text-lg py-4 px-6 rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-center"
                  >
                    Proceed to checkout
                  </Link>
                  
                  <div className="mt-4 text-center">
                    <Link
                      href="/products"
                      className="text-gray-600 hover:text-gray-900 font-medium transition-colors inline-flex items-center gap-2"
                    >
                      ← Continue shopping
                    </Link>
                  </div>
                </div>

             
              </div>

      
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Component
function AnimatedNotification({
  show,
  onUndo,
  removedItem,
}: {
  show: boolean;
  onUndo: () => void;
  removedItem: CartEntry | null;
}) {
  if (!show || !removedItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md"
    >
      <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={removedItem.product.image || "/images/placeholder.jpg"}
                alt={removedItem.product.name}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                "{removedItem.product.name}" removed
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(removedItem.product.price)} • {removedItem.quantity} item(s)
              </p>
            </div>
          </div>
          <button
            onClick={onUndo}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors font-medium"
          >
            <Undo className="w-4 h-4" />
            Undo
          </button>
        </div>
      </div>
    </motion.div>
  );
}
