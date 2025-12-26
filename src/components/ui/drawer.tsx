import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

const Drawer = ({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in-0">
            <div className="fixed inset-0" onClick={() => onOpenChange(false)} />
            {children}
        </div>
    )
}

const DrawerContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative z-50 w-full max-w-md h-full border-l bg-white p-6 shadow-2xl duration-300 animate-in slide-in-from-right-full",
            className
        )}
        {...props}
    >
        {children}
    </div>
))
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-left mb-6",
            className
        )}
        {...props}
    />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto pt-6 border-t border-gray-100",
            className
        )}
        {...props}
    />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-gray-900",
            className
        )}
        {...props}
    />
))
DrawerTitle.displayName = "DrawerTitle"

const DrawerClose = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100"
    >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
    </button>
)

export {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerClose
}
