import { create } from 'zustand';

interface CanvasState {
    scale: number;
    position: { x: number; y: number };
    setScale: (scale: number) => void;
    setPosition: (x: number, y: number) => void;
    restoreView: (scale: number, position: { x: number, y: number }) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    zoomAt: (newScale: number, point: { x: number, y: number }) => void;
    currentTool: 'mouse' | 'hand' | 'area';
    setTool: (tool: 'mouse' | 'hand' | 'area') => void;
    openFolderId: string | null;
    setOpenFolderId: (id: string | null) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    scale: 0.65,
    position: { x: 0, y: 0 },
    setScale: (scale) => set({ scale }),
    setPosition: (x, y) => set({ position: { x, y } }),
    restoreView: (scale, position) => set({ scale, position }),
    zoomIn: () => set((state) => ({ scale: Math.min(state.scale * 1.1, 1.3) })),
    zoomOut: () => set((state) => ({ scale: Math.max(state.scale * 0.9, 0.1) })),
    zoomAt: (newScale: number, point: { x: number, y: number }) => set((state) => {
        const safeScale = Math.min(Math.max(newScale, 0.1), 1.3);
        const scaleChange = safeScale / state.scale;
        const newX = point.x - (point.x - state.position.x) * scaleChange;
        const newY = point.y - (point.y - state.position.y) * scaleChange;
        return { scale: safeScale, position: { x: newX, y: newY } };
    }),
    currentTool: 'mouse',
    setTool: (tool: 'mouse' | 'hand' | 'area') => set({ currentTool: tool }),
    openFolderId: null,
    setOpenFolderId: (id) => set({ openFolderId: id }),
}));
