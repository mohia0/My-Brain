import { Item } from "@/types";

export const MOCK_ITEMS: Item[] = [
    {
        id: '1',
        user_id: 'user_1',
        type: 'text',
        content: 'Welcome to Brainia',
        metadata: { title: 'Welcome Node' },
        folder_id: null,
        position_x: 600,
        position_y: 600,
        created_at: new Date().toISOString()
    },
    {
        id: '2',
        user_id: 'user_1',
        type: 'link',
        content: 'https://supabase.com',
        metadata: { title: 'Supabase' },
        folder_id: null,
        position_x: 900,
        position_y: 500,
        created_at: new Date().toISOString()
    },
    {
        id: '3',
        user_id: 'user_1',
        type: 'image',
        content: 'https://placehold.co/600x400/png',
        metadata: { title: 'Placeholder Image' },
        folder_id: null,
        position_x: 700,
        position_y: 800,
        created_at: new Date().toISOString()
    }
];
