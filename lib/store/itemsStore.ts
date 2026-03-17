import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId, getApiUrl } from '@/lib/utils';
import { scheduleReminderNotification, cancelReminderNotification } from '@/lib/notifications';
import { Item, Folder, Tag } from '@/types';
import { supabase } from '@/lib/supabase';
import { useCanvasStore } from './canvasStore';

type PositionUpdate = { id: string, type: 'item' | 'folder', x: number, y: number, prevX: number, prevY: number };

type HistoryAction =
    | { type: 'MOVE', updates: PositionUpdate[] }
    | { type: 'ADD_ITEM', item: Item }
    | { type: 'DELETE_ITEM', item: Item }
    | { type: 'ADD_FOLDER', folder: Folder }
    | { type: 'DELETE_FOLDER', folder: Folder }
    | { type: 'UPDATE_ITEM', id: string, prevUpdates: Partial<Item>, newUpdates: Partial<Item> }
    | { type: 'UPDATE_FOLDER', id: string, prevUpdates: Partial<Folder>, newUpdates: Partial<Folder> }
    | { type: 'BATCH_UPDATE', updates: { id: string, type: 'item' | 'folder', prev: any, new: any }[] };

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
    folders: Folder[],
    currentRoomId?: string | null
) => {
    const obstacleBuffer = 40; // Padding for "beside" feel
    const myDims = getItemDimensions(itemOrFolder);

    const obstacles = [
        ...items.filter(i => i.id !== id && i.status === 'active' && i.room_id === (currentRoomId || null) && !i.folder_id).map(i => {
            const dims = getItemDimensions(i);
            return { x: i.position_x, y: i.position_y, w: dims.w, h: dims.h };
        }),
        ...folders.filter(f => f.id !== id && f.status === 'active' && f.room_id === (currentRoomId || null) && !f.parent_id).map(f => ({ x: f.position_x, y: f.position_y, w: 280, h: 120 }))
    ];

    // If inside a room, the "Exit Room" button (at 0,0) is a permanent obstacle
    if (currentRoomId) {
        // Exit button is approx 200x50, centered at 0,0
        obstacles.push({ x: -100, y: -25, w: 200, h: 50 });
    }

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
    updateItemContent: (id: string, updates: Partial<Item>, options?: { skipCollision?: boolean, skipHistory?: boolean }) => Promise<void>;
    duplicateItem: (id: string) => void;
    duplicateFolder: (id: string) => void;
    duplicateSelected: () => void;
    moveSelectedToFolder: (targetFolderId: string | null) => void;
    moveSelectedToRoom: (targetRoomId: string | null) => void;
    removeItem: (id: string) => void;

    // Folders
    addFolder: (folder: Folder) => void;
    updateFolderPosition: (id: string, x: number, y: number) => void;
    updateFolderContent: (id: string, updates: Partial<Folder>, options?: { skipHistory?: boolean }) => void;
    removeFolder: (id: string) => void;

    // Archive
    archiveItem: (id: string) => void;
    unarchiveItem: (id: string) => void;
    archiveFolder: (id: string) => void;
    unarchiveFolder: (id: string) => void;
    archiveSelected: () => void;
    updateFolderItemsOrder: (itemIds: string[]) => Promise<void>;
    updateSubFoldersOrder: (folderIds: string[]) => Promise<void>;
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
    isSelectionMode: boolean;
    setSelectionMode: (val: boolean) => void;
    selectItem: (id: string) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    setSelection: (ids: string[]) => void;
    clearInbox: () => Promise<void>;

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

    // Room Navigation History
    roomHistory: { id: string | null, title: string }[];
    currentRoomTitle: string; // Title of the room we are actually IN right now
    enterRoom: (id: string, title: string) => void;
    exitRoom: () => void;
    updateItemTags: (id: string, tags: Tag[]) => void;
    getSafePosition: (id: string, targetX: number, targetY: number, itemOrFolder: Partial<Item> | Folder, items: Item[], folders: Folder[], currentRoomId?: string | null) => { x: number, y: number };
    enrichItem: (id: string, force?: boolean) => Promise<void>;
    reorderInboxItems: (itemIds: string[]) => Promise<void>;
    hasLoadedOnce: boolean;
    session: any | null;
    setSession: (session: any | null) => void;
    isSharing: boolean;
    setSharing: (val: boolean) => void;
}

export const useItemsStore = create<ItemsState>()(
    persist(
        (set, get) => ({
            items: [],
            folders: [],
            currentRoomId: null,
            setCurrentRoomId: (id) => set({ currentRoomId: id }),
            history: { past: [], future: [] },
            loading: false,
            realtimeStatus: 'disconnected',
            selectedIds: [],
            isSelectionMode: false,
            setSelectionMode: (val) => set({ isSelectionMode: val }),

            setLoading: (loading) => set({ loading }),
            isLimitExceeded: false,
            setIsLimitExceeded: (val) => set({ isLimitExceeded: val }),
            vaultedItemsRevealed: [],
            roomHistory: [],
            currentRoomTitle: 'Canvas',
            hasLoadedOnce: false,
            session: null,
            setSession: (session) => set({ session }),
            isSharing: false,
            setSharing: (val) => set({ isSharing: val }),

            enterRoom: (id, title) => {
                const state = get();
                const prevId = state.currentRoomId;
                const prevTitle = state.currentRoomTitle;

                const canvasState = useCanvasStore.getState();
                canvasState.saveRoomView(prevId, canvasState.scale, canvasState.position);

                set({
                    roomHistory: [...state.roomHistory, { id: prevId, title: prevTitle }],
                    currentRoomId: id,
                    currentRoomTitle: title
                });

                const targetView = canvasState.roomViews[id];
                if (targetView) {
                    canvasState.restoreView(targetView.scale, targetView.position);
                } else {
                    canvasState.setPosition(window.innerWidth / 2, window.innerHeight / 2);
                    canvasState.setScale(1);
                }
            },

            exitRoom: () => {
                const state = get();
                const canvasState = useCanvasStore.getState();
                canvasState.saveRoomView(state.currentRoomId, canvasState.scale, canvasState.position);

                if (state.roomHistory.length === 0) {
                    set({ currentRoomId: null, currentRoomTitle: 'Canvas' });
                    const rootRoomView = canvasState.roomViews['root'];
                    if (rootRoomView) {
                        canvasState.restoreView(rootRoomView.scale, rootRoomView.position);
                    }
                    return;
                }

                const newHistory = [...state.roomHistory];
                const lastEntry = newHistory.pop();
                const newId = lastEntry?.id ?? null;

                set({
                    currentRoomId: newId,
                    currentRoomTitle: lastEntry?.title || 'Canvas',
                    roomHistory: newHistory
                });

                const viewKey = newId || 'root';
                const targetView = canvasState.roomViews[viewKey];
                if (targetView) {
                    canvasState.restoreView(targetView.scale, targetView.position);
                } else {
                    canvasState.setPosition(window.innerWidth / 2, window.innerHeight / 2);
                    canvasState.setScale(1);
                }
            },

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
                if (!get().hasLoadedOnce) set({ loading: true });
                try {
                    let targetUser = user || get().session?.user;

                    if (!targetUser) {
                        const { data: { session } } = await supabase.auth.getSession();
                        targetUser = session?.user;
                        if (session) set({ session });
                    }

                    if (!targetUser) {
                        set({ loading: false });
                        return;
                    }

                    if (typeof window !== 'undefined') {
                        (window as any).__USER_ID__ = targetUser.id;
                    }

                    const currentRoomId = get().currentRoomId;
                    const revealedItems = get().vaultedItemsRevealed;

                    // Get persisted vault state from the OTHER store
                    const vaultStore = (window as any).__VAULT_STORE__ || null;
                    const persistedUnlockedIds = vaultStore?.getState()?.unlockedIds || [];
                    const isVaultLockedGlobal = vaultStore?.getState()?.isVaultLocked ?? true;

                    // Fetch all items and folders for this user at once
                    // This makes navigation between rooms instant because all data is already local
                    let dbItemsReq = supabase.from('items').select('*, item_tags(tags(*))').order('created_at', { ascending: false });
                    let dbFoldersReq = supabase.from('folders').select('*').order('created_at', { ascending: false });

                    const [itemsRes, foldersRes] = await Promise.all([dbItemsReq, dbFoldersReq]);

                    if (itemsRes.data) {
                        set(state => {
                            const localSyncing = state.items.filter(i => i.syncStatus === 'syncing' || i.syncStatus === 'error');
                            const rawItems = itemsRes.data as any[];

                            // Map item_tags to metadata.tags for consistency with search/UI
                            const remoteItems: Item[] = rawItems.map(item => {
                                const tags = (item.item_tags || [])
                                    .map((it: any) => it.tags)
                                    .filter(Boolean);

                                return {
                                    ...item,
                                    metadata: {
                                        ...(item.metadata || {}),
                                        tags: tags
                                    }
                                };
                            });

                            const now = Date.now();
                            // Keep recently created items that might not have reached the read replica yet
                            const recentLocalItems = state.items.filter(i => {
                                if (i.syncStatus === 'syncing' || i.syncStatus === 'error') return false;
                                const age = now - new Date(i.updated_at || i.created_at || now).getTime();
                                return age < 15000;
                            });

                            const filteredRemote = remoteItems.filter(ri => !localSyncing.find(li => li.id === ri.id) && !recentLocalItems.find(li => li.id === ri.id));
                            return { items: [...filteredRemote, ...localSyncing, ...recentLocalItems] };
                        });
                    }
                    if (foldersRes.data) {
                        set(state => {
                            const localSyncingFolders = state.folders.filter(f => f.syncStatus === 'syncing' || f.syncStatus === 'error');
                            const rawFolders = foldersRes.data as Folder[];
                            
                            const now = Date.now();
                            const recentLocalFolders = state.folders.filter(f => {
                                if (f.syncStatus === 'syncing' || f.syncStatus === 'error') return false;
                                const age = now - new Date(f.updated_at || f.created_at || now).getTime();
                                return age < 15000;
                            });

                            const filteredRemoteFolders = rawFolders.filter(rf => !localSyncingFolders.find(lf => lf.id === rf.id) && !recentLocalFolders.find(lf => lf.id === rf.id));
                            return { folders: [...filteredRemoteFolders, ...localSyncingFolders, ...recentLocalFolders] };
                        });
                    }
                } catch (err: any) {
                    // Silence AbortError as it's typically an intentional cancellation by the browser/Next.js
                    if (err.name === 'AbortError') return;
                    console.error('[ItemsStore] fetchData failed:', err);
                } finally {
                    set({ loading: false, hasLoadedOnce: true }); // Set to true after first fetch
                }
            },

            addItem: async (item) => {
                const state = get();
                const safePos = getSafePosition(item.id, item.position_x, item.position_y, item, state.items, state.folders, state.currentRoomId);

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
                            items: state.items.map(i => i.id === finalItem.id ? { ...i, user_id: finalUserId, syncStatus: 'synced' } : i)
                        }));

                        // Schedule notification if it's a reminder
                        if (finalItem.type === 'reminder') {
                            scheduleReminderNotification(finalItem);
                        }
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

                const now = new Date().toISOString();
                set((state) => ({
                    items: state.items.map((i) => i.id === id ? { ...i, position_x: x, position_y: y, updated_at: now, syncStatus: 'syncing' } : i),
                    history: {
                        past: [...state.history.past, { type: 'MOVE', updates: [update] }],
                        future: []
                    }
                }));
                const { error } = await supabase.from('items').update({ position_x: x, position_y: y, updated_at: now }).eq('id', id);

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

                const now = new Date().toISOString();
                set((state) => ({
                    items: state.items.map(item => {
                        const u = processedUpdates.find(up => up.id === item.id && up.type === 'item');
                        return u ? { ...item, position_x: u.x, position_y: u.y, updated_at: now } : item;
                    }),
                    folders: state.folders.map(folder => {
                        const u = processedUpdates.find(up => up.id === folder.id && up.type === 'folder');
                        return u ? { ...folder, position_x: u.x, position_y: u.y, updated_at: now } : folder;
                    }),
                    history: {
                        past: [...state.history.past, { type: 'MOVE', updates: historyUpdates }],
                        future: []
                    }
                }));

                processedUpdates.forEach(u => {
                    if (u.type === 'item') {
                        supabase.from('items').update({ position_x: u.x, position_y: u.y, updated_at: now }).eq('id', u.id).then();
                    } else {
                        supabase.from('folders').update({ position_x: u.x, position_y: u.y, updated_at: now }).eq('id', u.id).then();
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
                    case 'ADD_FOLDER':
                        set(s => ({
                            folders: s.folders.filter(f => f.id !== action.folder.id),
                            history: { past: newPast, future: [action, ...s.history.future] }
                        }));
                        supabase.from('folders').delete().eq('id', action.folder.id).then();
                        break;
                    case 'DELETE_FOLDER':
                        set(s => ({
                            folders: [...s.folders, action.folder],
                            history: { past: newPast, future: [action, ...s.history.future] }
                        }));
                        supabase.from('folders').insert([action.folder]).then();
                        break;
                    case 'UPDATE_ITEM':
                        set(s => ({
                            items: s.items.map(i => i.id === action.id ? { ...i, ...action.prevUpdates } : i),
                            history: { past: newPast, future: [action, ...s.history.future] }
                        }));
                        supabase.from('items').update(action.prevUpdates).eq('id', action.id).then();
                        break;
                    case 'UPDATE_FOLDER':
                        set(s => ({
                            folders: s.folders.map(f => f.id === action.id ? { ...f, ...action.prevUpdates } : f),
                            history: { past: newPast, future: [action, ...s.history.future] }
                        }));
                        supabase.from('folders').update(action.prevUpdates).eq('id', action.id).then();
                        break;
                    case 'BATCH_UPDATE':
                        set(s => ({
                            items: s.items.map(i => {
                                const u = action.updates.find(up => up.id === i.id && up.type === 'item');
                                return u ? { ...i, ...u.prev } : i;
                            }),
                            folders: s.folders.map(f => {
                                const u = action.updates.find(up => up.id === f.id && up.type === 'folder');
                                return u ? { ...f, ...u.prev } : f;
                            }),
                            history: { past: newPast, future: [action, ...s.history.future] }
                        }));
                        action.updates.forEach(u => {
                            if (u.type === 'item') supabase.from('items').update(u.prev).eq('id', u.id).then();
                            else supabase.from('folders').update(u.prev).eq('id', u.id).then();
                        });
                        break;
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
                    case 'ADD_FOLDER':
                        set(s => ({
                            folders: [...s.folders, action.folder],
                            history: { past: [...s.history.past, action], future: newFuture }
                        }));
                        supabase.from('folders').insert([action.folder]).then();
                        break;
                    case 'DELETE_FOLDER':
                        set(s => ({
                            folders: s.folders.filter(f => f.id !== action.folder.id),
                            history: { past: [...s.history.past, action], future: newFuture }
                        }));
                        supabase.from('folders').delete().eq('id', action.folder.id).then();
                        break;
                    case 'UPDATE_ITEM':
                        set(s => ({
                            items: s.items.map(i => i.id === action.id ? { ...i, ...action.newUpdates } : i),
                            history: { past: [...s.history.past, action], future: newFuture }
                        }));
                        supabase.from('items').update(action.newUpdates).eq('id', action.id).then();
                        break;
                    case 'UPDATE_FOLDER':
                        set(s => ({
                            folders: s.folders.map(f => f.id === action.id ? { ...f, ...action.newUpdates } : f),
                            history: { past: [...s.history.past, action], future: newFuture }
                        }));
                        supabase.from('folders').update(action.newUpdates).eq('id', action.id).then();
                        break;
                    case 'BATCH_UPDATE':
                        set(s => ({
                            items: s.items.map(i => {
                                const u = action.updates.find(up => up.id === i.id && up.type === 'item');
                                return u ? { ...i, ...u.new } : i;
                            }),
                            folders: s.folders.map(f => {
                                const u = action.updates.find(up => up.id === f.id && up.type === 'folder');
                                return u ? { ...f, ...u.new } : f;
                            }),
                            history: { past: [...s.history.past, action], future: newFuture }
                        }));
                        action.updates.forEach(u => {
                            if (u.type === 'item') supabase.from('items').update(u.new).eq('id', u.id).then();
                            else supabase.from('folders').update(u.new).eq('id', u.id).then();
                        });
                        break;
                }
            },

            updateItemContent: async (id, updates, options) => {
                const state = get();
                const item = state.items.find(i => i.id === id);
                if (!item) return;

                // Add updated_at to track last edit
                let finalUpdates = {
                    ...updates,
                    updated_at: new Date().toISOString()
                };

                // If movement is involved (e.g. from Inbox) or item becomes active, resolve collisions
                if (!options?.skipCollision && (updates.position_x !== undefined || updates.position_y !== undefined || (updates.status === 'active' && item.status !== 'active'))) {
                    const targetX = updates.position_x ?? item.position_x;
                    const targetY = updates.position_y ?? item.position_y;
                    // Use currentRoomId if moving to current room, otherwise use target room if provided
                    const targetRoomId = updates.room_id !== undefined ? (updates.room_id || null) : (state.currentRoomId || null);
                    const safe = getSafePosition(id, targetX, targetY, { ...item, ...updates }, state.items, state.folders, targetRoomId);
                    finalUpdates.position_x = safe.x;
                    finalUpdates.position_y = safe.y;
                }

                // Record history if not skipped
                if (!options?.skipHistory) {
                    const prevUpdates: Partial<Item> = {};
                    Object.keys(updates).forEach(key => {
                        (prevUpdates as any)[key] = (item as any)[key];
                    });

                    set(state => ({
                        history: {
                            past: [...state.history.past, { type: 'UPDATE_ITEM', id, prevUpdates, newUpdates: finalUpdates }],
                            future: []
                        }
                    }));
                }

                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, ...finalUpdates, syncStatus: 'syncing' } : item
                    )
                }));

                // DB safety: remove local-only properties before sync
                const { syncStatus: _, ...dbUpdates } = finalUpdates as any;
                const { error } = await supabase.from('items').update(dbUpdates).eq('id', id);

                set(state => ({
                    items: state.items.map(i => i.id === id ? { ...i, syncStatus: error ? 'error' : 'synced' } : i)
                }));

                // Handle notification rescheduling/cancellation
                const updatedItem = get().items.find(i => i.id === id);
                if (updatedItem) {
                    if (updatedItem.type === 'reminder') {
                        if (updatedItem.status === 'active' || updatedItem.status === 'inbox') {
                            scheduleReminderNotification(updatedItem);
                        } else {
                            cancelReminderNotification(id);
                        }
                    }
                }
            },

            toggleVaultItem: async (id) => {
                const item = get().items.find(i => i.id === id);
                if (!item) return;

                // Clear any "temporarily unlocked" state for this item so it resets
                const vaultStore = (window as any).__VAULT_STORE__;
                if (vaultStore) {
                    await vaultStore.getState().lockItem(id);
                }

                // Also clear local revealed content if any
                get().reLockVaulted(id);

                await get().updateItemContent(id, { is_vaulted: !item.is_vaulted });
            },

            toggleVaultFolder: async (id) => {
                const folder = get().folders.find(f => f.id === id);
                if (!folder) return;

                // Clear any "temporarily unlocked" state for this folder
                const vaultStore = (window as any).__VAULT_STORE__;
                if (vaultStore) {
                    await vaultStore.getState().lockItem(id);
                }

                await get().updateFolderContent(id, { is_vaulted: !folder.is_vaulted });
            },

            duplicateItem: async (id) => {
                const state = get();
                const item = state.items.find(i => i.id === id);
                if (!item) return;

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const newItemId = generateId();
                const safePos = getSafePosition(newItemId, item.position_x + 30, item.position_y + 30, item, state.items, state.folders, state.currentRoomId);

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
                const { syncStatus: _, item_tags: __, ...dbItem } = newItem as any;
                const { error } = await supabase.from('items').insert([dbItem]);

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

                const newFolderId = generateId();
                const safePos = getSafePosition(newFolderId, folder.position_x + 30, folder.position_y + 30, folder, state.items, state.folders, state.currentRoomId);

                const folderToInsert = {
                    ...folder,
                    id: newFolderId,
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
                const { syncStatus: __, ...dbFolder } = folderToInsert;
                const { error } = await supabase.from('folders').insert([dbFolder]);

                if (error) {
                    console.error('[Store] duplicateFolder failed:', error);
                    if (error.message?.includes('limit exceeded') || error.code === 'P0001') {
                        set(state => ({
                            folders: state.folders.filter(f => f.id !== newFolderId),
                            isLimitExceeded: true
                        }));
                    } else {
                        set(state => ({
                            folders: state.folders.map(f => f.id === newFolderId ? { ...f, syncStatus: 'error' } : f)
                        }));
                    }
                } else {
                    set(state => ({
                        folders: state.folders.map(f => f.id === newFolderId ? { ...f, syncStatus: 'synced' } : f)
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
                const { selectedIds, items, folders, clearSelection } = get();
                const batchUpdates: { id: string, type: 'item' | 'folder', prev: any, new: any }[] = [];

                const now = new Date().toISOString();

                for (const id of selectedIds) {
                    const item = items.find(i => i.id === id);
                    if (item) {
                        const prev = { folder_id: item.folder_id, room_id: item.room_id, status: item.status, updated_at: item.updated_at };
                        const next = { folder_id: targetFolderId, room_id: null, status: 'active' as const, updated_at: now };
                        batchUpdates.push({ id, type: 'item', prev, new: next });
                    } else {
                        const folder = folders.find(f => f.id === id);
                        if (folder && id !== targetFolderId) {
                            const prev = { parent_id: folder.parent_id, room_id: folder.room_id, status: folder.status, updated_at: folder.updated_at };
                            const next = { parent_id: targetFolderId, room_id: null, status: 'active' as const, updated_at: now };
                            batchUpdates.push({ id, type: 'folder', prev, new: next });
                        }
                    }
                }

                if (batchUpdates.length === 0) return;

                set(state => ({
                    items: state.items.map(i => {
                        const u = batchUpdates.find(up => up.id === i.id && up.type === 'item');
                        return u ? { ...i, ...u.new } : i;
                    }),
                    folders: state.folders.map(f => {
                        const u = batchUpdates.find(up => up.id === f.id && up.type === 'folder');
                        return u ? { ...f, ...u.new } : f;
                    }),
                    history: {
                        past: [...state.history.past, { type: 'BATCH_UPDATE', updates: batchUpdates }],
                        future: []
                    }
                }));

                // DB batch updates (Supabase doesn't have a clean multi-row multi-column update, so loop for now or use RPC)
                for (const u of batchUpdates) {
                    if (u.type === 'item') supabase.from('items').update(u.new).eq('id', u.id).then();
                    else supabase.from('folders').update(u.new).eq('id', u.id).then();
                }

                clearSelection();
            },

            moveSelectedToRoom: async (targetRoomId) => {
                const { selectedIds, items, folders, clearSelection } = get();
                const batchUpdates: { id: string, type: 'item' | 'folder', prev: any, new: any }[] = [];

                // Track local positions for collision prevention within the batch
                let currentItems = [...items];
                let currentFolders = [...folders];

                const now = new Date().toISOString();

                for (const id of selectedIds) {
                    const item = items.find(i => i.id === id);
                    if (item) {
                        const safe = getSafePosition(id, 200, 0, { ...item, room_id: targetRoomId }, currentItems, currentFolders, targetRoomId);
                        const prev = { room_id: item.room_id, folder_id: item.folder_id, status: item.status, position_x: item.position_x, position_y: item.position_y, updated_at: item.updated_at };
                        const next = { room_id: targetRoomId, folder_id: null, status: 'active' as const, position_x: safe.x, position_y: safe.y, updated_at: now };

                        batchUpdates.push({ id, type: 'item', prev, new: next });
                        // Update local tracking
                        currentItems = currentItems.map(i => i.id === id ? { ...i, ...next } : i);
                    } else {
                        const folder = folders.find(f => f.id === id);
                        if (folder) {
                            const safe = getSafePosition(id, 200, 0, { ...folder, room_id: targetRoomId }, currentItems, currentFolders, targetRoomId);
                            const prev = { room_id: folder.room_id, parent_id: folder.parent_id, status: folder.status, position_x: folder.position_x, position_y: folder.position_y, updated_at: folder.updated_at };
                            const next = { room_id: targetRoomId, parent_id: null, status: 'active' as const, position_x: safe.x, position_y: safe.y, updated_at: now };

                            batchUpdates.push({ id, type: 'folder', prev, new: next });
                            currentFolders = currentFolders.map(f => f.id === id ? { ...f, ...next } : f);
                        }
                    }
                }

                if (batchUpdates.length === 0) return;

                set(state => ({
                    items: state.items.map(i => {
                        const u = batchUpdates.find(up => up.id === i.id && up.type === 'item');
                        return u ? { ...i, ...u.new } : i;
                    }),
                    folders: state.folders.map(f => {
                        const u = batchUpdates.find(up => up.id === f.id && up.type === 'folder');
                        return u ? { ...f, ...u.new } : f;
                    }),
                    history: {
                        past: [...state.history.past, { type: 'BATCH_UPDATE', updates: batchUpdates }],
                        future: []
                    }
                }));

                for (const u of batchUpdates) {
                    if (u.type === 'item') supabase.from('items').update(u.new).eq('id', u.id).then();
                    else supabase.from('folders').update(u.new).eq('id', u.id).then();
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

                // Cancel notification
                if (item.type === 'reminder') {
                    cancelReminderNotification(id);
                }

                await supabase.from('items').delete().eq('id', id);
            },

            // Folders
            addFolder: async (folder) => {
                const state = get();
                const safePos = getSafePosition(folder.id, folder.position_x, folder.position_y, folder, state.items, state.folders, state.currentRoomId);

                const safeFolder = {
                    ...folder,
                    color: folder.color && folder.color !== 'var(--accent)' ? folder.color : '#6B7280',
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
                            folders: state.folders.map(f => f.id === safeFolder.id ? { ...f, user_id: finalUserId, syncStatus: 'synced' } : f)
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

                const now = new Date().toISOString();
                set((state) => ({
                    folders: state.folders.map((f) =>
                        f.id === id ? { ...f, position_x: x, position_y: y, updated_at: now, syncStatus: 'syncing' } : f
                    ),
                    history: {
                        past: [...state.history.past, { type: 'MOVE', updates: [update] }],
                        future: []
                    }
                }));
                const { error } = await supabase.from('folders').update({ position_x: x, position_y: y, updated_at: now }).eq('id', id);

                set(state => ({
                    folders: state.folders.map(f => f.id === id ? { ...f, syncStatus: error ? 'error' : 'synced' } : f)
                }));
            },

            updateFolderContent: async (id, updates, options?: { skipHistory?: boolean }) => {
                const state = get();
                const folder = state.folders.find(f => f.id === id);
                if (!folder) return;

                // Add updated_at for tracking last edit
                let finalUpdates = {
                    ...updates,
                    updated_at: new Date().toISOString()
                };

                // Resolve collisions if becoming active
                if (folder && (updates.status === 'active' && folder.status !== 'active')) {
                    const targetRoomId = updates.room_id !== undefined ? (updates.room_id || null) : (state.currentRoomId || null);
                    const safe = getSafePosition(id, folder.position_x, folder.position_y, folder, state.items, state.folders, targetRoomId);
                    finalUpdates.position_x = safe.x;
                    finalUpdates.position_y = safe.y;
                }

                // Record history
                if (!options?.skipHistory) {
                    const prevUpdates: Partial<Folder> = {};
                    Object.keys(updates).forEach(key => {
                        (prevUpdates as any)[key] = (folder as any)[key];
                    });

                    set(state => ({
                        history: {
                            past: [...state.history.past, { type: 'UPDATE_FOLDER', id, prevUpdates, newUpdates: finalUpdates }],
                            future: []
                        }
                    }));
                }

                set((state) => ({
                    folders: state.folders.map((f) =>
                        f.id === id ? { ...f, ...finalUpdates, syncStatus: 'syncing' } : f
                    )
                }));

                // DB safety: remove local-only properties before sync
                const { syncStatus: _, ...dbUpdates } = finalUpdates as any;
                const { error } = await supabase.from('folders').update(dbUpdates).eq('id', id);

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
                const { selectedIds, items, folders, clearSelection } = get();
                const batchUpdates: { id: string, type: 'item' | 'folder', prev: any, new: any }[] = [];
                const now = new Date().toISOString();

                for (const id of selectedIds) {
                    const item = items.find(i => i.id === id);
                    if (item) {
                        batchUpdates.push({
                            id, type: 'item',
                            prev: { status: item.status, updated_at: item.updated_at },
                            new: { status: 'archived' as const, updated_at: now }
                        });
                    } else {
                        const folder = folders.find(f => f.id === id);
                        if (folder) {
                            batchUpdates.push({
                                id, type: 'folder',
                                prev: { status: folder.status, updated_at: folder.updated_at },
                                new: { status: 'archived' as const, updated_at: now }
                            });
                        }
                    }
                }

                if (batchUpdates.length === 0) return;

                set(state => ({
                    items: state.items.map(i => {
                        const u = batchUpdates.find(up => up.id === i.id && up.type === 'item');
                        return u ? { ...i, ...u.new } : i;
                    }),
                    folders: state.folders.map(f => {
                        const u = batchUpdates.find(up => up.id === f.id && up.type === 'folder');
                        return u ? { ...f, ...u.new } : f;
                    }),
                    history: {
                        past: [...state.history.past, { type: 'BATCH_UPDATE', updates: batchUpdates }],
                        future: []
                    }
                }));

                for (const u of batchUpdates) {
                    if (u.type === 'item') supabase.from('items').update(u.new).eq('id', u.id).then();
                    else supabase.from('folders').update(u.new).eq('id', u.id).then();
                }

                clearSelection();
            },

            // Selection (Local Only)
            selectItem: (id) => set({ selectedIds: [id], isSelectionMode: false }),
            toggleSelection: (id) => set((state) => ({
                isSelectionMode: true,
                selectedIds: state.selectedIds.includes(id)
                    ? state.selectedIds.filter(sid => sid !== id)
                    : [...state.selectedIds, id]
            })),
            clearSelection: () => set({ selectedIds: [], isSelectionMode: false }),
            setSelection: (ids) => set({ selectedIds: ids, isSelectionMode: ids.length > 0 }),
            clearInbox: async () => {
                const state = get();
                const inboxItemIds = state.items.filter(i => i.status === 'inbox').map(i => i.id);
                if (inboxItemIds.length === 0) return;

                set(state => ({
                    items: state.items.filter(i => i.status !== 'inbox')
                }));

                await supabase.from('items').delete().in('id', inboxItemIds);
            },


            refreshItem: async (id: string) => {
                try {
                    const { data, error } = await supabase.from('items').select('*, item_tags(tags(*))').eq('id', id).single();
                    if (data && !error) {
                        const tags = (data.item_tags || [])
                            .map((it: any) => it.tags)
                            .filter(Boolean);

                        const incomingMetadata = data.metadata || {};
                        const cleanMetadata = Object.fromEntries(
                            Object.entries(incomingMetadata).filter(([_, v]) => v !== null && v !== undefined && v !== '')
                        );

                        set(state => ({
                            items: state.items.map(i => i.id === id ? {
                                ...i,
                                ...data,
                                metadata: {
                                    ...(i.metadata || {}),
                                    ...cleanMetadata,
                                    // Preserve tags if they were already mapped
                                    tags: tags.length > 0 ? tags : (i.metadata?.tags || [])
                                },
                                syncStatus: 'synced'
                            } : i)
                        }));
                    }
                } catch (e) {
                    console.error('[Store] refreshItem failed:', e);
                }
            },

            enrichItem: async (id: string, force: boolean = false) => {
                const item = get().items.find(i => i.id === id);
                if (!item || item.type !== 'link') return;

                // Don't re-enrich if it already has a "real" title, unless forced.
                // Mobile captures sometimes come in as generic "Capturing...", so we still want to enrich those
                // if they are truly missing data, but ONLY if we haven't already fetched a real title.
                const isGenericTitle = !item.metadata?.title || item.metadata.title.includes('Capturing');
                if (!isGenericTitle && !force) return;

                const userId = item.user_id;
                const url = item.content;
                const metadataUrl = getApiUrl('/api/metadata');
                const screenshotUrl = getApiUrl('/api/screenshot');

                console.log(`[Store] Enriching item ${id}...`);

                // 1. Metadata
                fetch(metadataUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, itemId: id, userId, skipCapture: true })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.error) throw new Error(data.error);
                        
                        // Smart merge: only update fields that actually have values
                        const currentItem = get().items.find(i => i.id === id);
                        if (!currentItem) return;

                        const cleanData = Object.fromEntries(
                            Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== '')
                        );
                        
                        if (Object.keys(cleanData).length > 0) {
                            // Instead of just refreshing, we can optimistically merge right here
                            // to avoid any flicker if refreshItem is slow
                            set(state => ({
                                items: state.items.map(i => i.id === id ? {
                                    ...i,
                                    metadata: {
                                        ...(i.metadata || {}),
                                        ...cleanData
                                    }
                                } : i)
                            }));
                            get().refreshItem(id);
                        }
                    })
                    .catch(e => console.error('[Store] Enrichment Metadata failed:', e));

                // 2. Screenshot (Delay slightly)
                setTimeout(() => {
                    fetch(screenshotUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, itemId: id, userId })
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.metadata) {
                                // Smart merge for screenshot as well
                                const currentItem = get().items.find(i => i.id === id);
                                const cleanData = Object.fromEntries(
                                    Object.entries(data.metadata).filter(([_, v]) => v !== null && v !== undefined && v !== '')
                                );
                                
                                if (Object.keys(cleanData).length > 0) {
                                    get().refreshItem(id);
                                }
                            }
                        })
                        .catch(e => console.error('[Store] Enrichment Screenshot failed:', e));
                }, 2000);
            },

            reorderInboxItems: async (itemIds: string[]) => {
                const now = new Date().toISOString();
                
                // Optimistically update local state
                set(state => ({
                    items: state.items.map(item => {
                        const newIndex = itemIds.indexOf(item.id);
                        if (newIndex !== -1) {
                            return { ...item, position_y: newIndex, updated_at: now };
                        }
                        return item;
                    })
                }));

                // Update DB in background
                // We use position_y as a proxy for index in the inbox
                for (let i = 0; i < itemIds.length; i++) {
                    supabase.from('items')
                        .update({ position_y: i, updated_at: now })
                        .eq('id', itemIds[i])
                        .then();
                }
            },

            updateFolderItemsOrder: async (itemIds: string[]) => {
                const now = new Date().toISOString();
                set(state => ({
                    items: state.items.map(i => {
                        const index = itemIds.indexOf(i.id);
                        if (index !== -1) {
                            return {
                                ...i,
                                metadata: { ...(i.metadata || {}), sort_index: index },
                                updated_at: now
                            };
                        }
                        return i;
                    })
                }));

                // Update DB in background
                for (let i = 0; i < itemIds.length; i++) {
                    const item = get().items.find(it => it.id === itemIds[i]);
                    if (item) {
                        supabase.from('items')
                            .update({ metadata: item.metadata, updated_at: now })
                            .eq('id', itemIds[i])
                            .then();
                    }
                }
            },

            updateSubFoldersOrder: async (folderIds: string[]) => {
                const now = new Date().toISOString();
                set(state => ({
                    folders: state.folders.map(f => {
                        const index = folderIds.indexOf(f.id);
                        if (index !== -1) {
                            return {
                                ...f,
                                metadata: { ...(f.metadata || {}), sort_index: index },
                                updated_at: now
                            };
                        }
                        return f;
                    })
                }));

                // Update DB 
                for (let i = 0; i < folderIds.length; i++) {
                    const folder = get().folders.find(fd => fd.id === folderIds[i]);
                    if (folder) {
                        supabase.from('folders')
                            .update({ metadata: (folder as any).metadata || {}, updated_at: now })
                            .eq('id', folderIds[i])
                            .then();
                    }
                }
            },

            updateItemTags: (id: string, tags: Tag[]) => {
                set(state => ({
                    items: state.items.map(i => i.id === id ? {
                        ...i,
                        metadata: {
                            ...(i.metadata || {}),
                            tags: tags
                        }
                    } : i)
                }));
            },
            getSafePosition: (id, targetX, targetY, itemOrFolder, items, folders, currentRoomId) => {
                return getSafePosition(id, targetX, targetY, itemOrFolder, items, folders, currentRoomId);
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
                            
                            if (exists) {
                                const localTime = new Date(exists.updated_at || exists.created_at || 0).getTime();
                                const remoteTime = new Date(data.updated_at || data.created_at || 0).getTime();
                                
                                // Ignore stale updates and do not interrupt active syncing
                                if (exists.syncStatus === 'syncing' || localTime >= remoteTime) {
                                    return state;
                                }
                            }

                            let finalItem = { ...data, syncStatus: 'synced' as const };

                            // Collision prevention for remote arrivals on canvas
                            if (data.status === 'active' && !data.folder_id) {
                                const safe = getSafePosition(data.id, data.position_x, data.position_y, data, state.items, state.folders, state.currentRoomId);
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

                            // Prepend new items so they show up at the top of lists immediately
                            return { items: [finalItem as Item, ...state.items] };
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
                            
                            if (exists) {
                                const localTime = new Date(exists.updated_at || exists.created_at || 0).getTime();
                                const remoteTime = new Date(data.updated_at || data.created_at || 0).getTime();
                                
                                if (exists.syncStatus === 'syncing' || localTime >= remoteTime) {
                                    return state;
                                }
                            }

                            let finalFolder = { ...data, syncStatus: 'synced' as const };

                            // Collision prevention for remote folders
                            if (data.status === 'active' && !data.parent_id) {
                                const safe = getSafePosition(data.id, data.position_x, data.position_y, data, state.items, state.folders, state.currentRoomId);
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
                            // Prepend new folders
                            return { folders: [finalFolder as Folder, ...state.folders] };
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
        }),
        {
            name: 'brainia-items-storage',
            partialize: (state) => ({
                currentRoomId: state.currentRoomId,
                currentRoomTitle: state.currentRoomTitle,
                roomHistory: state.roomHistory,
                items: state.items.map(i => ({ ...i, syncStatus: 'synced' as const })),
                folders: state.folders.map(f => ({ ...f, syncStatus: 'synced' as const }))
            })
        }
    )
);
