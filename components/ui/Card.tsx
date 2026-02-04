import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Card = ({ children, className, ...props }: CardProps) => {
    return (
        <div
            {...props}
            style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '24px',
                backdropFilter: 'blur(10px)',
                ...props.style
            }}
            className={className}
        >
            {children}
        </div>
    );
};
