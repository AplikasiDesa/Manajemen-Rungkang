"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onClear?: () => void
  onToday?: () => void
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  onClear,
  onToday,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("p-3 bg-white rounded-xl", className)}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        classNames={{
          months: "flex flex-col space-y-4",
          month: "space-y-4",
          month_caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-sm font-bold text-primary",
          nav: "space-x-1 flex items-center",
          button_previous: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-primary/20 absolute left-1"
          ),
          button_next: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-primary/20 absolute right-1"
          ),
          month_grid: "w-full border-collapse",
          weekdays: "hidden",
          weekday: "hidden",
          week: "grid grid-cols-7 w-full mt-1",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 rounded-full"
          ),
          range_end: "day-range-end",
          selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold",
          today: "bg-accent/20 text-accent font-extrabold border border-accent/50",
          outside:
            "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          disabled: "text-muted-foreground opacity-50",
          range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: (props) => {
            if (props.orientation === "left") {
              return <ChevronLeft className="h-4 w-4" />
            }
            return <ChevronRight className="h-4 w-4" />
          },
        }}
        {...props}
      />
      {(onClear || onToday) && (
        <div className="flex items-center justify-between px-2 pt-4 border-t mt-4">
          {onClear && (
            <button
              onClick={onClear}
              className="text-xs font-bold text-primary hover:text-primary/70 transition-colors"
            >
              HAPUS PILIHAN
            </button>
          )}
          {onToday && (
            <button
              onClick={onToday}
              className="text-xs font-bold text-primary hover:text-primary/70 transition-colors"
            >
              HARI INI
            </button>
          )}
        </div>
      )}
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
