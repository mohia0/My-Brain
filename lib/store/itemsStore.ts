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

interface ItemsState {
    items: Item[];
    folders: Folder[];
    setItems: (items: Item[]) => void;
    fetchData: () => Promise<void>;

    addItem: (item: Item) => void;
    updateItemPosition: (id: string, x: number, y: number) => void;
    updateItemContent: (id: string, updates: Partial<Item>) => void;
    duplicateItem: (id: string) => void;
    removeItem: (id: string) => void;

    // Folders
    addFolder: (folder: Folder) => void;
    updateFolderPosition: (id: string, x: number, y: number) => void;
    removeFolder: (id: string) => void;

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
    subscribeToChanges: () => () => void;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
    items: [],
    folders: [],
    history: { past: [], future: [] },

    setItems: (items) => set({ items }),

    fetchData: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: items } = await supabase.from('items').select('*');
        const { data: folders } = await supabase.from('folders').select('*');

        if (items) set({ items: items as Item[] });
        if (folders) set({ folders: folders as Folder[] });
    },

    addItem: async (item) => {
        set((state) => ({
            items: [...state.items, item],
            history: {
                past: [...state.history.past, { type: 'ADD_ITEM', item }],
                future: []
            }
        }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('items').insert([{ ...item, user_id: user.id }]);
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

        updates.forEach(u => {
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
                const u = updates.find(up => up.id === item.id && up.type === 'item');
                return u ? { ...item, position_x: u.x, position_y: u.y } : item;
            }),
            folders: state.folders.map(folder => {
                const u = updates.find(up => up.id === folder.id && up.type === 'folder');
                return u ? { ...folder, position_x: u.x, position_y: u.y } : folder;
            }),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: historyUpdates }],
                future: []
            }
        }));

        // Batch Supabase Update
        // Note: Supabase doesn't have a simple batch update for different IDs in one go easily via JS client 
        // without RPC or upsert loop. We will loop for now as it's fire-and-forget.
        updates.forEach(u => {
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
        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, ...updates } : item
            )
        }));
        await supabase.from('items').update(updates).eq('id', id);
    },

    duplicateItem: async (id) => {
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newItem = {
            ...item,
            id: crypto.randomUUID(),
            user_id: user.id,
            position_x: item.position_x + 20,
            position_y: item.position_y + 20,
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
        if (selectedItems.length === 0) return state;

        // Sort by position to maintain relative order (Top-Left to Bottom-Right)
        selectedItems.sort((a, b) => {
            const rowDiff = Math.abs(a.position_y - b.position_y);
            if (rowDiff > 50) return a.position_y - b.position_y;
            return a.position_x - b.position_x;
        });

        const startX = Math.min(...selectedItems.map(i => i.position_x));
        const startY = Math.min(...selectedItems.map(i => i.position_y));

        // Determine layout based on content types
        const hasWideItems = selectedItems.some(i => i.type === 'link' && i.metadata?.image);
        const colWidth = hasWideItems ? 300 : 200;
        const gap = 40;
        const effectiveColWidth = colWidth + gap;

        // Calculate optimal columns
        const cols = Math.ceil(Math.sqrt(selectedItems.length));
        const colHeights = new Array(cols).fill(startY);

        const newPositions = new Map();
        const updates: any[] = [];
        const historyUpdates: PositionUpdate[] = [];

        selectedItems.forEach(item => {
            // Find shortest column (Masonry)
            let colIndex = 0;
            let minY = colHeights[0];
            for (let i = 1; i < cols; i++) {
                if (colHeights[i] < minY) {
                    minY = colHeights[i];
                    colIndex = i;
                }
            }

            // Determine height based on item type
            let height = 200; // Default approximation
            if (item.type === 'link') {
                if (item.metadata?.image) height = 100; // Capture Card
                else height = 40; // Link Card
            } else {
                height = 160;
            }

            const x = startX + (colIndex * effectiveColWidth);
            const y = minY;

            newPositions.set(item.id, { x, y });
            colHeights[colIndex] = y + height + gap;

            updates.push({ id: item.id, position_x: x, position_y: y });
            historyUpdates.push({ id: item.id, type: 'item', x, y, prevX: item.position_x, prevY: item.position_y });
        });

        // Batch update in BG
        updates.forEach(u => {
            supabase.from('items').update({ position_x: u.position_x, position_y: u.position_y }).eq('id', u.id).then();
        });

        const newItems = state.items.map(item => {
            const pos = newPositions.get(item.id);
            return pos ? { ...item, position_x: pos.x, position_y: pos.y } : item;
        });

        return {
            items: newItems,
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: historyUpdates }],
                future: []
            }
        };
    }),
    layoutAllItems: () => set((state) => {
        // Find items and folders that are on the canvas (root level)
        const canvasItems = state.items.filter(i => !i.folder_id && i.status !== 'inbox');
        const canvasFolders = state.folders;

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
        // Check for wide items (Capture Cards)
        const hasWideItems = allElements.some(e => e.entityType === 'item' && (e as any).type === 'link' && (e as any).metadata?.image);
        const colWidth = hasWideItems ? 300 : 200;
        const gap = 40;
        const effectiveColWidth = colWidth + gap;

        // Calculate optimal columns
        const cols = Math.ceil(Math.sqrt(allElements.length));
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
            let height = 160;
            if (el.entityType === 'folder') {
                height = 148; // Folder fixed height
            } else {
                const item = el as any;
                if (item.type === 'link') {
                    if (item.metadata?.image) height = 100; // Capture Card
                    else height = 40; // Link Card
                } else if (item.type === 'image') {
                    height = 200; // Standard image card height approx
                } else {
                    height = 120; // Text/Note min-height
                }
            }

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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
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
