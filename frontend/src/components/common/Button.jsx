import React from 'react';
import { cn } from './Input';

export const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
        default: "bg-forest-500 text-white hover:bg-forest-600 shadow-sm",
        outline: "border border-forest-700 bg-transparent hover:bg-forest-800 text-slate-200",
        ghost: "hover:bg-forest-800/50 text-slate-200 hover:text-slate-50",
        danger: "bg-alert-600 text-white hover:bg-alert-700 shadow-sm",
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"
