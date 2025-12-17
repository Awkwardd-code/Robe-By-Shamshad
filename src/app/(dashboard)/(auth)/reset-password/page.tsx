import { Suspense } from "react";
import ResetPassword from "./_components/ResetPassword";

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-emerald-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPassword />
    </Suspense>
  );
}
