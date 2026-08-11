import * as React from "react"

import { cn } from "@/lib/utils"

let pendingNumberInputFocusSignature = null

const Input = React.forwardRef(({ className, type, ...props }, forwardedRef) => {
  const localRef = React.useRef(null)
  const preserveQuickAmountFocus =
    type === "number" && String(props.placeholder || "") === "0.00"
  const focusSignature = preserveQuickAmountFocus
    ? `${type}|${props.name || ""}|${props.placeholder || ""}|${props["aria-label"] || ""}`
    : ""

  const setRef = React.useCallback(
    (node) => {
      localRef.current = node
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [forwardedRef]
  )

  React.useLayoutEffect(() => {
    const node = localRef.current

    if (
      preserveQuickAmountFocus &&
      pendingNumberInputFocusSignature === focusSignature &&
      node
    ) {
      pendingNumberInputFocusSignature = null
      node.focus({ preventScroll: true })
    }

    return () => {
      if (
        preserveQuickAmountFocus &&
        localRef.current &&
        typeof document !== "undefined" &&
        document.activeElement === localRef.current
      ) {
        pendingNumberInputFocusSignature = focusSignature
      }
    }
  }, [focusSignature, preserveQuickAmountFocus])

  return (
    (<input
      type={type}
      className={cn(
        "theme-input flex h-9 w-full rounded-md px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={setRef}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }