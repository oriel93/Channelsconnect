import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        // Layout & shape
        "flex h-10 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm",
        // Font — explicit inheritance so type=number never falls back to system/Times
        "font-sans antialiased text-gray-900",
        // Background — bg-white base + autofill override (kill browser blue/yellow paint)
        "bg-white",
        "autofill:shadow-[inset_0_0_0px_1000px_white] autofill:[-webkit-text-fill-color:#111827]",
        // Placeholder
        "placeholder:text-slate-400 placeholder:font-normal",
        // Focus — purple ring only, no outline, bg stays white
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-500 focus-visible:bg-white",
        // Transitions
        "transition-all duration-150",
        // Numeric spinner removal (appearance-none breaks selects; applied inline)
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
