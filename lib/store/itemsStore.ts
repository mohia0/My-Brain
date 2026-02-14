import { create } from 'zustand';
import { generateId } from '@/lib/utils';
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

const getItemDimensions = (item: Partial<Item> | Folder) => {
    const isFolder = 'name' in item;
    if (isFolder) return { w: 280, h: 120 };

    const type = item.type;
    const metadata = item.metadata || {};
    let h = 120; // Default

    if (metadata.width && metadata.height) {
        // Maintain aspect ratio relative to fixed 280px width
        const ratio = metadata.height / metadata.width;
        return { w: 280, h: Math.min(Math.max(280 * ratio, 60), 600) };
    }

    if (type === 'link') {
        h = metadata.image ? 100 : 40;
    } else if (type === 'video' || metadata.isVideo) {
        h = 220;
    } else if (type === 'image') {
        h = 280; // Estimated height for image cards
    } else if (type === 'text' && (item.content?.length || 0) > 200) {
        h = 180;
    }

    return { w: 280, h };
};

const getSafePosition = (
    id: string,
    targetX: number,
    targetY: number,
    itemOrFolder: Partial<Item> | Folder,
    items: Item[],
    folders: Folder[]
) => {
    const obstacleBuffer = 40; // Padding for "beside" feel
    const myDims = getItemDimensions(itemOrFolder);

    const obstacles = [
        ...items.filter(i => i.id !== id && i.status === 'active' && !i.folder_id).map(i => {
            const dims = getItemDimensions(i);
            return { x: i.position_x, y: i.position_y, w: dims.w, h: dims.h };
        }),
        ...folders.filter(f => f.id !== id && f.status === 'active' && !f.parent_id).map(f => ({ x: f.position_x, y: f.position_y, w: 280, h: 120 }))
    ];

    const isSpotFree = (tx: number, ty: number) => {
        return !obstacles.some(obs => isOverlapping(
            { x: tx - obstacleBuffer / 2, y: ty - obstacleBuffer / 2, w: myDims.w + obstacleBuffer, h: myDims.h + obstacleBuffer },
            obs
        ));
    };

    // 1. Try moving right (the "beside" preference)
    const stepX = 320;
    const stepY = 160;

    for (let i = 0; i < 15; i++) {
        const testX = targetX + (i * stepX);
        if (isSpotFree(testX, targetY)) return { x: testX, y: targetY };
    }

    // 2. Fallback to spiral search if horizontal is too crowded
    const maxRings = 10;
    for (let ring = 1; ring <= maxRings; ring++) {
        for (let ix = -ring; ix <= ring; ix++) {
            for (let iy = -ring; iy <= ring; iy++) {
                if (Math.abs(ix) !== ring && Math.abs(iy) !== ring) continue;
                const curX = targetX + ix * stepX;
                const curY = targetY + iy * stepY;
                if (isSpotFree(curX, curY)) return { x: curX, y: curY };
            }
        }
    }

    return { x: targetX, y: targetY };
};

interface ItemsState {
    // State
    items: Item[];
    folders: Folder[];
    currentRoomId: string | null;  // New
    setCurrentRoomId: (id: string | null) => void; // New

    setItems: (items: Item[]) => void;
    fetchData: (user?: any) => Promise<void>;

    addItem: (item: Item) => void;
    updateItemPosition: (id: string, x: number, y: number) => void;
    updateItemContent: (id: string, updates: Partial<Item>) => void;
    duplicateItem: (id: string) => void;
    duplicateFolder: (id: string) => void;
    duplicateSelected: () => void;
    moveSelectedToFolder: (targetFolderId: string | null) => void;
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

    toggleVaultItem: (id: string) => Promise<void>;
    toggleVaultFolder: (id: string) => Promise<void>;

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
    clearInbox: () => Promise<void>;
    layoutSelectedItems: () => void;
    layoutAllItems: () => void;
    loading: boolean;
    realtimeStatus: 'connected' | 'disconnected' | 'connecting';
    setLoading: (loading: boolean) => void;
    subscribeToChanges: () => () => void;
    refreshItem: (id: string) => Promise<void>;
    isLimitExceeded: boolean;
    setIsLimitExceeded: (val: boolean) => void;
    vaultedItemsRevealed: string[]; // IDs of items currently "peeked" with password
    revealVaulted: (id: string) => Promise<void>;
    reLockVaulted: (id: string) => void;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
    items: [],
    folders: [],
    currentRoomId: null,
    setCurrentRoomId: (id) => set({ currentRoomId: id }),
    history: { past: [], future: [] },
    loading: false,
    realtimeStatus: 'disconnected',

    setLoading: (loading) => set({ loading }),
    isLimitExceeded: false,
    setIsLimitExceeded: (val) => set({ isLimitExceeded: val }),
    vaultedItemsRevealed: [],

    revealVaulted: async (id: string) => {
        try {
            const { data, error } = await supabase.from('items').select('content').eq('id', id).single();
            if (data && !error) {
                set(state => ({
                    vaultedItemsRevealed: [...state.vaultedItemsRevealed, id],
                    items: state.items.map(i => i.id === id ? { ...i, content: data.content } : i)
                }));
            }
        } catch (e) {
            console.error('[Store] revealVaulted failed:', e);
        }
    },

    reLockVaulted: (id: string) => {
        set(state => ({
            vaultedItemsRevealed: state.vaultedItemsRevealed.filter(i => i !== id)
        }));
    },

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

            const currentRoomId = get().currentRoomId;
            const revealedItems = get().vaultedItemsRevealed;

            // Get persisted vault state from the OTHER store
            const vaultStore = (window as any).__VAULT_STORE__ || null;
            const persistedUnlockedIds = vaultStore?.getState()?.unlockedIds || [];
            const isVaultLockedGlobal = vaultStore?.getState()?.isVaultLocked ?? true;

            // Parallel fetch for speed
            // If in a room, only fetch items for that room.
            // If not, fetch items where room_id IS NULL or not set.
            let dbItemsReq = supabase.from('items').select('*');
            let dbFoldersReq = supabase.from('folders').select('*');

            if (currentRoomId) {
                // Fetch items for this room OR global items (inbox/archived)
                dbItemsReq = dbItemsReq.or(`room_id.eq.${currentRoomId},status.eq.inbox,status.eq.archived`);
                dbFoldersReq = dbFoldersReq.or(`room_id.eq.${currentRoomId},status.eq.archived`);
            } else {
                // Main canvas: items where room_id is NULL or global items
                dbItemsReq = dbItemsReq.or(`room_id.is.null,status.eq.inbox,status.eq.archived`);
                dbFoldersReq = dbFoldersReq.or(`room_id.is.null,status.eq.archived`);
            }

            const [itemsRes, foldersRes] = await Promise.all([dbItemsReq, dbFoldersReq]);

            if (itemsRes.data) {
                set(state => {
                    const localSyncing = state.items.filter(i => i.syncStatus === 'syncing');
                    const remoteItems = itemsRes.data as Item[];
                    const filteredRemote = remoteItems.filter(ri => !localSyncing.find(li => li.id === ri.id));
                    return { items: [...filteredRemote, ...localSyncing] };
                });
            }
            if (foldersRes.data) set({ folders: foldersRes.data as Folder[] });
        } catch (err: any) {
            // Silence AbortError as it's typically an intentional cancellation by the browser/Next.js
            if (err.name === 'AbortError') return;
            console.error('[ItemsStore] fetchData failed:', err);
        } finally {
            set({ loading: false });
        }
    },

    addItem: async (item) => {
        const state = get();
        const safePos = getSafePosition(item.id, item.position_x, item.position_y, item, state.items, state.folders);

        // Inject current room context
        const finalItem = {
            ...item,
            position_x: safePos.x,
            position_y: safePos.y,
            syncStatus: 'syncing' as const,
            room_id: state.currentRoomId || null, // Default to null if not in room
            is_vaulted: item.is_vaulted || false,
        };

        set((state) => ({
            items: [...state.items, finalItem],
            history: {
                past: [...state.history.past, { type: 'ADD_ITEM', item: finalItem }],
                future: []
            }
        }));

        // Use the ID provided in the item (e.g. from sharing) or fetch current user
        let finalUserId = finalItem.user_id;
        if (!finalUserId || finalUserId === 'unknown') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) finalUserId = user.id;
        }

        if (finalUserId) {
            const { syncStatus, ...dbItem } = finalItem;

            const { error } = await supabase.from('items').insert([{
                ...dbItem,
                user_id: finalUserId
            }]);

            if (error) {
                console.error('[Store] Supabase insert failed:', error);

                // Check for subscription limit error from PostgreSQL trigger (P0001 is RAISE EXCEPTION)
                if (error.message?.includes('limit exceeded') || error.code === 'P0001') {
                    set(state => ({
                        items: state.items.filter(i => i.id !== finalItem.id),
                        isLimitExceeded: true
                    }));
                } else {
                    set(state => ({
                        items: state.items.map(i => i.id === finalItem.id ? { ...i, syncStatus: 'error' } : i)
                    }));
                }
            } else {
                set(state => ({
                    items: state.items.map(i => i.id === finalItem.id ? { ...i, syncStatus: 'synced' } : i)
                }));
            }
        } else {
            console.error('[Store] Cannot persist item: user_id is missing');
            // Cleanup optimistic update if no user
            set(state => ({ items: state.items.filter(i => i.id !== finalItem.id) }));
        }
    },

    updateItemPosition: async (id, x, y) => {
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const update: PositionUpdate = {
            id, type: 'item', x, y, prevX: item.position_x, prevY: item.position_y
        };

        set((state) => ({
            items: state.items.map((i) => i.id === id ? { ...i, position_x: x, position_y: y, syncStatus: 'syncing' } : i),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: [update] }],
                future: []
            }
        }));
        const { error } = await supabase.from('items').update({ position_x: x, position_y: y }).eq('id', id);

        set(state => ({
            items: state.items.map(i => i.id === id ? { ...i, syncStatus: error ? 'error' : 'synced' } : i)
        }));
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
        // Add updated_at to track last edit
        let finalUpdates = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        // If movement is involved (e.g. from Inbox) or item becomes active, resolve collisions
        const item = state.items.find(i => i.id === id);
        if (item && (updates.position_x !== undefined || updates.position_y !== undefined || (updates.status === 'active' && item.status !== 'active'))) {
            const targetX = updates.position_x ?? item.position_x;
            const targetY = updates.position_y ?? item.position_y;
            const safe = getSafePosition(id, targetX, targetY, { ...item, ...updates }, state.items, state.folders);
            finalUpdates.position_x = safe.x;
            finalUpdates.position_y = safe.y;
        }

        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, ...finalUpdates, syncStatus: 'syncing' } : item
            )
        }));
        const { error } = await supabase.from('items').update(finalUpdates).eq('id', id);

        set(state => ({
            items: state.items.map(i => i.id === id ? { ...i, syncStatus: error ? 'error' : 'synced' } : i)
        }));
    },

    toggleVaultItem: async (id) => {
        const item = get().items.find(i => i.id === id);
        if (!item) return;
        await get().updateItemContent(id, { is_vaulted: !item.is_vaulted });
    },

    toggleVaultFolder: async (id) => {
        const folder = get().folders.find(f => f.id === id);
        if (!folder) return;
        await get().updateFolderContent(id, { is_vaulted: !folder.is_vaulted });
    },

    duplicateItem: async (id) => {
        const state = get();
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newItemId = generateId();
        const safePos = getSafePosition(newItemId, item.position_x + 30, item.position_y + 30, item, state.items, state.folders);

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
        const { error } = await supabase.from('items').insert([newItem]);

        if (error) {
            console.error('[Store] duplicateItem failed:', error);
            if (error.message?.includes('limit exceeded') || error.code === 'P0001') {
                set(state => ({
                    items: state.items.filter(i => i.id !== newItemId),
                    isLimitExceeded: true
                }));
            }
        }
    },

    duplicateFolder: async (id) => {
        const state = get();
        const folder = state.folders.find(f => f.id === id);
        if (!folder) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newId = generateId();
        const safePos = getSafePosition(newId, folder.position_x + 30, folder.position_y + 30, folder, state.items, state.folders);

        const folderToInsert = {
            ...folder,
            id: newId,
            user_id: user.id,
            position_x: safePos.x,
            position_y: safePos.y,
            name: `${folder.name} (Copy)`,
            created_at: new Date().toISOString()
        };

        const newFolder = { ...folderToInsert, syncStatus: 'syncing' as const };

        set({
            folders: [...state.folders, newFolder],
            history: {
                past: [...state.history.past, { type: 'ADD_FOLDER', folder: newFolder }],
                future: []
            }
        });
        const { error } = await supabase.from('folders').insert([folderToInsert]);

        if (error) {
            console.error('[Store] duplicateFolder failed:', error);
            if (error.message?.includes('limit exceeded') || error.code === 'P0001') {
                set(state => ({
                    folders: state.folders.filter(f => f.id !== newId),
                    isLimitExceeded: true
                }));
            } else {
                set(state => ({
                    folders: state.folders.map(f => f.id === newId ? { ...f, syncStatus: 'error' } : f)
                }));
            }
        } else {
            set(state => ({
                folders: state.folders.map(f => f.id === newId ? { ...f, syncStatus: 'synced' } : f)
            }));
        }
    },

    duplicateSelected: async () => {
        const { selectedIds, items, folders, duplicateItem, duplicateFolder, clearSelection } = get();
        for (const id of selectedIds) {
            if (items.some(i => i.id === id)) await duplicateItem(id);
            if (folders.some(f => f.id === id)) await duplicateFolder(id);
        }
        clearSelection();
    },

    moveSelectedToFolder: async (targetFolderId) => {
        const { selectedIds, items, folders, updateItemContent, updateFolderContent, clearSelection } = get();
        for (const id of selectedIds) {
            // Check if it's an item
            if (items.some(i => i.id === id)) {
                await updateItemContent(id, { folder_id: targetFolderId, status: 'active' });
            }
            // Check if it's a folder (and not moving into itself)
            else if (folders.some(f => f.id === id) && id !== targetFolderId) {
                await updateFolderContent(id, { parent_id: targetFolderId, status: 'active' });
            }
        }
        clearSelection();
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
        const state = get();
        const safePos = getSafePosition(folder.id, folder.position_x, folder.position_y, folder, state.items, state.folders);

        const safeFolder = {
            ...folder,
            position_x: safePos.x,
            position_y: safePos.y,
            syncStatus: 'syncing' as const,
            room_id: state.currentRoomId || null,
            is_vaulted: folder.is_vaulted || false,
        };

        set((state) => ({
            folders: [...state.folders, safeFolder],
            history: {
                past: [...state.history.past, { type: 'ADD_FOLDER', folder: safeFolder }],
                future: []
            }
        }));

        let finalUserId = safeFolder.user_id;
        if (!finalUserId || finalUserId === 'unknown') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) finalUserId = user.id;
        }

        if (finalUserId) {
            const { syncStatus, ...dbFolder } = safeFolder;

            // Explicitly ensure 'name' is present (fallback to title or default if missing)
            if (!('name' in dbFolder) && 'title' in (dbFolder as any)) {
                (dbFolder as any).name = (dbFolder as any).title;
            }

            console.log('[Store] Inserting folder:', dbFolder);

            const { error } = await supabase.from('folders').insert([{
                ...dbFolder,
                user_id: finalUserId
            }]);

            if (error) {
                console.error('[Store] Supabase folder insert failed:', error);
                if (error.message?.includes('limit exceeded') || error.code === 'P0001') {
                    set(state => ({
                        folders: state.folders.filter(f => f.id !== safeFolder.id),
                        isLimitExceeded: true
                    }));
                } else {
                    set(state => ({
                        folders: state.folders.map(f => f.id === safeFolder.id ? { ...f, syncStatus: 'error' } : f)
                    }));
                }
            } else {
                set(state => ({
                    folders: state.folders.map(f => f.id === safeFolder.id ? { ...f, syncStatus: 'synced' } : f)
                }));
            }
        } else {
            console.error('[Store] Cannot persist folder: user_id is missing');
            set(state => ({
                folders: state.folders.filter(f => f.id !== safeFolder.id)
            }));
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
                f.id === id ? { ...f, position_x: x, position_y: y, syncStatus: 'syncing' } : f
            ),
            history: {
                past: [...state.history.past, { type: 'MOVE', updates: [update] }],
                future: []
            }
        }));
        const { error } = await supabase.from('folders').update({ position_x: x, position_y: y }).eq('id', id);

        set(state => ({
            folders: state.folders.map(f => f.id === id ? { ...f, syncStatus: error ? 'error' : 'synced' } : f)
        }));
    },

    updateFolderContent: async (id, updates) => {
        const state = get();
        // Add updated_at for tracking last edit
        let finalUpdates = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        // Resolve collisions if becoming active
        const folder = state.folders.find(f => f.id === id);
        if (folder && (updates.status === 'active' && folder.status !== 'active')) {
            const safe = getSafePosition(id, folder.position_x, folder.position_y, folder, state.items, state.folders);
            finalUpdates.position_x = safe.x;
            finalUpdates.position_y = safe.y;
        }

        set((state) => ({
            folders: state.folders.map((f) =>
                f.id === id ? { ...f, ...finalUpdates, syncStatus: 'syncing' } : f
            )
        }));
        const { error } = await supabase.from('folders').update(finalUpdates).eq('id', id);

        if (error) {
            console.error('[Store] Supabase folder update failed:', JSON.stringify(error, null, 2));
        }

        set(state => ({
            folders: state.folders.map(f => f.id === id ? { ...f, syncStatus: error ? 'error' : 'synced' } : f)
        }));
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
    clearInbox: async () => {
        const state = get();
        const inboxItemIds = state.items.filter(i => i.status === 'inbox').map(i => i.id);
        if (inboxItemIds.length === 0) return;

        set(state => ({
            items: state.items.filter(i => i.status !== 'inbox')
        }));

        await supabase.from('items').delete().in('id', inboxItemIds);
    },
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

            // Determine height using unified helper
            const dims = getItemDimensions(el as any);
            let height = dims.h;

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

            // Determine height using unified helper
            const dims = getItemDimensions(el as any);
            let height = dims.h;

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

    refreshItem: async (id: string) => {
        try {
            const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
            if (data && !error) {
                set(state => ({
                    items: state.items.map(i => i.id === id ? { ...i, ...data, syncStatus: 'synced' } : i)
                }));
            }
        } catch (e) {
            console.error('[Store] refreshItem failed:', e);
        }
    },

    subscribeToChanges: () => {
        console.log('[Realtime] Initializing unified subscriptions...');
        set({ realtimeStatus: 'connecting' });

        const handleItemChange = (payload: any) => {
            console.log('[Realtime] 📥 Item Change:', payload.eventType, payload.new?.id || payload.old?.id);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const isNew = payload.eventType === 'INSERT';
                const data = payload.new;

                set(state => {
                    const exists = state.items.find(i => i.id === data.id);
                    let finalItem = { ...data, syncStatus: 'synced' as const };

                    // Collision prevention for remote arrivals on canvas
                    if (data.status === 'active' && !data.folder_id) {
                        const safe = getSafePosition(data.id, data.position_x, data.position_y, data, state.items, state.folders);
                        if (safe.x !== data.position_x || safe.y !== data.position_y) {
                            finalItem.position_x = safe.x;
                            finalItem.position_y = safe.y;
                            // Sync the correction back so others see it
                            supabase.from('items').update({ position_x: safe.x, position_y: safe.y }).eq('id', data.id).then();
                        }
                    }

                    if (exists) {
                        return {
                            items: state.items.map(i => i.id === data.id ? { ...i, ...finalItem } : i)
                        };
                    }

                    return { items: [...state.items, finalItem as Item] };
                });
            } else if (payload.eventType === 'DELETE') {
                set(state => ({ items: state.items.filter(i => i.id !== payload.old.id) }));
            }
        };

        const handleFolderChange = (payload: any) => {
            console.log('[Realtime] 📁 Folder Change:', payload.eventType, payload.new?.id || payload.old?.id);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const data = payload.new;
                set(state => {
                    const exists = state.folders.find(f => f.id === data.id);
                    let finalFolder = { ...data, syncStatus: 'synced' as const };

                    // Collision prevention for remote folders
                    if (data.status === 'active' && !data.parent_id) {
                        const safe = getSafePosition(data.id, data.position_x, data.position_y, data, state.items, state.folders);
                        if (safe.x !== data.position_x || safe.y !== data.position_y) {
                            finalFolder.position_x = safe.x;
                            finalFolder.position_y = safe.y;
                            supabase.from('folders').update({ position_x: safe.x, position_y: safe.y }).eq('id', data.id).then();
                        }
                    }

                    if (exists) {
                        return {
                            folders: state.folders.map(f => f.id === data.id ? { ...f, ...finalFolder } : f)
                        };
                    }
                    return { folders: [...state.folders, finalFolder as Folder] };
                });
            } else if (payload.eventType === 'DELETE') {
                set(state => ({ folders: state.folders.filter(f => f.id !== payload.old.id) }));
            }
        };

        const channel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, handleItemChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, handleFolderChange)
            .subscribe((status: string) => {
                console.log('[Realtime] Channel Status:', status);
                if (status === 'SUBSCRIBED') set({ realtimeStatus: 'connected' });
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') set({ realtimeStatus: 'disconnected' });
            });

        return () => {
            console.log('[Realtime] Cleaning up unified channel');
            supabase.removeChannel(channel);
        };
    }
}));
