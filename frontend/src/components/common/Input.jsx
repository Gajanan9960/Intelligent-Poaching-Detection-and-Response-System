import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex h-10 w-full rounded-md border border-forest-700/50 bg-forest-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-forest-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Input.displayName = "Input"
