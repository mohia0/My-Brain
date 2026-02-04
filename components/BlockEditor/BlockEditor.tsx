"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block } from "@blocknote/core";
import { useEffect, useState } from "react";

interface BlockEditorProps {
    initialContent?: string; // JSON string or plain text
    onChange: (content: string) => void;
    editable?: boolean;
}

export default function BlockEditor({ initialContent, onChange, editable = true }: BlockEditorProps) {
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
        <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 20 }}>
            <BlockNoteView
                editor={editor}
                onChange={handleChange}
                theme={"dark"}
            />
        </div>
    );
}
