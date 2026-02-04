import { Inbox as InboxIcon } from 'lucide-react';
import styles from './Inbox.module.css';
import { useItemsStore } from '@/lib/store/itemsStore';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import InboxItem from './InboxItem';

interface InboxProps {
    onItemClick?: (id: string) => void;
}

export default function Inbox({ onItemClick }: InboxProps) {
    const { items } = useItemsStore();
    const inboxItems = items.filter(i => i.status === 'inbox');

    const { setNodeRef, isOver } = useDroppable({
        id: 'inbox-area',
        data: { type: 'inbox-drop-zone' }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(styles.inboxWrapper, isOver && styles.isOver)}
        >
            <div className={styles.header}>
                <InboxIcon size={20} />
                <span>Inbox ({inboxItems.length})</span>
            </div>
            <div className={styles.content}>
                {inboxItems.length === 0 ? (
                    <div className={styles.emptyState}>
                        {isOver ? "Drop to Move to Inbox" : "No items"}
                    </div>
                ) : (
                    inboxItems.map(item => (
                        <InboxItem
                            key={item.id}
                            item={item}
                            onClick={() => onItemClick?.(item.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
