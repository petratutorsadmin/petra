import React from 'react';

/**
 * Petra UI Button
 * Follows the "Command Center" aesthetic: clean, structured, and intentional.
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ className, variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-bold tracking-widest uppercase transition-all disabled:opacity-50 disabled:pointer-events-none rounded-none";
  
  const variants = {
    primary: "shadow-md hover:opacity-90",
    secondary: "bg-surface text-text-primary border border-text-muted/20 hover:border-text-primary shadow-sm",
    ghost: "text-text-muted hover:text-text-primary",
    danger: "bg-danger text-white hover:opacity-80",
    success: "bg-success text-white hover:opacity-80"
  };

  let inlineStyle = { ...(props.style || {}) };
  if (variant === 'primary') {
    inlineStyle.backgroundColor = 'var(--text-primary)';
    inlineStyle.color = 'var(--bg-primary)';
  }
  if (variant === 'danger') {
    inlineStyle.backgroundColor = 'var(--warning)';
    inlineStyle.color = '#FFFFFF';
  }
  if (variant === 'success') {
    inlineStyle.backgroundColor = 'var(--success)';
    inlineStyle.color = '#FFFFFF';
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-12 px-6 text-sm',
    lg: 'h-16 px-8 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      style={inlineStyle}
      {...props}
    >
      {children}
    </button>
  );
};

export function Card({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-surface border border-text-muted/10 shadow-xl rounded-none ${className}`} {...props}>
      {children}
    </div>
  );
}
