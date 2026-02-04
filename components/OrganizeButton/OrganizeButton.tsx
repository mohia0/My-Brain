"use client";

import React from 'react';
import styles from './OrganizeButton.module.css';
import { Sparkles } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';

export default function OrganizeButton() {
    const { layoutAllItems } = useItemsStore();

    return (
        <button
            className={styles.button}
            onClick={layoutAllItems}
            data-tooltip="Organize"
        >
            <Sparkles size={20} />
        </button>
    );
}
