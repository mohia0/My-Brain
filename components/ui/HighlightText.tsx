"use client";

import React from 'react';

interface HighlightTextProps {
    text: string;
    query: string;
}

export const HighlightText = ({ text, query }: HighlightTextProps) => {
    if (!query || !query.trim() || !text) return <>{text}</>;

    const tokens = query.trim().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return <>{text}</>;

    // Escape tokens for regex
    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = `(${escapedTokens.join('|')})`;
    const regex = new RegExp(pattern, 'gi');

    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span
                        key={i}
                        style={{
                            backgroundColor: 'rgba(110, 86, 207, 0.12)',
                            color: '#6e56cf',
                            padding: '0 2px',
                            borderRadius: '3px',
                            fontWeight: '600'
                        }}
                    >
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
};
