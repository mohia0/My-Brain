"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block } from "@blocknote/core";
import { useEffect, useState } from "react";
import { Undo, Redo } from "lucide-react";

interface BlockEditorProps {
    initialContent?: string; // JSON string or plain text
    onChange: (content: string) => void;
    editable?: boolean;
}

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

    // Try to parse initial content as JSON blocks, if fail, create a paragraph block with text
    const getInitialBlocks = (): Block[] | undefined => {
        if (!initialContent) return undefined;
        try {
            const parsed = JSON.parse(initialContent);
            if (Array.isArray(parsed)) return parsed;
            return undefined;
        } catch (e) {
            // Not JSON, assume plain text. Convert to a block.
            return [
                {
                    id: "initial-block",
                    type: "paragraph",
                    content: initialContent,
                } as any // Cast to any to avoid strict typing issues on dynamic creation if needed
            ];
        }
    };

    const editor = useCreateBlockNote({
        initialContent: getInitialBlocks(),
    });

    const handleChange = () => {
        const json = JSON.stringify(editor.document);
        onChange(json);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {editable && (
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => editor.undo()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--foreground)',
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
                            color: 'var(--foreground)',
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
                />
            </div>
        </div>
    );
}
