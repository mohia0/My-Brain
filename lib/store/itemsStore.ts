import { create } from 'zustand';
import { Item, Folder } from '@/types';
import { supabase } from '@/lib/supabase';

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
        set((state) => ({ items: [...state.items, item] }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('items').insert([{ ...item, user_id: user.id }]);
        }
    },

    updateItemPosition: async (id, x, y) => {
        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, position_x: x, position_y: y } : item
            ),
        }));
        // Debounce or fire-and-forget
        await supabase.from('items').update({ position_x: x, position_y: y }).eq('id', id);
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

        set({ items: [...state.items, newItem] });
        await supabase.from('items').insert([newItem]);
    },

    removeItem: async (id) => {
        set((state) => ({
            items: state.items.filter(i => i.id !== id)
        }));
        await supabase.from('items').delete().eq('id', id);
    },

    // Folders
    addFolder: async (folder) => {
        set((state) => ({ folders: [...state.folders, folder] }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('folders').insert([{ ...folder, user_id: user.id }]);
        }
    },

    updateFolderPosition: async (id, x, y) => {
        set((state) => ({
            folders: state.folders.map((f) =>
                f.id === id ? { ...f, position_x: x, position_y: y } : f
            ),
        }));
        await supabase.from('folders').update({ position_x: x, position_y: y }).eq('id', id);
    },

    removeFolder: async (id) => {
        set((state) => ({
            folders: state.folders.filter(f => f.id !== id)
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

        const startX = Math.min(...selectedItems.map(i => i.position_x));
        const startY = Math.min(...selectedItems.map(i => i.position_y));
        const cols = Math.ceil(Math.sqrt(selectedItems.length));
        const itemWidth = 280;
        const itemHeight = 200;

        const updates: any[] = [];
        const newItems = state.items.map(item => {
            if (!state.selectedIds.includes(item.id)) return item;
            const index = selectedItems.findIndex(i => i.id === item.id);
            const col = index % cols;
            const row = Math.floor(index / cols);
            const newItem = {
                ...item,
                position_x: startX + (col * itemWidth),
                position_y: startY + (row * itemHeight)
            };
            updates.push(newItem);
            return newItem;
        });

        // Batch update in BG
        updates.forEach(item => {
            supabase.from('items').update({ position_x: item.position_x, position_y: item.position_y }).eq('id', item.id).then();
        });

        return { items: newItems };
    }),
    layoutAllItems: () => set((state) => {
        // ... (keep existing layout logic)
        // Find items and folders that are on the canvas (root level)
        const canvasItems = state.items.filter(i => !i.folder_id && i.status !== 'inbox');
        const canvasFolders = state.folders;

        if (canvasItems.length === 0 && canvasFolders.length === 0) return state;

        const allElements = [
            ...canvasItems.map(i => ({ type: 'item', id: i.id, x: i.position_x, y: i.position_y })),
            ...canvasFolders.map(f => ({ type: 'folder', id: f.id, x: f.position_x, y: f.position_y }))
        ];

        // Start grid at top-left of current bounds
        const startX = Math.min(...allElements.map(e => e.x));
        const startY = Math.min(...allElements.map(e => e.y));
        const cols = Math.ceil(Math.sqrt(allElements.length));
        const itemWidth = 280;
        const itemHeight = 200;

        const itemsToUpdate: any[] = [];
        const foldersToUpdate: any[] = [];

        const newItemPositions = new Map();
        const newFolderPositions = new Map();

        allElements.forEach((el, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + (col * itemWidth);
            const y = startY + (row * itemHeight);

            if (el.type === 'item') {
                newItemPositions.set(el.id, { x, y });
                itemsToUpdate.push({ id: el.id, x, y });
            } else {
                newFolderPositions.set(el.id, { x, y });
                foldersToUpdate.push({ id: el.id, x, y });
            }
        });

        // Batch Update
        itemsToUpdate.forEach(u => supabase.from('items').update({ position_x: u.x, position_y: u.y }).eq('id', u.id).then());
        foldersToUpdate.forEach(u => supabase.from('folders').update({ position_x: u.x, position_y: u.y }).eq('id', u.id).then());

        return {
            items: state.items.map(i => {
                const pos = newItemPositions.get(i.id);
                return pos ? { ...i, position_x: pos.x, position_y: pos.y } : i;
            }),
            folders: state.folders.map(f => {
                const pos = newFolderPositions.get(f.id);
                return pos ? { ...f, position_x: pos.x, position_y: pos.y } : f;
            })
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
