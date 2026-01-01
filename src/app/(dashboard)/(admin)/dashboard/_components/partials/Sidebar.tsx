import { useState, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  variant?: 'default' | 'v2' | 'v3';
}

function Sidebar({ sidebarOpen, setSidebarOpen, variant = 'default' }: SidebarHeaderProps) {
  const pathname = usePathname();

  const trigger = useRef<HTMLButtonElement | null>(null);
  const sidebar = useRef<HTMLDivElement | null>(null);

  const storedSidebarExpanded =
    typeof window !== 'undefined' ? localStorage.getItem('sidebar-expanded') : null;

  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true'
  );

  // Close on click outside
  useLayoutEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [sidebarOpen, setSidebarOpen]);

  // Close if the esc key is pressed
  useLayoutEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [sidebarOpen, setSidebarOpen]);

  // Update localStorage and body class for sidebar expansion
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
        const body = document.querySelector('body');
        if (body) {
          if (sidebarExpanded) body.classList.add('sidebar-expanded');
          else body.classList.remove('sidebar-expanded');
        }
      } catch (e) {
        console.error('Failed to access localStorage:', e);
      }
    }
  }, [sidebarExpanded]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleSidebarExpand = () => setSidebarExpanded(!sidebarExpanded);

  // size tokens (reduced by ~10px from your original)
  const SIDEBAR_W = 'w-[310px]';
  const SIDEBAR_CLOSED_TRANSLATE = '-translate-x-[310px]';
  const SIDEBAR_EXPANDED_W = 'lg:w-[246px]';
  const SIDEBAR_COLLAPSED_W = 'lg:w-[54px]';

  const ITEM_PAD = sidebarExpanded ? 'pl-2 pr-2 py-2' : 'pl-1 pr-1 py-1';

  const ICON_BOX = sidebarExpanded ? 'w-[39px] h-[39px]' : 'w-[35px] h-[35px]';
  const ICON_SIZE = sidebarExpanded ? 15 : 11;

  const LABEL_VISIBILITY = `text-sm font-medium ml-2 duration-200 ${
    sidebarExpanded ? 'lg:opacity-100' : 'lg:opacity-0'
  } 2xl:opacity-100 sidebar-text`;

  const isActive = (path: string) => pathname?.includes(path);

  return (
    <div>
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0
          h-dvh overflow-y-scroll overflow-x-hidden no-scrollbar lg:overflow-y-auto shrink-0
          bg-white dark:bg-gray-900 text-[#6b4f27] dark:text-gray-100
          border-r border-[#bfa77a] dark:border-[#232323] shadow-3xl p-1
          transition-all duration-200 ease-in-out
          ${SIDEBAR_W}
          ${sidebarOpen ? 'translate-x-0' : SIDEBAR_CLOSED_TRANSLATE}
          ${sidebarExpanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W}
          ${variant === 'v2' ? 'border-r border-[#bfa77a] dark:border-gray-900' : 'rounded-r-md shadow-xs'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-4 pr-1 sm:px-0 items-center">
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={toggleSidebar}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>

          <Link
            href="/dashboard"
            className={`inline-flex items-center justify-center w-9.5 h-9.5 rounded-full transition-all duration-300 ease-in-out
              ${
                isActive('/dashboard')
                  ? 'bg-linear-to-r from-teal-500 to-emerald-600 shadow-lg text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:shadow-md'
              }`}
          >
            <Image
              src="/logo.jpg"
              alt="Robe by Shamshad Logo"
              width={28}
              height={28}
              className="object-cover rounded-full"
            />
          </Link>
        </div>

        {/* Links */}
        <div className="space-y-6">
          <div>
            <ul className="mt-2">
              {/* Dashboard */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/dashboard')
                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-indigo-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-indigo-900/50'
                }`}
              >
                <Link
                  href="/dashboard"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-indigo-100 hover:shadow-sm dark:hover:bg-indigo-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/dashboard')
                              ? 'text-indigo-600'
                              : 'text-slate-600 group-hover:text-indigo-500 dark:text-slate-400 dark:group-hover:text-indigo-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" />
                          <path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Dashboard</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Categories */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/categories')
                    ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-emerald-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-emerald-900/50'
                }`}
              >
                <Link
                  href="/categories"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-emerald-100 hover:shadow-sm dark:hover:bg-emerald-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/categories')
                              ? 'text-emerald-600'
                              : 'text-slate-600 group-hover:text-emerald-500 dark:text-slate-400 dark:group-hover:text-emerald-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm3 2v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1zm0 4v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1zm0 4v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Categories</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Orders */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/orders')
                    ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-amber-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-amber-900/50'
                }`}
              >
                <Link
                  href="/orders"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-amber-600 dark:hover:text-amber-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-amber-100 hover:shadow-sm dark:hover:bg-amber-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/orders')
                              ? 'text-amber-600'
                              : 'text-slate-600 group-hover:text-amber-500 dark:text-slate-400 dark:group-hover:text-amber-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Orders</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Users */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/users')
                    ? 'bg-linear-to-r from-purple-600 to-violet-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-purple-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-purple-900/50'
                }`}
              >
                <Link
                  href="/users"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-purple-100 hover:shadow-sm dark:hover:bg-purple-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/users')
                              ? 'text-purple-600'
                              : 'text-slate-600 group-hover:text-purple-500 dark:text-slate-400 dark:group-hover:text-purple-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                          <path
                            fillRule="evenodd"
                            d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"
                          />
                          <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Users</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Offers */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/offers')
                    ? 'bg-linear-to-r from-rose-600 to-pink-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-rose-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-rose-900/50'
                }`}
              >
                <Link
                  href="/offers"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-rose-100 hover:shadow-sm dark:hover:bg-rose-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/offers')
                              ? 'text-rose-600'
                              : 'text-slate-600 group-hover:text-rose-500 dark:text-slate-400 dark:group-hover:text-rose-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Offers</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Collections */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/collections')
                    ? 'bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-cyan-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-cyan-900/50'
                }`}
              >
                <Link
                  href="/collections"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-cyan-600 dark:hover:text-cyan-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-cyan-100 hover:shadow-sm dark:hover:bg-cyan-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/collections')
                              ? 'text-cyan-600'
                              : 'text-slate-600 group-hover:text-cyan-500 dark:text-slate-400 dark:group-hover:text-cyan-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M2.5 2A1.5 1.5 0 0 0 1 3.5v9A1.5 1.5 0 0 0 2.5 14h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 13.5 2zm0 1h11a.5.5 0 0 1 .5.5V5H2V3.5a.5.5 0 0 1 .5-.5zm-.5 3h12v5.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5z" />
                          <path d="M4 8.5A.5.5 0 0 1 4.5 8h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8.5zm0 2A.5.5 0 0 1 4.5 10h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Collections</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Seasonal Collection */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/seasonal-collection')
                    ? 'bg-linear-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-orange-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-orange-900/50'
                }`}
              >
                <Link
                  href="/seasonal-collection"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-orange-600 dark:hover:text-orange-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-orange-100 hover:shadow-sm dark:hover:bg-orange-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/seasonal-collection')
                              ? 'text-orange-600'
                              : 'text-slate-600 group-hover:text-orange-500 dark:text-slate-400 dark:group-hover:text-orange-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 0a3 3 0 0 1 3 3v1h1a3 3 0 0 1 0 6h-1v1a3 3 0 0 1-6 0v-1H4a3 3 0 0 1 0-6h1V3a3 3 0 0 1 3-3zm0 1.5A1.5 1.5 0 0 0 6.5 3v1h3V3A1.5 1.5 0 0 0 8 1.5zm-4 4A1.5 1.5 0 0 0 4 8h1V6.5H4zm8 0h-1V8h1a1.5 1.5 0 0 0 0-3zM6.5 9.5V11a1.5 1.5 0 0 0 3 0V9.5h-3z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Seasonal Collection</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Features Grid */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/features-grid')
                    ? 'bg-linear-to-r from-slate-600 to-gray-700 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-slate-200 hover:shadow-md dark:bg-slate-800 dark:hover:bg-slate-700/50'
                }`}
              >
                <Link
                  href="/features-grid"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-slate-200 hover:shadow-sm dark:hover:bg-slate-700/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/features-grid')
                              ? 'text-slate-600'
                              : 'text-slate-600 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M1 1h5v5H1V1zm0 9h5v5H1v-5zm9-9h5v5h-5V1zm0 9h5v5h-5v-5z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Features Grid</span>
                    </div>
                  </div>
                </Link>
              </li>

              {/* Subscribers */}
             {/*  <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/newsletter')
                    ? 'bg-linear-to-r from-emerald-500 to-lime-500 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-lime-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-lime-900/50'
                }`}
              >
                <Link
                  href="/newsletter"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-emerald-100 hover:shadow-sm dark:hover:bg-lime-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/newsletter')
                              ? 'text-emerald-600'
                              : 'text-slate-600 group-hover:text-emerald-500 dark:text-slate-400 dark:group-hover:text-emerald-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1z" />
                          <path d="m15 6.383-4.708 2.826L15 12.118V6.383zm-.034 7.318-6.843-4.109L1.278 13.7A1 1 0 0 0 2 14h12a1 1 0 0 0 .966-.299z" />
                          <path d="M1 12.118l4.708-2.909L1 6.383v5.735z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Subscribers</span>
                    </div>
                  </div>
                </Link>
              </li> */}

              {/* Coupons */}
              <li
                className={`rounded-sm mb-1 last:mb-0 transition-all duration-200 ease-in-out ${ITEM_PAD} ${
                  isActive('/coupons')
                    ? 'bg-linear-to-r from-emerald-500 to-lime-500 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-lime-100 hover:shadow-md dark:bg-slate-800 dark:hover:bg-lime-900/50'
                }`}
              >
                <Link
                  href="/coupons"
                  className="block text-gray-800 dark:text-gray-100 truncate transition-all duration-200 ease-in-out hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grow flex items-center ${sidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                      <div
                        className={`inline-flex items-center justify-center rounded-sm bg-white/60 dark:bg-slate-800/60 transition-all duration-200 ease-in-out hover:bg-emerald-100 hover:shadow-sm dark:hover:bg-lime-900/40 ${ICON_BOX}`}
                      >
                        <svg
                          className={`shrink-0 fill-current transition-all duration-200 ease-in-out ${
                            isActive('/coupons')
                              ? 'text-emerald-600'
                              : 'text-slate-600 group-hover:text-emerald-500 dark:text-slate-400 dark:group-hover:text-emerald-400'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          width={ICON_SIZE}
                          height={ICON_SIZE}
                          viewBox="0 0 16 16"
                        >
                          <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9a2 2 0 0 0 0-4z" />
                          <path d="M5 4h1v1H5zm0 3h1v1H5zm0 3h1v1H5z" />
                        </svg>
                      </div>
                      <span className={LABEL_VISIBILITY}>Coupons</span>
                    </div>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-2 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
          <div className="w-10 pl-2 pb-6 pr-2 py-1">
            <button
              className="text-gray-400 cursor-pointer hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              onClick={toggleSidebarExpand}
            >
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg
                className={`shrink-0 fill-current text-gray-400 dark:text-gray-500 ${
                  sidebarExpanded ? 'rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M15 16a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v14a1 1 0 0 1-1 1ZM8.586 7H1a1 1 0 1 0 0 2h7.586l-2.793 2.793a1 1 0 1 0 1.414 1.414l4.5-4.5A.997.997 0 0 0 12 8.01M11.924 7.617a.997.997 0 0 0-.217-.324l-4.5-4.5a1 1 0 0 0-1.414 1.414L8.586 7M12 7.99a.996.996 0 0 0-.076-.373Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
