import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-nexus-primary text-white shadow-lg shadow-nexus-primary/20 hover:bg-nexus-primary/90 active:scale-95',
      secondary: 'bg-surface-hover text-text-main shadow-sm hover:bg-border/50 border border-border/10 active:scale-95',
      outline: 'bg-transparent border-2 border-nexus-primary text-nexus-primary hover:bg-nexus-primary/10 active:scale-95',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-muted hover:text-text-main active:scale-95',
      danger: 'bg-nexus-danger text-white hover:bg-nexus-danger/90 shadow-lg shadow-nexus-danger/20 active:scale-95',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-5 py-2.5 text-sm rounded-xl',
      lg: 'px-8 py-3.5 text-base rounded-2xl',
      icon: 'p-2.5 rounded-xl',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...(props as any)}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'bg-surface border border-border/50 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-nexus-primary/20',
      className
    )}
    {...(props as any)}
  >
    {children}
  </motion.div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full bg-surface-hover border border-border/50 rounded-xl p-3.5 text-sm focus:border-nexus-primary focus:ring-2 focus:ring-nexus-primary/20 outline-none transition-all placeholder:text-text-muted/50',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';

export const Badge = ({ className, variant = 'default', children }: { className?: string, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info', children: React.ReactNode }) => {
  const styles = {
    default: 'bg-surface-hover text-text-muted border-border/50',
    success: 'bg-nexus-success/10 text-nexus-success border-nexus-success/20',
    warning: 'bg-nexus-warning/10 text-nexus-warning border-nexus-warning/20',
    danger: 'bg-nexus-danger/10 text-nexus-danger border-nexus-danger/20',
    info: 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/20',
  };

  return (
    <span className={cn(
      'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border',
      styles[variant],
      className
    )}>
      {children}
    </span>
  );
};
