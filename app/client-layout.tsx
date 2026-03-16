"use client";

import React, { useEffect } from "react";
import { useReminders } from "@/lib/hooks/useReminders";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useReminders();

    useEffect(() => {
        // Prevent default context menu globally except for text inputs
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return; // Allow default context menu
            }
            e.preventDefault();
        };

        // Prevent browser zoom (Ctrl+Scroll)
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        };

        // Prevent browser zoom (Ctrl++, Ctrl+-, Ctrl+0)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey || e.metaKey) &&
                (e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+')
            ) {
                e.preventDefault();
            }
        };

        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("wheel", handleWheel, { passive: false });
        document.addEventListener("keydown", handleKeyDown, { passive: false });

        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("wheel", handleWheel);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return <>{children}</>;
}
