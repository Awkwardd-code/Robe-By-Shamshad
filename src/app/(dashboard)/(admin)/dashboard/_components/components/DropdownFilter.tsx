'use client';

import { useState, useRef, useEffect } from 'react';
import Transition from '../utils/Transition';

interface DropdownFilterProps {
  align?: 'left' | 'right';
}

const DropdownFilter: React.FC<DropdownFilterProps> = ({ align = 'left' }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);

  const Checkrefs = {
    DirectorIndirect: useRef<HTMLInputElement>(null),
    RealTimeValue: useRef<HTMLInputElement>(null),
    Topcahnnels: useRef<HTMLInputElement>(null),
    SalesRefunds: useRef<HTMLInputElement>(null),
    LastOrder: useRef<HTMLInputElement>(null),
    TotalSpent: useRef<HTMLInputElement>(null),
  };

  const handleFilters = () => {
    Object.keys(Checkrefs).forEach((key) => {
      const ref = Checkrefs[key as keyof typeof Checkrefs];
      if (ref.current?.checked) {
        ref.current.checked = false;
      }
    });
  };

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current || !trigger.current) return;
      if (
        !dropdownOpen ||
        dropdown.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.addEventListener('click', clickHandler);
  }, [dropdownOpen]);

  // Close on ESC key
  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (dropdownOpen && key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [dropdownOpen]);

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className="btn px-2.5 bg-white dark:bg-gray-800 border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 text-gray-400 dark:text-gray-500"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">Filter</span>
        <wbr />
        <svg
          className="fill-current"
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <path d="M0 3a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1ZM3 8a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1ZM7 12a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7Z" />
        </svg>
      </button>
      <Transition
        tag="div"
        className={`origin-top-right z-10 absolute top-full left-0 right-auto min-w-56 bg-[#dbc59c] border border-[#bfa77a] pt-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${
          align === 'right' ? 'md:left-auto md:right-0' : 'md:left-0 md:right-auto'
        }`}
        show={dropdownOpen}
        appear={true}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div ref={dropdown}>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase pt-1.5 pb-2 px-3">
            Filters
          </div>
          <ul className="mb-4">
            <li className="py-1 px-3">
              <label className="flex items-center">
                <input
                  ref={Checkrefs.DirectorIndirect}
                  type="checkbox"
                  className="form-checkbox"
                />
                <span className="text-sm font-medium ml-2">Direct VS Indirect</span>
              </label>
            </li>
            <li className="py-1 px-3">
              <label className="flex items-center">
                <input
                  ref={Checkrefs.RealTimeValue}
                  type="checkbox"
                  className="form-checkbox"
                />
                <span className="text-sm font-medium ml-2">Real Time Value</span>
              </label>
            </li>
            <li className="py-1 px-3">
              <label className="flex items-center">
                <input
                  ref={Checkrefs.Topcahnnels}
                  type="checkbox"
                  className="form-checkbox"
                />
                <span className="text-sm font-medium ml-2">Top Channels</span>
              </label>
            </li>
            <li className="py-1 px-3">
              <label className="flex items-center">
                <input
                  ref={Checkrefs.SalesRefunds}
                  type="checkbox"
                  className="form-checkbox"
                />
                <span className="text-sm font-medium ml-2">Sales VS Refunds</span>
              </label>
            </li>
            <li className="py-1 px-3">
              <label className="flex items-center">
                <input
                  ref={Checkrefs.LastOrder}
                  type="checkbox"
                  className="form-checkbox"
                />
                <span className="text-sm font-medium ml-2">Last Order</span>
              </label>
            </li>
            <li className="py-1 px-3">
              <label className="flex items-center">
                <input
                  ref={Checkrefs.TotalSpent}
                  type="checkbox"
                  className="form-checkbox"
                />
                <span className="text-sm font-medium ml-2">Total Spent</span>
              </label>
            </li>
          </ul>
          <div className="py-2 px-3 border-t border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-700/20">
            <ul className="flex items-center justify-between">
              <li>
                <button
                  onClick={handleFilters}
                  className="btn-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-red-500"
                >
                  Clear
                </button>
              </li>
              <li>
                <button
                  className="btn-xs bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                  onClick={() => setDropdownOpen(false)}
                  onBlur={() => setDropdownOpen(false)}
                >
                  Apply
                </button>
              </li>
            </ul>
          </div>
        </div>
      </Transition>
    </div>
  );
};

export default DropdownFilter;