"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, AlertTriangle, RefreshCw, ShoppingBag, CreditCard, Phone, Mail, Shield, Lock } from "lucide-react";

interface OrderFailedProps {
  errorCode?: string;
  errorMessage?: string;
  orderId?: string;
  retryAction?: () => void;
  contactEmail?: string;
  contactPhone?: string;
}

export default function OrderFailed({
  errorCode = "PAYMENT_FAILED",
  errorMessage = "Your payment could not be processed. Please try again or use a different payment method.",
  orderId = "ROBE-ORD-00123",
  retryAction,
  contactEmail = "support@robe-shamshad.com",
  contactPhone = "+880 9678-123456"
}: OrderFailedProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const handleRetry = () => {
    setRetryAttempt(prev => prev + 1);
    if (retryAction) {
      retryAction();
    }
  };

  const errorDetails = {
    "PAYMENT_FAILED": {
      title: "Payment Declined",
      suggestions: [
        "Check if your card details are correct",
        "Ensure you have sufficient balance",
        "Try a different payment method",
        "Contact your bank for authorization"
      ],
      icon: <CreditCard className="w-6 h-6" />
    },
    "NETWORK_ERROR": {
      title: "Connection Error",
      suggestions: [
        "Check your internet connection",
        "Try again in a few moments",
        "Disable VPN if you're using one",
        "Clear browser cache and cookies"
      ],
      icon: <AlertTriangle className="w-6 h-6" />
    },
    "VALIDATION_ERROR": {
      title: "Information Error",
      suggestions: [
        "Verify your shipping address",
        "Check your phone number format",
        "Ensure all required fields are filled",
        "Re-enter your email address"
      ],
      icon: <AlertTriangle className="w-6 h-6" />
    },
    "SERVER_ERROR": {
      title: "System Error",
      suggestions: [
        "Try again after a few minutes",
        "Use a different payment method",
        "Save your cart and try later",
        "Contact customer support"
      ],
      icon: <AlertTriangle className="w-6 h-6" />
    }
  };

  const currentError = errorDetails[errorCode as keyof typeof errorDetails] || errorDetails.PAYMENT_FAILED;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="inline-block">
            <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ROBE
                </h1>
                <p className="text-xs text-gray-500 font-light tracking-widest">BY SHAMSHAD</p>
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-200">
                <XCircle className="w-16 h-16 text-white" />
              </div>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 border-4 border-red-300 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Order Failed
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              We couldn't process your order. Don't worry, your items are still in your cart.
            </p>
            
            {orderId && (
              <div className="inline-block px-4 py-2 bg-red-50 border border-red-200 rounded-lg mb-8">
                <p className="text-sm text-gray-600">Reference ID: <span className="font-mono font-bold text-red-700">{orderId}</span></p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Error Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 border border-red-100"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <div className="text-red-600">
                {currentError.icon}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{currentError.title}</h3>
              <p className="text-gray-700">{errorMessage}</p>
            </div>
          </div>

          {/* Error Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-between transition-colors mb-6"
          >
            <span className="font-medium text-gray-700">Technical Details</span>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Error Code</p>
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded border border-red-200 text-red-700">
                        {errorCode}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Time</p>
                      <p className="text-sm text-gray-900">{new Date().toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Debug Information</p>
                      <pre className="text-xs bg-white p-3 rounded-lg border border-red-200 overflow-x-auto">
                        {JSON.stringify({
                          error: errorCode,
                          timestamp: new Date().toISOString(),
                          retryAttempt,
                          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'
                        }, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Suggested Solutions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600">💡</span>
            </span>
            Suggested Solutions
          </h3>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {currentError.suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100"
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                </div>
                <p className="text-gray-700">{suggestion}</p>
              </motion.div>
            ))}
          </div>

          {/* Security Assurance */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Your payment information is secure</p>
                <p className="text-sm text-green-700">
                  No payment has been processed. Your financial details are encrypted and protected.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          {/* Retry Button */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-red-600" />
              Try Again
            </h4>
            <p className="text-gray-600 mb-6">
              {retryAttempt > 0 
                ? `Previous attempts: ${retryAttempt}. Please review your information.`
                : "Review your information and try processing the order again."}
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Order
            </button>
          </div>

          {/* Contact Support */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              Need Help?
            </h4>
            <p className="text-gray-600 mb-6">
              Our customer support team is ready to help you complete your purchase.
            </p>
            <div className="space-y-3">
              <a
                href={`tel:${contactPhone}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
              >
                <Phone className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">{contactPhone}</p>
                  <p className="text-sm text-gray-600">Call us (24/7 Support)</p>
                </div>
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
              >
                <Mail className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">{contactEmail}</p>
                  <p className="text-sm text-gray-600">Email support</p>
                </div>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Continue Shopping */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-200"
        >
          <div className="inline-block p-4 bg-white rounded-xl shadow-md mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Continue Shopping</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Your items have been saved in your cart. Browse our collection while we resolve this issue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cart"
              className="px-8 py-3 bg-gradient-to-r from-gray-900 to-black text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>Return to Cart</span>
            </Link>
            <Link
              href="/products"
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Browse Products</span>
            </Link>
          </div>
        </motion.div>

        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">SSL Secured</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">PCI Compliant</span>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span className="text-sm font-medium text-gray-700">256-bit Encryption</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">R</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ROBE
                  </h3>
                  <p className="text-xs text-gray-500">BY SHAMSHAD</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                We're here to help you complete your purchase
              </p>
              <p className="text-sm text-gray-600">
                Business Hours: 9 AM - 11 PM (GMT+6)
              </p>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} ROBE by Shamshad
              </p>
              <p className="text-sm text-gray-600">
                Your trust is our priority
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Pulsing Alert Animation */}
      <div className="fixed bottom-8 right-8">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-4 h-4 bg-red-500 rounded-full shadow-lg"
        />
      </div>
    </div>
  );
}