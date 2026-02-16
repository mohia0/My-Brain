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
        return `https://www.brainia.space${cleanEndpoint}`;
    }

    return cleanEndpoint;
}
