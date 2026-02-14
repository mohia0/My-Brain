"use client";

import React, { useEffect } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Prevent default context menu globally
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, []);

    return <>{children}</>;
}
