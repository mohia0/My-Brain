import { create } from 'zustand';

interface CanvasState {
    scale: number;
    position: { x: number; y: number };
    setScale: (scale: number) => void;
    setPosition: (x: number, y: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
    scale: 1,
    position: { x: 0, y: 0 },
    setScale: (scale) => set({ scale }),
    setPosition: (x, y) => set({ position: { x, y } }),
    zoomIn: () => set((state) => ({ scale: Math.min(state.scale * 1.1, 5) })),
    zoomOut: () => set((state) => ({ scale: Math.max(state.scale * 0.9, 0.1) })),
}));
