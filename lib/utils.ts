/**
 * Generates a unique ID (UUID v4) safely.
 * Falls back to a custom implementation if crypto.randomUUID is not available.
 */
export function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback for older browsers or insecure contexts
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

import { Capacitor } from '@capacitor/core';

export function getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Helper to detect if running in Capacitor Native environment
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    if (isNative) {
        let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://app.brainia.space';
        
        // If the baseUrl is a local IP and we are in a production build, 
        // it might be a mistake from .env.local. Fallback to production if needed.
        if (baseUrl.includes('192.168.') || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            // Only fallback if we are not explicitly trying to debug local
            console.warn(`[API] Local IP ${baseUrl} detected in native app. If fetch fails, check connectivity.`);
        }
        
        return `${baseUrl}${cleanEndpoint}`;
    }

    return cleanEndpoint;
}

/**
 * Extracts plain text from a content string that might be JSON-formatted (BlockNote).
 */
export function getPlainText(content: string): string {
    if (!content) return '';
    if (!content.trim().startsWith('[') && !content.trim().startsWith('{')) {
        return content;
    }

    try {
        const parsed = JSON.parse(content);

        // Handle BlockNote array format
        if (Array.isArray(parsed)) {
            const extractText = (blocks: any[]): string => {
                return blocks.map(block => {
                    let text = '';
                    if (block.content) {
                        if (Array.isArray(block.content)) {
                            text = block.content.map((c: any) => c.text || '').join('');
                        } else if (typeof block.content === 'string') {
                            text = block.content;
                        }
                    }
                    if (block.children && Array.isArray(block.children)) {
                        text += ' ' + extractText(block.children);
                    }
                    return text;
                }).join(' ').trim();
            };
            return extractText(parsed);
        }

        // Handle single block or other JSON formats
        if (typeof parsed === 'object' && parsed !== null) {
            return parsed.text || parsed.content || content;
        }

        return content;
    } catch (e) {
        return content;
    }
}
