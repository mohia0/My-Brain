"use client";

import React from 'react';
import styles from './OrganizeButton.module.css';
import { Sparkles } from 'lucide-react';
import { useItemsStore } from '@/lib/store/itemsStore';

export default function OrganizeButton() {
    const { layoutAllItems, layoutSelectedItems, selectedIds } = useItemsStore();

    const handleClick = () => {
        if (selectedIds.length > 0) {
            layoutSelectedItems();
        } else {
            layoutAllItems();
        }
    };

    return (
        <button
            className={styles.button}
            onClick={handleClick}
            data-tooltip={selectedIds.length > 0 ? "Organize Selection" : "Organize All"}
        >
            <Sparkles size={20} />
        </button>
    );
}
