export type ItemType = 'link' | 'text' | 'image';

export interface Item {
    id: string;
    user_id: string;
    type: ItemType;
    content: string;
    metadata?: any;
    folder_id?: string | null;
    position_x: number;
    position_y: number;
    created_at: string;
}

export interface Folder {
    id: string;
    user_id: string;
    name: string;
    parent_id?: string | null;
    created_at: string;
}
