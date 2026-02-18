// "use client"
// import * as React from "react"
// import * as DialogPrimitive from "@radix-ui/react-dialog"
// import { X } from "lucide-react"
// import { cn } from "./utils"
// import { useIsLg } from "./use-mobile"

// const Dialog = DialogPrimitive.Root

// const DialogTrigger = DialogPrimitive.Trigger

// const DialogPortal = DialogPrimitive.Portal

// const DialogClose = DialogPrimitive.Close

// const DialogOverlay = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Overlay>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
// >(({ className, ...props }, ref) => (
//   <DialogPrimitive.Overlay
//     ref={ref}
//     className={cn(
//       "fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
//       className,
//     )}
//     {...props}
//   />
// ))
// DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// /** Responsive dialog: bottom sheet (~90% height) on small/medium screens, full-height right panel on large (≥1024px). Use variant="centered" for classic centered modal. */
// const DialogContent = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Content>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
//     /** "responsive" = bottom sheet on sm/md, right panel on lg; "centered" = classic centered modal */
//     variant?: "responsive" | "centered"
//   }
// >(({ className, children, variant = "responsive", ...props }, ref) => {
//   const isLg = useIsLg()

//   const isResponsive = variant === "responsive"
//   const isBottomSheet = isResponsive && !isLg
//   const isRightPanel = isResponsive && isLg

//   const contentClass = cn(
//     "fixed z-[100] flex flex-col border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden",
//     // Responsive: bottom sheet (small/medium)
//     isBottomSheet &&
//       "inset-x-0 bottom-0 h-[90vh] max-h-[90vh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
//     // Responsive: right panel (large) — full height, min width 500px, no rounded corners
//     isRightPanel &&
//       "inset-y-0 right-0 h-full min-w-[500px] w-full max-w-3xl border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
//     // Classic centered
//     !isResponsive &&
//       "left-[50%] top-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-6 sm:rounded-lg data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
//     className,
//   )

//   return (
//     <DialogPortal >
//       <DialogOverlay />
//       <DialogPrimitive.Content ref={ref} className={contentClass} {...props}>
//         {isBottomSheet && (
//           <div className="flex shrink-0 justify-center pt-3 pb-1">
//             <div className="h-1.5 w-12 rounded-full bg-muted" aria-hidden />
//           </div>
//         )}
//         <div
//           className={cn(
//             "relative flex flex-1 flex-col gap-6 overflow-hidden" ,
//             isResponsive && "min-h-0 p-4 pt-2",
//             !isResponsive && "gap-4 p-6",
//           )}
//         >
//           <DialogPrimitive.Close
//             className={cn(
//               "absolute z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm ring-offset-background transition-colors hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-products-none",
//               isBottomSheet && "right-4 top-2",
//               isRightPanel && "right-4 top-2",
//               !isResponsive && "right-4 top-2",
//             )}
//           >
//             <X className="h-4 w-4 shrink-0 cursor-pointer text-muted-foreground" />
//             <span className="sr-only">Close</span>
//           </DialogPrimitive.Close>
//           <div
//             data-dialog-scroll
//             className={cn(
//               "flex flex-1 flex-col min-h-0 mt-12 px-1",
//               isResponsive && "overflow-y-auto scrollbar-thin [scrollbar-width:thin]",
//               !isResponsive && "grid",
//             )}
//           >
//             {children}
//           </div>
//         </div>
//       </DialogPrimitive.Content>
//     </DialogPortal>
//   )
// })
// DialogContent.displayName = DialogPrimitive.Content.displayName

// const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
//   <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
// )
// DialogHeader.displayName = "DialogHeader"

// const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
//   <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2", className)} {...props} />
// )
// DialogFooter.displayName = "DialogFooter"

// const DialogTitle = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Title>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
// >(({ className, ...props }, ref) => (
//   <DialogPrimitive.Title
//     ref={ref}
//     className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
//     {...props}
//   />
// ))
// DialogTitle.displayName = DialogPrimitive.Title.displayName

// const DialogDescription = React.forwardRef<
//   React.ElementRef<typeof DialogPrimitive.Description>,
//   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
// >(({ className, ...props }, ref) => (
//   <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
// ))
// DialogDescription.displayName = DialogPrimitive.Description.displayName

// export {
//   Dialog,
//   DialogPortal,
//   DialogOverlay,
//   DialogTrigger,
//   DialogClose,
//   DialogContent,
//   DialogHeader,
//   DialogFooter,
//   DialogTitle,
//   DialogDescription,
// }

"use client"
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "./utils"
import { useIsLg } from "./use-mobile"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/** Responsive dialog: bottom sheet (~90% height) on small/medium screens, full-height right panel on large (≥1024px). Use variant="centered" for classic centered modal. */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** "responsive" = bottom sheet on sm/md, right panel on lg; "centered" = classic centered modal */
    variant?: "responsive" | "centered"
  }
>(({ className, children, variant = "responsive", ...props }, ref) => {
  const isLg = useIsLg()

  const isResponsive = variant === "responsive"
  const isBottomSheet = isResponsive && !isLg
  const isRightPanel = isResponsive && isLg

  const contentClass = cn(
    "fixed z-[100] flex flex-col border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden",
    // Responsive: bottom sheet (small/medium)
    isBottomSheet &&
      "inset-x-0 bottom-0 h-[90vh] max-h-[90vh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
    // Responsive: right panel (large) — full height, min width 500px, no rounded corners
    isRightPanel &&
      "inset-y-0 right-0 h-full min-w-[500px] w-full max-w-3xl border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
    // Classic centered
    !isResponsive &&
      "left-[50%] top-[50%] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-6 sm:rounded-lg data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    className,
  )

  return (
    <DialogPortal >
      <DialogOverlay />
      <DialogPrimitive.Content ref={ref} className={contentClass} {...props}>
        {isBottomSheet && (
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1.5 w-12 rounded-full bg-muted" aria-hidden />
          </div>
        )}
        <div
          className={cn(
            "relative flex flex-1 flex-col gap-6 overflow-hidden" ,
            isResponsive && "min-h-0 p-4 pt-2",
            !isResponsive && "gap-4 p-6",
          )}
        >
          <DialogPrimitive.Close
            className={cn(
              "absolute z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm ring-offset-background transition-colors hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-products-none",
              isBottomSheet && "right-4 top-2",
              isRightPanel && "right-4 top-2",
              !isResponsive && "right-4 top-2",
            )}
          >
            <X className="h-4 w-4 shrink-0 cursor-pointer text-muted-foreground" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          <div
            data-dialog-scroll
            className={cn(
              "flex flex-1 flex-col min-h-0 mt-12 px-1",
              isResponsive && "overflow-y-auto scrollbar-thin [scrollbar-width:thin]",
              !isResponsive && "grid",
            )}
          >
            {children}
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
