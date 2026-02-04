import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = ({ label, style, ...props }: InputProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {label && (
                <label style={{
                    fontSize: '13px',
                    color: '#888',
                    fontWeight: 500,
                    marginLeft: '4px'
                }}>
                    {label}
                </label>
            )}
            <input
                {...props}
                style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--foreground)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    width: '100%',
                    ...style
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
        </div>
    );
};
