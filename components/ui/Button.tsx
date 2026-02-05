import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive';
}

export const Button = ({ children, variant = 'primary', style, ...props }: ButtonProps) => {
    const baseStyles: React.CSSProperties = {
        padding: '10px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        outline: 'none',
    };

    const variants = {
        primary: {
            background: 'var(--accent)',
            color: 'white',
            boxShadow: '0 0 15px var(--accent-glow)',
        },
        secondary: {
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--foreground)',
            border: '1px solid var(--card-border)',
        },
        destructive: {
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
        }
    };

    return (
        <button
            {...props}
            style={{
                ...baseStyles,
                ...variants[variant],
                ...style
            }}
            onMouseOver={(e) => {
                if (variant === 'primary') e.currentTarget.style.transform = 'translateY(-1px)';
                else e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseOut={(e) => {
                if (variant === 'primary') e.currentTarget.style.transform = 'translateY(0)';
                else e.currentTarget.style.background = variants[variant].background as string;
            }}
        >
            {children}
        </button>
    );
};
