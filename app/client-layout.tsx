"use client";

import React, { useEffect } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Prevent default context menu globally
        const handleContextMenu = (e: MouseEvent) => {
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
