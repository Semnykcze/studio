
"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const BORDER_CLASS = "border-2 border-primary";
  const BACKGROUND_CLASS = "bg-background";
  const RING_CLASSES = "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const STATE_CLASSES = "transition-colors disabled:pointer-events-none disabled:opacity-50";
  const SIZE_CLASS = "block h-5 w-5 rounded-full"; // Consistent thumb size

  const commonThumbClass = cn(
    SIZE_CLASS,
    BORDER_CLASS,
    BACKGROUND_CLASS,
    RING_CLASSES,
    STATE_CLASSES
  );

  // Check if 'value' prop is an array to determine if multiple thumbs are needed
  const isRange = Array.isArray(value);

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value} // Pass value prop to Root
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {isRange ? (
        value.map((_, i) => <SliderPrimitive.Thumb key={i} className={commonThumbClass} />)
      ) : (
        <SliderPrimitive.Thumb className={commonThumbClass} />
      )}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

