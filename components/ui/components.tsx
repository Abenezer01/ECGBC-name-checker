// Component building blocks

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-white text-slate-900 border border-slate-200 rounded-lg shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost', size?: 'sm' | 'md' | 'lg' | 'default' }) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 py-2 text-sm',
    default: 'h-9 px-4 py-2 text-sm',
    lg: 'h-10 px-8 text-base',
  };

  return (
    <button className={cn('inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:opacity-50 disabled:pointer-events-none', variants[variant], sizes[size], className)} {...props} />
  );
}

export function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'danger' }) {
   const variants = {
      default: 'bg-slate-100 text-slate-900 border border-slate-200',
      success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border border-amber-200',
      danger: 'bg-red-50 text-red-700 border border-red-200'
   };
   return (
       <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
           {children}
       </span>
   )
}

export function ProgressBar({ progress, label, status }: { progress: number, label?: string, status?: string }) {
    return (
        <div className="w-full">
            {(label || status) && (
                <div className="flex justify-between items-center mb-1 text-sm font-medium text-slate-700">
                    <span>{label}</span>
                    <span>{status || `${Math.round(progress)}%`}</span>
                </div>
            )}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
                <div 
                    className="bg-slate-900 h-2 rounded-full transition-all duration-300 ease-out absolute left-0 top-0" 
                    style={{ width: `${progress}%` }} 
                />
            </div>
        </div>
    )
}
