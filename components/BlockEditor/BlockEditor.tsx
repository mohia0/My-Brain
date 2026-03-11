"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView, darkDefaultTheme, lightDefaultTheme } from "@blocknote/mantine";
import { Block, BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
    getDefaultReactSlashMenuItems,
    SuggestionMenuController,
    SideMenuController,
    LinkToolbarController,
    LinkToolbar,
    createReactInlineContentSpec
} from "@blocknote/react";
import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";
import { useEffect, useState, useMemo, useRef } from "react";
import { Undo, Redo } from "lucide-react";
import { toast } from "sonner";

interface BlockEditorProps {
    initialContent?: string; // JSON string or plain text
    onChange: (content: string) => void;
    editable?: boolean;
}

// Function to handle file uploads (Images)
const uploadFile = async (file: File) => {
    // Limit to 3MB
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        toast.error("File too large", {
            description: "Maximum size allowed is 3MB.",
            duration: 4000,
        });
        return "";
    }

    // For now, we use a simple base64 conversion. 
    // In production, you'd upload this to Supabase Storage or S3.
    return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
    });
};

// Custom Slash Menu Item Filtering
const getCustomSlashMenuItems = (editor: any) => {
    const items = getDefaultReactSlashMenuItems(editor);

    // Filter out unwanted media items (Video, Audio, File)
    // We keep "Image" and other basic blocks
    // We do NOT reorder items to avoid breaking Group keys (e.g. splitting "Basic blocks" group)
    return items.filter(item =>
        !["Video", "Audio", "File"].includes(item.title)
    );
};

// Custom Mention Inline Content
const Mention = createReactInlineContentSpec(
    {
        type: "mention",
        propSchema: {
            id: { default: "unknown" },
            title: { default: "Card" },
        },
        content: "none",
    },
    {
        render: (props) => (
            <span
                contentEditable={false}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "var(--accent-faint, rgba(120, 120, 120, 0.15))",
                    color: "var(--accent, inherit)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "0.95em",
                    cursor: "pointer",
                    verticalAlign: "baseline",
                    userSelect: "none",
                }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.dispatchEvent(
                        new CustomEvent("openItem", { detail: { id: props.inlineContent.props.id } })
                    );
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent, #666)";
                    e.currentTarget.style.color = "var(--background, #fff)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--accent-faint, rgba(120, 120, 120, 0.15))";
                    e.currentTarget.style.color = "var(--accent, inherit)";
                }}
            >
                {props.inlineContent.props.title}
            </span>
        ),
    }
);

const schema = BlockNoteSchema.create({
    inlineContentSpecs: {
        ...defaultInlineContentSpecs,
        mention: Mention,
    },
});

export default function BlockEditor({ initialContent, onChange, editable = true }: BlockEditorProps) {
    const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        // Initial theme check
        const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark';
        setColorScheme(currentTheme);

        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    const newTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'dark';
                    setColorScheme(newTheme);
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => observer.disconnect();
    }, []);

    const customBlockNoteTheme = useMemo(() => {
        const base = colorScheme === 'dark' ? darkDefaultTheme : lightDefaultTheme;
        return {
            ...base,
            colors: {
                ...base.colors,
                editor: {
                    text: colorScheme === 'dark' ? "#ededed" : "#1a1a1a",
                    background: "transparent",
                },
            }
        };
    }, [colorScheme]);

    // Try to parse initial content as JSON blocks
    const getInitialBlocks = (): Block[] | undefined => {
        if (!initialContent) return undefined;
        try {
            const parsed = JSON.parse(initialContent);
            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object' && parsed !== null) return [parsed as Block];
            return undefined;
        } catch (e) {
            // Fallback for plain text
            return [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: initialContent, styles: {} }],
                } as any
            ];
        }
    };

    const editor = useCreateBlockNote({
        schema,
        initialContent: getInitialBlocks(),
        uploadFile, // Enable image uploads
    });

    const lastPushedContent = useRef<string>(initialContent || "");

    const handleChange = () => {
        const json = JSON.stringify(editor.document);
        if (json !== lastPushedContent.current) {
            lastPushedContent.current = json;
            onChange(json);
        }
    };

    // Keep editor in sync if initialContent changes externally, but avoid loops
    useEffect(() => {
        if (initialContent === undefined || initialContent === lastPushedContent.current) return;

        const currentJson = JSON.stringify(editor.document);
        if (initialContent !== currentJson) {
            const blocks = getInitialBlocks();
            if (blocks) {
                // Use a non-destructive update if possible, but replaceBlocks is standard for major changes
                editor.replaceBlocks(editor.document, blocks);
                lastPushedContent.current = initialContent;
            }
        }
    }, [initialContent, editor]);

    // CSS-only solution is safer for performance
    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'transparent',
            borderRadius: 'inherit',
            position: 'relative',
            userSelect: 'text'
        }}
            onCopy={(e) => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;

                // If selection is within our editor
                if (e.currentTarget.contains(selection.anchorNode)) {
                    e.preventDefault();
                    // Use standard browser text selection to get WYSIWYG plain text
                    // This avoids BlockNote's markdown serialization (which adds \ escapes and <> links)
                    const text = selection.toString();
                    e.clipboardData.setData('text/plain', text);
                }
            }}
        >
            <div className="editor-container" style={{ flex: 1, overflowY: 'auto', paddingBottom: 40, paddingTop: 10 }}
                 onClickCapture={(e) => {
                     const target = e.target as HTMLElement;
                     const a = target.closest('a');
                     if (a) {
                         const href = a.getAttribute('href');
                         if (href && href.startsWith('brainia://item/')) {
                             e.preventDefault();
                             e.stopPropagation();
                             const itemId = href.replace('brainia://item/', '');
                             window.dispatchEvent(new CustomEvent('openItem', { detail: { id: itemId } }));
                         }
                     }
                 }}
            >
                <BlockNoteView
                    editor={editor}
                    onChange={handleChange}
                    theme={customBlockNoteTheme as any}
                    editable={editable}
                    slashMenu={false}
                    className="brainia-editor"
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
                    <SuggestionMenuController
                        triggerCharacter={"@"}
                        floatingUIOptions={{ useFloatingOptions: { strategy: 'fixed' } }}
                        getItems={async (query) => {
                            // Using a dynamic import or accessing window/store directly to avoid circular deps if any
                            const { useItemsStore } = await import('@/lib/store/itemsStore');
                            const items = useItemsStore.getState().items;
                            const filtered = items.filter((item: any) => {
                                const title = item.metadata?.title || item.content || "Untitled";
                                return title.toLowerCase().includes(query.toLowerCase());
                            }).slice(0, 10);

                            return filtered.map((item: any) => {
                                const fullTitle = item.metadata?.title || "Untitled Card";
                                const isLong = fullTitle.length > 35;
                                const displayTitle = isLong ? fullTitle.substring(0, 35) + "..." : fullTitle;

                                return {
                                    title: displayTitle,
                                    id: item.id,
                                    onItemClick: () => {
                                        editor.insertInlineContent([
                                            {
                                                type: "mention",
                                                props: {
                                                    id: item.id,
                                                    title: displayTitle,
                                                }
                                            },
                                            {
                                                type: "text",
                                                text: " ",
                                                styles: {}
                                            }
                                        ]);
                                    }
                                };
                            });
                        }}
                    />
                    <SideMenuController />
                </BlockNoteView>
                <style jsx global>{`

                    /* Smart RTL detection using standard unicode-bidi */
                    .brainia-editor .bn-editor .bn-block-content .bn-inline-content {
                        unicode-bidi: plaintext;
                        text-align: start;
                    }
                    
                    /* Ensure placeholders align correctly */
                    .brainia-editor .bn-editor [data-placeholder]:empty:before {
                        text-align: inherit;
                    }

                    .editor-container {
                        padding-left: clamp(24px, 3vw, 36px);
                        padding-right: clamp(12px, 2vw, 24px);
                    }
                    /* Maximize line width on mobile specifically but keep room for handles */
                    @media (max-width: 768px) {
                        .editor-container {
                            padding-left: 5px;
                            padding-right: 5px;
                        }

                        .brainia-editor .bn-editor .bn-block-content {
                            padding-left: 0px !important;
                            padding-right: 0px !important;
                        }
                        
                        /* Force Side Menu handles to appear more reliably on mobile */
                        .brainia-editor .bn-side-menu {
                            display: flex !important;
                            opacity: 1 !important;
                            visibility: visible !important;
                            margin-left: -10px !important;
                            z-index: 1000 !important;
                            transform: scale(0.85) !important;
                            transform-origin: center left !important;
                        }
                    }
                `}</style>
            </div>

            {editable && (
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    padding: '2px',
                    background: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(20, 20, 20, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    alignItems: 'center',
                    zIndex: 100,
                    opacity: 0.4,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.background = colorScheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 30, 30, 0.8)';
                        e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.4';
                        e.currentTarget.style.background = colorScheme === 'light' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(20, 20, 20, 0.4)';
                        e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
                    }}
                >
                    <button
                        onClick={() => editor.undo()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: colorScheme === 'light' ? '#1a1a1a' : 'var(--foreground)',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: 0.7
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.opacity = '0.7';
                        }}
                        data-tooltip="Undo (Ctrl+Z)"
                    >
                        <Undo size={14} />
                    </button>
                    <div style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />
                    <button
                        onClick={() => editor.redo()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: colorScheme === 'light' ? '#1a1a1a' : 'var(--foreground)',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: 0.7
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.opacity = '0.7';
                        }}
                        data-tooltip="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
