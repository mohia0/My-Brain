export type ItemType = 'text' | 'image' | 'link' | 'video' | 'file' | 'project' | 'room';

export interface Item {
    id: string;
    user_id: string;
    type: ItemType;
    content: string;
    position_x: number;
    position_y: number;
    width?: number; // Optional for resizable items
    height?: number;
    z_index?: number;
    folder_id?: string | null;
    room_id?: string | null;  // New
    is_vaulted?: boolean;     // New
    status: 'inbox' | 'active' | 'archived' | 'trash';
    created_at: string;
    updated_at?: string;      // New
    metadata?: any;
    syncStatus?: 'synced' | 'syncing' | 'error';
}

export interface Folder {
    id: string;
    user_id: string;
    name: string;
    position_x: number;
    position_y: number;
    z_index?: number;
    parent_id?: string | null;
    room_id?: string | null;  // New
    is_vaulted?: boolean;     // New
    status: 'active' | 'archived' | 'trash';
    created_at: string;
    updated_at?: string;      // New
    color?: string;
    syncStatus?: 'synced' | 'syncing' | 'error';
}

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    color: string;
}
