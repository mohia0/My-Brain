import { create } from 'zustand';
import { Item, Folder } from '@/types';
import { supabase } from '@/lib/supabase';

type PositionUpdate = { id: string, type: 'item' | 'folder', x: number, y: number, prevX: number, prevY: number };

type HistoryAction =
    | { type: 'MOVE', updates: PositionUpdate[] }
    | { type: 'ADD_ITEM', item: Item }
    | { type: 'DELETE_ITEM', item: Item }
    | { type: 'ADD_FOLDER', folder: Folder }
    | { type: 'DELETE_FOLDER', folder: Folder };

// Helper to check for collision between two rects
const isOverlapping = (r1: { x: number, y: number, w: number, h: number }, r2: { x: number, y: number, w: number, h: number }) => {
    return !(r1.x + r1.w <= r2.x ||
        r1.x >= r2.x + r2.w ||
        r1.y + r1.h <= r2.y ||
        r1.y >= r2.y + r2.h);
};

// Internal helper for non-overlapping placement
const getSafePosition = (
    id: string,
    targetX: number,
    targetY: number,
    width: number,
    height: number,
    items: Item[],
    folders: Folder[]
) => {
    let x = targetX;
    let y = targetY;
    let attempts = 0;
    const maxAttempts = 50; // Safety break

    const obstacles = [
        ...items.filter(i => i.id !== id && i.status !== 'inbox' && !i.folder_id).map(i => ({ x: i.position_x, y: i.position_y, w: 280, h: 120 })),
        ...folders.filter(f => f.id !== id && !f.parent_id).map(f => ({ x: f.position_x, y: f.position_y, w: 280, h: 120 }))
    ];

    while (attempts < maxAttempts) {
        const collision = obstacles.find(obs => isOverlapping({ x, y, w: width, h: height }, obs));
        if (!collision) return { x, y };

        // If collision, move slightly down and to the right, or to the next grid slot
        // Let's try moving down by height + gap for a clean "push"
        y += 20; // Small increment for natural feel
        if (attempts > 0 && attempts % 5 === 0) {
            x += 20;
            y = targetY; // Reset Y slightly to explore horizontally
        }
        attempts++;
    }

    return { x, y };
};

interface ItemsState {
    items: Item[];
    folders: Folder[];
    setItems: (items: Item[]) => void;
    fetchData: (user?: any) => Promise<void>;

    addItem: (item: Item) => void;
    updateItemPosition: (id: string, x: number, y: number) => void;
    updateItemContent: (id: string, updates: Partial<Item>) => void;
    duplicateItem: (id: string) => void;
    removeItem: (id: string) => void;

    // Folders
    addFolder: (folder: Folder) => void;
    updateFolderPosition: (id: string, x: number, y: number) => void;
    updateFolderContent: (id: string, updates: Partial<Folder>) => void;
    removeFolder: (id: string) => void;

    // Archive
    archiveItem: (id: string) => void;
    unarchiveItem: (id: string) => void;
    archiveFolder: (id: string) => void;
    unarchiveFolder: (id: string) => void;
    archiveSelected: () => void;
    isArchiveOpen: boolean;
    setArchiveOpen: (open: boolean) => void;

    // Batch & History
    updatePositions: (updates: { id: string, type: 'item' | 'folder', x: number, y: number }[]) => void;
    history: { past: HistoryAction[], future: HistoryAction[] };
    undo: () => void;
    redo: () => void;

    // Selection
    selectedIds: string[];
    selectItem: (id: string) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    setSelection: (ids: string[]) => void;
    layoutSelectedItems: () => void;
    layoutAllItems: () => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    subscribeToChanges: () => () => void;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
    items: [],
    folders: [],
    history: { past: [], future: [] },
    loading: false,

    setLoading: (loading) => set({ loading }),

    setItems: (items) => set({ items }),

    fetchData: async (user?: any) => {
        set({ loading: true });
        try {
            let targetUser = user;
            if (!targetUser) {
                const { data: { session } } = await supabase.auth.getSession();
                targetUser = session?.user;
            }

            if (!targetUser) {
                set({ loading: false });
                return;
            }

            // Parallel fetch for speed
            const [itemsRes, foldersRes] = await Promise.all([
                supabase.from('items').select('*'),
                supabase.from('folders').select('*')
            ]);

            if (itemsRes.data) set({ items: itemsRes.data as Item[] });
            if (foldersRes.data) set({ folders: foldersRes.data as Folder[] });
        } finally {
            set({ loading: false });
        }
    },

    addItem: async (item) => {
        const state = get();
        const safePos = getSafePosition(item.id, item.position_x, item.position_y, 280, 120, state.items, state.folders);
        const safeItem = { ...item, position_x: safePos.x, position_y: safePos.y };

        set((state) => ({
            items: [...state.items, safeItem],
            history: {
                past: [...state.history.past, { type: 'ADD_ITEM', item: safeItem }],
                future: []
            }
        }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('items').insert([{ ...safeItem, user_id: user.id }]);
        }
    },

    updateItemPosition: async (id, x, y) => {
        // Legacy single update - wrapping it in batch logic for consistency if needed, 
        // but for now keeping it simple. Ideally drag uses updatePositions.
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const update: PositionUpdate = {
            id, type: 'item', x, y, prevX: item.position_x, prevY: item.position_y
        };

        set((state) => ({
            items: state.items.map((i) => i.id === id ? { ...i, position_x: x, position_y: y } : i),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: [update] }],
                future: []
            }
        }));
        await supabase.from('items').update({ position_x: x, position_y: y }).eq('id', id);
    },

    updatePositions: async (updates) => {
        const state = get();
        const historyUpdates: PositionUpdate[] = [];

        // Move items as a unit - preserve relative structure by skipping individual collision resolution
        const processedUpdates = updates;

        processedUpdates.forEach(u => {
            if (u.type === 'item') {
                const item = state.items.find(i => i.id === u.id);
                if (item) historyUpdates.push({ ...u, prevX: item.position_x, prevY: item.position_y });
            } else {
                const folder = state.folders.find(f => f.id === u.id);
                if (folder) historyUpdates.push({ ...u, prevX: folder.position_x, prevY: folder.position_y });
            }
        });

        if (historyUpdates.length === 0) return;

        set((state) => ({
            items: state.items.map(item => {
                const u = processedUpdates.find(up => up.id === item.id && up.type === 'item');
                return u ? { ...item, position_x: u.x, position_y: u.y } : item;
            }),
            folders: state.folders.map(folder => {
                const u = processedUpdates.find(up => up.id === folder.id && up.type === 'folder');
                return u ? { ...folder, position_x: u.x, position_y: u.y } : folder;
            }),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: historyUpdates }],
                future: []
            }
        }));

        processedUpdates.forEach(u => {
            if (u.type === 'item') {
                supabase.from('items').update({ position_x: u.x, position_y: u.y }).eq('id', u.id).then();
            } else {
                supabase.from('folders').update({ position_x: u.x, position_y: u.y }).eq('id', u.id).then();
            }
        });
    },

    undo: async () => {
        const state = get();
        if (state.history.past.length === 0) return;

        const action = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);

        switch (action.type) {
            case 'MOVE':
                set(s => ({
                    items: s.items.map(i => {
                        const u = action.updates.find(up => up.id === i.id && up.type === 'item');
                        return u ? { ...i, position_x: u.prevX, position_y: u.prevY } : i;
                    }),
                    folders: s.folders.map(f => {
                        const u = action.updates.find(up => up.id === f.id && up.type === 'folder');
                        return u ? { ...f, position_x: u.prevX, position_y: u.prevY } : f;
                    }),
                    history: { past: newPast, future: [action, ...s.history.future] }
                }));
                action.updates.forEach(u => {
                    if (u.type === 'item') supabase.from('items').update({ position_x: u.prevX, position_y: u.prevY }).eq('id', u.id).then();
                    else supabase.from('folders').update({ position_x: u.prevX, position_y: u.prevY }).eq('id', u.id).then();
                });
                break;
            case 'ADD_ITEM':
                set(s => ({
                    items: s.items.filter(i => i.id !== action.item.id),
                    history: { past: newPast, future: [action, ...s.history.future] }
                }));
                supabase.from('items').delete().eq('id', action.item.id).then();
                break;
            case 'DELETE_ITEM':
                set(s => ({
                    items: [...s.items, action.item],
                    history: { past: newPast, future: [action, ...s.history.future] }
                }));
                supabase.from('items').insert([action.item]).then();
                break;
            // Folders cases would be similar
        }
    },

    redo: async () => {
        const state = get();
        if (state.history.future.length === 0) return;

        const action = state.history.future[0];
        const newFuture = state.history.future.slice(1);

        switch (action.type) {
            case 'MOVE':
                set(s => ({
                    items: s.items.map(i => {
                        const u = action.updates.find(up => up.id === i.id && up.type === 'item');
                        return u ? { ...i, position_x: u.x, position_y: u.y } : i;
                    }),
                    folders: s.folders.map(f => {
                        const u = action.updates.find(up => up.id === f.id && up.type === 'folder');
                        return u ? { ...f, position_x: u.x, position_y: u.y } : f;
                    }),
                    history: { past: [...s.history.past, action], future: newFuture }
                }));
                action.updates.forEach(u => {
                    if (u.type === 'item') supabase.from('items').update({ position_x: u.x, position_y: u.y }).eq('id', u.id).then();
                    else supabase.from('folders').update({ position_x: u.x, position_y: u.y }).eq('id', u.id).then();
                });
                break;
            case 'ADD_ITEM':
                set(s => ({
                    items: [...s.items, action.item],
                    history: { past: [...s.history.past, action], future: newFuture }
                }));
                supabase.from('items').insert([action.item]).then();
                break;
            case 'DELETE_ITEM':
                set(s => ({
                    items: s.items.filter(i => i.id !== action.item.id),
                    history: { past: [...s.history.past, action], future: newFuture }
                }));
                supabase.from('items').delete().eq('id', action.item.id).then();
                break;
        }
    },

    updateItemContent: async (id, updates) => {
        const state = get();
        let finalUpdates = { ...updates };

        // If movement is involved (e.g. from Inbox), resolve collisions
        if (updates.position_x !== undefined || updates.position_y !== undefined) {
            const item = state.items.find(i => i.id === id);
            if (item) {
                const targetX = updates.position_x ?? item.position_x;
                const targetY = updates.position_y ?? item.position_y;
                const safe = getSafePosition(id, targetX, targetY, 280, 120, state.items, state.folders);
                finalUpdates.position_x = safe.x;
                finalUpdates.position_y = safe.y;
            }
        }

        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, ...finalUpdates } : item
            )
        }));
        await supabase.from('items').update(finalUpdates).eq('id', id);
    },

    duplicateItem: async (id) => {
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newItemId = crypto.randomUUID();
        const safePos = getSafePosition(newItemId, item.position_x + 30, item.position_y + 30, 280, 120, state.items, state.folders);

        const newItem = {
            ...item,
            id: newItemId,
            user_id: user.id,
            position_x: safePos.x,
            position_y: safePos.y,
            metadata: { ...item.metadata, title: `${item.metadata?.title || 'Untitled'} (Copy)` },
            created_at: new Date().toISOString()
        };

        set({
            items: [...state.items, newItem],
            history: {
                past: [...state.history.past, { type: 'ADD_ITEM', item: newItem }],
                future: []
            }
        });
        await supabase.from('items').insert([newItem]);
    },

    removeItem: async (id) => {
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        set((state) => ({
            items: state.items.filter(i => i.id !== id),
            history: {
                past: [...state.history.past, { type: 'DELETE_ITEM', item }],
                future: []
            }
        }));
        await supabase.from('items').delete().eq('id', id);
    },

    // Folders
    addFolder: async (folder) => {
        set((state) => ({
            folders: [...state.folders, folder],
            history: {
                past: [...state.history.past, { type: 'ADD_FOLDER', folder }],
                future: []
            }
        }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('folders').insert([{ ...folder, user_id: user.id }]);
        }
    },

    updateFolderPosition: async (id, x, y) => {
        const state = get();
        const folder = state.folders.find(f => f.id === id);
        if (!folder) return;

        const update: PositionUpdate = {
            id, type: 'folder', x, y, prevX: folder.position_x, prevY: folder.position_y
        };

        set((state) => ({
            folders: state.folders.map((f) =>
                f.id === id ? { ...f, position_x: x, position_y: y } : f
            ),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: [update] }],
                future: []
            }
        }));
        await supabase.from('folders').update({ position_x: x, position_y: y }).eq('id', id);
    },

    updateFolderContent: async (id, updates) => {
        set((state) => ({
            folders: state.folders.map((f) =>
                f.id === id ? { ...f, ...updates } : f
            )
        }));
        await supabase.from('folders').update(updates).eq('id', id);
    },

    removeFolder: async (id) => {
        const state = get();
        const folder = state.folders.find(f => f.id === id);
        if (!folder) return;

        set((state) => ({
            folders: state.folders.filter(f => f.id !== id),
            history: {
                past: [...state.history.past, { type: 'DELETE_FOLDER', folder }],
                future: []
            }
        }));
        await supabase.from('folders').delete().eq('id', id);
    },

    // Archive Logic
    isArchiveOpen: false,
    setArchiveOpen: (open) => set({ isArchiveOpen: open }),

    archiveItem: async (id) => {
        await get().updateItemContent(id, { status: 'archived' });
    },

    unarchiveItem: async (id) => {
        await get().updateItemContent(id, { status: 'active' });
    },

    archiveFolder: async (id) => {
        // When archiving a folder, we might want to archive its contents too?
        // For now, just archive the folder itself.
        await get().updateFolderContent(id, { status: 'archived' });
    },

    unarchiveFolder: async (id) => {
        await get().updateFolderContent(id, { status: 'active' });
    },

    archiveSelected: async () => {
        const { selectedIds, items, folders, updateItemContent, updateFolderContent, clearSelection } = get();

        const itemIds = items.filter(i => selectedIds.includes(i.id)).map(i => i.id);
        const folderIds = folders.filter(f => selectedIds.includes(f.id)).map(f => f.id);

        // Batch update in store
        set(state => ({
            items: state.items.map(i => itemIds.includes(i.id) ? { ...i, status: 'archived' } : i),
            folders: state.folders.map(f => folderIds.includes(f.id) ? { ...f, status: 'archived' } : f)
        }));

        // DB updates
        if (itemIds.length > 0) {
            await supabase.from('items').update({ status: 'archived' }).in('id', itemIds);
        }
        if (folderIds.length > 0) {
            await supabase.from('folders').update({ status: 'archived' }).in('id', folderIds);
        }

        clearSelection();
    },

    // Selection (Local Only)
    selectedIds: [],
    selectItem: (id) => set({ selectedIds: [id] }),
    toggleSelection: (id) => set((state) => ({
        selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter(sid => sid !== id)
            : [...state.selectedIds, id]
    })),
    clearSelection: () => set({ selectedIds: [] }),
    setSelection: (ids) => set({ selectedIds: ids }),
    layoutSelectedItems: () => set((state) => {
        const selectedItems = state.items.filter(i => state.selectedIds.includes(i.id));
        const selectedFolders = state.folders.filter(f => state.selectedIds.includes(f.id));

        if (selectedItems.length === 0 && selectedFolders.length === 0) return state;

        // Combine and add temporary type identifier
        const allElements = [
            ...selectedItems.map(i => ({ ...i, entityType: 'item' })),
            ...selectedFolders.map(f => ({ ...f, entityType: 'folder' }))
        ];

        // Sort by position to maintain relative order (Top-Left to Bottom-Right)
        allElements.sort((a, b) => {
            const rowDiff = Math.abs(a.position_y - b.position_y);
            if (rowDiff > 50) return a.position_y - b.position_y;
            return a.position_x - b.position_x;
        });

        const startX = Math.min(...allElements.map(e => e.position_x));
        const startY = Math.min(...allElements.map(e => e.position_y));

        // Determine layout based on content types
        const colWidth = 280;
        const gap = 32;
        const effectiveColWidth = colWidth + gap;

        // Calculate optimal columns
        const cols = Math.max(2, Math.ceil(Math.sqrt(allElements.length)));
        const colHeights = new Array(cols).fill(startY);

        const newItemPositions = new Map();
        const newFolderPositions = new Map();
        const itemsToUpdate: any[] = [];
        const foldersToUpdate: any[] = [];
        const historyUpdates: PositionUpdate[] = [];

        allElements.forEach(el => {
            // Find shortest column (Masonry)
            let colIndex = 0;
            let minY = colHeights[0];
            for (let i = 1; i < cols; i++) {
                if (colHeights[i] < minY) {
                    minY = colHeights[i];
                    colIndex = i;
                }
            }

            // Determine height
            let height = 130; // Default card height
            if (el.entityType === 'folder') {
                height = 120; // Folder fixed height from CSS (matches cards)
            } else {
                const item = el as any;
                if (item.type === 'link') {
                    if (item.metadata?.image) height = 100; // Capture Card
                    else height = 40; // Link Card
                } else if (item.type === 'image') {
                    height = 200;
                } else {
                    height = 120; // Text Card min-height from CSS
                }
            }

            // Space for date + small extra buffer
            height += 28;

            const x = startX + (colIndex * effectiveColWidth);
            const y = minY;

            colHeights[colIndex] = y + height + gap;

            if (el.entityType === 'item') {
                newItemPositions.set(el.id, { x, y });
                itemsToUpdate.push({ id: el.id, position_x: x, position_y: y });
                historyUpdates.push({ id: el.id, type: 'item', x, y, prevX: el.position_x, prevY: el.position_y });
            } else {
                newFolderPositions.set(el.id, { x, y });
                foldersToUpdate.push({ id: el.id, position_x: x, position_y: y });
                historyUpdates.push({ id: el.id, type: 'folder', x, y, prevX: el.position_x, prevY: el.position_y });
            }
        });

        // Batch update in BG
        itemsToUpdate.forEach(u => supabase.from('items').update({ position_x: u.position_x, position_y: u.position_y }).eq('id', u.id).then());
        foldersToUpdate.forEach(u => supabase.from('folders').update({ position_x: u.position_x, position_y: u.position_y }).eq('id', u.id).then());

        const newItems = state.items.map(item => {
            const pos = newItemPositions.get(item.id);
            return pos ? { ...item, position_x: pos.x, position_y: pos.y } : item;
        });

        const newFolders = state.folders.map(folder => {
            const pos = newFolderPositions.get(folder.id);
            return pos ? { ...folder, position_x: pos.x, position_y: pos.y } : folder;
        });

        return {
            items: newItems,
            folders: newFolders,
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: historyUpdates }],
                future: []
            }
        };
    }),
    layoutAllItems: () => set((state) => {
        // Find items and folders that are on the canvas (root level)
        const canvasItems = state.items.filter(i => !i.folder_id && i.status !== 'inbox');
        const canvasFolders = state.folders.filter(f => !f.parent_id);

        if (canvasItems.length === 0 && canvasFolders.length === 0) return state;

        // Combine and add temporary type identifier
        const allElements = [
            ...canvasItems.map(i => ({ ...i, entityType: 'item' })),
            ...canvasFolders.map(f => ({ ...f, entityType: 'folder' }))
        ];

        // Sort by position (Top-Left to Bottom-Right)
        allElements.sort((a, b) => {
            const rowDiff = Math.abs(a.position_y - b.position_y);
            if (rowDiff > 50) return a.position_y - b.position_y;
            return a.position_x - b.position_x;
        });

        const startX = Math.min(...allElements.map(e => e.position_x));
        const startY = Math.min(...allElements.map(e => e.position_y));

        // Determine layout settings
        const colWidth = 280;
        const gap = 32;
        const effectiveColWidth = colWidth + gap;

        // Calculate optimal columns
        const cols = Math.max(2, Math.ceil(Math.sqrt(allElements.length)));
        const colHeights = new Array(cols).fill(startY);

        const newItemPositions = new Map();
        const newFolderPositions = new Map();
        const itemsToUpdate: any[] = [];
        const foldersToUpdate: any[] = [];
        const historyUpdates: PositionUpdate[] = [];

        allElements.forEach(el => {
            // Find shortest column (Masonry)
            let colIndex = 0;
            let minY = colHeights[0];
            for (let i = 1; i < cols; i++) {
                if (colHeights[i] < minY) {
                    minY = colHeights[i];
                    colIndex = i;
                }
            }

            // Determine height
            let height = 130;
            if (el.entityType === 'folder') {
                height = 120;
            } else {
                const item = el as any;
                if (item.type === 'link') {
                    if (item.metadata?.image) height = 100;
                    else height = 40;
                } else if (item.type === 'image') {
                    height = 200;
                } else {
                    height = 120;
                }
            }

            height += 28;

            const x = startX + (colIndex * effectiveColWidth);
            const y = minY;

            colHeights[colIndex] = y + height + gap;

            if (el.entityType === 'item') {
                newItemPositions.set(el.id, { x, y });
                itemsToUpdate.push({ id: el.id, position_x: x, position_y: y });
                historyUpdates.push({ id: el.id, type: 'item', x, y, prevX: el.position_x, prevY: el.position_y });
            } else {
                newFolderPositions.set(el.id, { x, y });
                foldersToUpdate.push({ id: el.id, position_x: x, position_y: y });
                historyUpdates.push({ id: el.id, type: 'folder', x, y, prevX: el.position_x, prevY: el.position_y });
            }
        });

        // Batch Update
        itemsToUpdate.forEach(u => supabase.from('items').update({ position_x: u.position_x, position_y: u.position_y }).eq('id', u.id).then());
        foldersToUpdate.forEach(u => supabase.from('folders').update({ position_x: u.position_x, position_y: u.position_y }).eq('id', u.id).then());

        return {
            items: state.items.map(i => {
                const pos = newItemPositions.get(i.id);
                return pos ? { ...i, position_x: pos.x, position_y: pos.y } : i;
            }),
            folders: state.folders.map(f => {
                const pos = newFolderPositions.get(f.id);
                return pos ? { ...f, position_x: pos.x, position_y: pos.y } : f;
            }),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: historyUpdates }],
                future: []
            }
        };
    }),

    subscribeToChanges: () => {
        const channels = [
            supabase.channel('items-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        set(state => {
                            if (state.items.find(i => i.id === payload.new.id)) return state;
                            return { items: [...state.items, payload.new as Item] };
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        set(state => ({
                            items: state.items.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i)
                        }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => ({ items: state.items.filter(i => i.id !== payload.old.id) }));
                    }
                })
                .subscribe(),

            supabase.channel('folders-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        set(state => {
                            if (state.folders.find(f => f.id === payload.new.id)) return state;
                            return { folders: [...state.folders, payload.new as Folder] };
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        set(state => ({
                            folders: state.folders.map(f => f.id === payload.new.id ? { ...f, ...payload.new } : f)
                        }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => ({ folders: state.folders.filter(f => f.id !== payload.old.id) }));
                    }
                })
                .subscribe()
        ];

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }
}));
