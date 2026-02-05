"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block, BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
    getDefaultReactSlashMenuItems,
    SuggestionMenuController
} from "@blocknote/react";
import { useEffect, useState } from "react";
import { Undo, Redo } from "lucide-react";

interface BlockEditorProps {
    initialContent?: string; // JSON string or plain text
    onChange: (content: string) => void;
    editable?: boolean;
}

// Function to handle file uploads (Images)
const uploadFile = async (file: File) => {
    // For now, we use a simple base64 conversion. 
    // In production, you'd upload this to Supabase Storage or S3.
    return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
    });
};

// Custom Slash Menu Item Reordering
const getCustomSlashMenuItems = (editor: BlockNoteEditor) => {
    const items = getDefaultReactSlashMenuItems(editor);

    // Find headings
    const h1 = items.find(i => i.title === "Heading 1");
    const h2 = items.find(i => i.title === "Heading 2");
    const h3 = items.find(i => i.title === "Heading 3");

    // Filter out headings from the main list to re-insert them
    const filtered = items.filter(i => !["Heading 1", "Heading 2", "Heading 3"].includes(i.title));

    // Group them: Text, H1, H2, H3, others...
    const result = [
        filtered[0], // Usually Paragraph
        h1, h2, h3,
        ...filtered.slice(1)
    ].filter(Boolean) as any;

    return result;
};

export default function BlockEditor({ initialContent, onChange, editable = true }: BlockEditorProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        // Initial theme check
        const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark';
        setTheme(currentTheme);

        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    const newTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark';
                    setTheme(newTheme);
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    // Try to parse initial content as JSON blocks
    const getInitialBlocks = (): Block[] | undefined => {
        if (!initialContent) return undefined;
        try {
            const parsed = JSON.parse(initialContent);
            if (Array.isArray(parsed)) return parsed;
            return undefined;
        } catch (e) {
            return [
                {
                    id: "initial-block",
                    type: "paragraph",
                    content: initialContent,
                } as any
            ];
        }
    };

    const editor = useCreateBlockNote({
        initialContent: getInitialBlocks(),
        uploadFile, // Enable image uploads
    });

    const handleChange = () => {
        const json = JSON.stringify(editor.document);
        onChange(json);
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: theme === 'light' ? '#ffffff' : 'transparent',
            borderRadius: 'inherit'
        }}>
            {editable && (
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--card-border)',
                    background: theme === 'light' ? '#f8f9fa' : 'var(--card-bg)',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => editor.undo()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: theme === 'light' ? '#1a1a1a' : 'var(--foreground)',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        onClick={() => editor.redo()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: theme === 'light' ? '#1a1a1a' : 'var(--foreground)',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo size={16} />
                    </button>
                    <div style={{ width: '1px', height: '16px', background: 'var(--card-border)', margin: '0 4px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Editor Controls</span>
                </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
                <BlockNoteView
                    editor={editor}
                    onChange={handleChange}
                    theme={theme}
                    editable={editable}
                    slashMenu={false}
                >
                    <SuggestionMenuController
                        triggerCharacter={"/"}
                        getItems={async (query) =>
                            filterSuggestionItems(
                                getCustomSlashMenuItems(editor),
                                query
                            )
                        }
                    />
                </BlockNoteView>
            </div>
        </div>
    );
}
