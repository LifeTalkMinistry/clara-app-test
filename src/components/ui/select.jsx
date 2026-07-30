"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const SAVINGS_OTHER_VALUE = "__clara_savings_other__"

const SAVINGS_GOAL_OPTIONS = {
  "Celebrations & Gifts": [
    "Birthday",
    "Wedding",
    "Anniversary",
    "Holiday",
    "Family Event",
    "Special Occasion",
  ],
  "Personal Purchases": [
    "Gadget",
    "Clothing",
    "Furniture",
    "Vehicle",
    "Hobby / Collection",
    "Personal Upgrade",
  ],
  Experiences: [
    "Travel",
    "Vacation",
    "Concert",
    "Retreat",
    "Recreation / Adventure",
    "Staycation",
  ],
  "Financial / Protection": [
    "Emergency Fund",
    "Insurance",
    "Investment",
    "Debt Payment",
    "Retirement",
    "Tax / Legal",
  ],
  "Health & Wellness": [
    "Medical",
    "Self-Care",
    "Gym",
    "Mental Health",
    "Dental / Vision",
    "Medicine / Treatment",
  ],
  "Education & Growth": [
    "Tuition / School Fees",
    "Course / Certification",
    "Books / Learning Materials",
    "Training / Workshop",
    "Study Equipment",
    "Skill Development",
  ],
  "Home & Family": [
    "Home Improvement",
    "Rent / Moving",
    "Household Appliance",
    "Child / Family Needs",
    "Family Support",
    "Pet Care",
  ],
  "Career & Business": [
    "Business Capital",
    "Equipment / Tools",
    "Professional Fees",
    "Job Transition",
    "Side Hustle",
    "Marketing / Expansion",
  ],
  "Faith & Community": [
    "Church Project",
    "Ministry / Mission",
    "Donation / Outreach",
    "Community Event",
    "Retreat / Conference",
    "Volunteer Activity",
  ],
}

const SavingsSelectContext = React.createContext(null)

let currentSavingsCategory = ""
const savingsCategoryListeners = new Set()

const setCurrentSavingsCategory = (value) => {
  const nextValue = String(value || "").trim()
  if (nextValue === currentSavingsCategory) return
  currentSavingsCategory = nextValue
  savingsCategoryListeners.forEach((listener) => listener(nextValue))
}

const useCurrentSavingsCategory = () => {
  const [value, setValue] = React.useState(currentSavingsCategory)

  React.useEffect(() => {
    savingsCategoryListeners.add(setValue)
    return () => savingsCategoryListeners.delete(setValue)
  }, [])

  return value
}

const isKnownSavingsValue = (fieldKind, value, category = currentSavingsCategory) => {
  const cleanValue = String(value || "").trim()
  if (!cleanValue) return false
  if (fieldKind === "savings-category") {
    return Object.prototype.hasOwnProperty.call(SAVINGS_GOAL_OPTIONS, cleanValue)
  }
  if (fieldKind === "savings-subcategory") {
    return (SAVINGS_GOAL_OPTIONS[category] || []).includes(cleanValue)
  }
  return false
}

const Select = ({ value, defaultValue, onValueChange, children, ...props }) => {
  const [fieldKind, setFieldKind] = React.useState(null)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "")
  const [customOpen, setCustomOpen] = React.useState(false)
  const [customDraft, setCustomDraft] = React.useState("")
  const resolvedValue = value !== undefined ? value : uncontrolledValue

  React.useEffect(() => {
    if (fieldKind === "savings-category") setCurrentSavingsCategory(resolvedValue)
  }, [fieldKind, resolvedValue])

  const applyValue = React.useCallback((nextValue) => {
    if (value === undefined) setUncontrolledValue(nextValue)
    if (fieldKind === "savings-category") setCurrentSavingsCategory(nextValue)
    setCustomOpen(false)
    onValueChange?.(nextValue)
  }, [fieldKind, onValueChange, value])

  const handleValueChange = React.useCallback((nextValue) => {
    if (
      (fieldKind === "savings-category" || fieldKind === "savings-subcategory") &&
      nextValue === SAVINGS_OTHER_VALUE
    ) {
      const existingCustomValue = isKnownSavingsValue(fieldKind, resolvedValue)
        ? ""
        : String(resolvedValue || "")
      setCustomDraft(existingCustomValue)
      setCustomOpen(true)
      return
    }
    applyValue(nextValue)
  }, [applyValue, fieldKind, resolvedValue])

  const commitCustomValue = React.useCallback(() => {
    const cleanValue = customDraft.trim()
    if (!cleanValue) return
    applyValue(cleanValue)
  }, [applyValue, customDraft])

  const contextValue = React.useMemo(() => ({
    fieldKind,
    setFieldKind,
    resolvedValue,
    customOpen,
    setCustomOpen,
    customDraft,
    setCustomDraft,
    commitCustomValue,
  }), [fieldKind, resolvedValue, customOpen, customDraft, commitCustomValue])

  return (
    <SavingsSelectContext.Provider value={contextValue}>
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>

      {customOpen && (fieldKind === "savings-category" || fieldKind === "savings-subcategory") ? (
        <div className="mt-2 rounded-xl border border-cyan-300/25 bg-[#08152b] p-2 shadow-[0_14px_35px_rgba(0,0,0,0.32)]">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100/70">
            {fieldKind === "savings-category" ? "Specific category" : "Specific subcategory"}
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={customDraft}
              onChange={(event) => setCustomDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitCustomValue()
                }
                if (event.key === "Escape") setCustomOpen(false)
              }}
              placeholder={fieldKind === "savings-category" ? "Type your category" : "Type your subcategory"}
              aria-label={fieldKind === "savings-category" ? "Custom savings category" : "Custom savings subcategory"}
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/12 bg-[#0b1a2f] px-3 text-base text-white outline-none placeholder:text-white/35 focus:border-cyan-300/55 focus:ring-1 focus:ring-cyan-300/35"
            />
            <button
              type="button"
              disabled={!customDraft.trim()}
              onClick={commitCustomValue}
              className="h-10 rounded-lg bg-cyan-300 px-3 text-sm font-bold text-[#031522] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use
            </button>
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </SavingsSelectContext.Provider>
  )
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = React.forwardRef(({ children, placeholder, ...props }, ref) => {
  const savingsContext = React.useContext(SavingsSelectContext)

  if (savingsContext?.fieldKind && savingsContext.resolvedValue) {
    return (
      <span ref={ref} {...props}>
        {savingsContext.resolvedValue}
      </span>
    )
  }

  return (
    <SelectPrimitive.Value ref={ref} placeholder={placeholder} {...props}>
      {children}
    </SelectPrimitive.Value>
  )
})
SelectValue.displayName = SelectPrimitive.Value.displayName

const SelectTrigger = React.forwardRef(({ className, children, ...props }, forwardedRef) => {
  const savingsContext = React.useContext(SavingsSelectContext)
  const localRef = React.useRef(null)

  const setRefs = React.useCallback((node) => {
    localRef.current = node
    if (typeof forwardedRef === "function") forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }, [forwardedRef])

  React.useEffect(() => {
    const trigger = localRef.current
    if (!trigger || !savingsContext?.setFieldKind) return

    const dialog = trigger.closest('[role="dialog"]')
    const dialogText = String(dialog?.textContent || "")
    if (!/\b(?:New|Edit) Savings Goal\b/i.test(dialogText)) return

    const parent = trigger.parentElement
    const label = parent?.querySelector("label")
    const labelText = String(label?.textContent || "").trim().toLowerCase()

    if (labelText === "category") savingsContext.setFieldKind("savings-category")
    else if (labelText === "subcategory") savingsContext.setFieldKind("savings-subcategory")
  }, [savingsContext])

  return (
    <SelectPrimitive.Trigger
      ref={setRefs}
      className={cn(
        "theme-input flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center bg-[#08152b] py-1.5 text-white/75", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center bg-[#08152b] py-1.5 text-white/75", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const savingsContext = React.useContext(SavingsSelectContext)
  const savingsCategory = useCurrentSavingsCategory()
  let renderedChildren = children

  if (savingsContext?.fieldKind === "savings-category") {
    renderedChildren = (
      <>
        {Object.keys(SAVINGS_GOAL_OPTIONS).map((category) => (
          <SelectItem key={category} value={category}>{category}</SelectItem>
        ))}
        <SelectPrimitive.Separator className="-mx-1 my-1 h-px bg-white/10" />
        <SelectItem value={SAVINGS_OTHER_VALUE}>Other — type your own</SelectItem>
      </>
    )
  } else if (savingsContext?.fieldKind === "savings-subcategory") {
    const mappedOptions = SAVINGS_GOAL_OPTIONS[savingsCategory] || []
    const existingOptions = React.Children.toArray(children)
      .map((child) => child?.props?.value)
      .filter(Boolean)
    const options = [...new Set(mappedOptions.length > 0 ? mappedOptions : existingOptions)]

    renderedChildren = (
      <>
        {options.map((subcategory) => (
          <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
        ))}
        {options.length > 0 ? (
          <SelectPrimitive.Separator className="-mx-1 my-1 h-px bg-white/10" />
        ) : null}
        <SelectItem value={SAVINGS_OTHER_VALUE}>Other — type your own</SelectItem>
      </>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-[120] max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-white/15 bg-[#08152b] text-white shadow-[0_24px_70px_rgba(0,0,0,0.58)] ring-1 ring-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "bg-[#08152b] p-1.5",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {renderedChildren}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold text-white/70", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 pl-3 pr-9 text-sm font-medium text-white/90 outline-none transition-colors focus:bg-cyan-300 focus:text-[#031522] data-[highlighted]:bg-cyan-300 data-[highlighted]:text-[#031522] data-[state=checked]:bg-cyan-300 data-[state=checked]:text-[#031522] data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
      className
    )}
    {...props}
  >
    <span className="absolute right-2.5 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-white/10", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
