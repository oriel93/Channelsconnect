/**
 * SearchInput — icon-in-input done right, once.
 *
 * Replaces the ad-hoc pattern of:
 *   <div className="relative">
 *     <Search className="absolute left-3 ..." />
 *     <Input className="pl-9" ... />
 *   </div>
 *
 * Usage:
 *   <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." />
 *   <SearchInput value={q} onChange={...} onClear={() => setQ('')} className="w-64" />
 *
 * Rules:
 *   - Icon is always pointer-events-none, absolutely positioned at left-3
 *   - Input always has pl-10 (40px) — safely clears 16px icon at 12px left offset
 *   - Optional clear (X) button appears on the right when value is non-empty
 *   - Wrapper is relative flex items-center with min-width:0 so it shrinks in flex parents
 */

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SearchInput = React.forwardRef(function SearchInput(
  { className, inputClassName, value, onChange, onClear, placeholder = 'Search…', ...props },
  ref,
) {
  return (
    <div className={cn('relative flex items-center min-w-0', className)}>
      {/* Left icon — never overlaps text because input has pl-10 */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none shrink-0 z-10"
        aria-hidden="true"
      />

      <Input
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          'pl-10',                          // 40px — always clears the 16px icon
          onClear && value ? 'pr-8' : '',   // make room for clear button
          inputClassName,
        )}
        {...props}
      />

      {/* Clear button — only shown when value is non-empty and onClear provided */}
      {onClear && value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors z-10"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export { SearchInput };
