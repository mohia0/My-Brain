"use client";

import Canvas from "@/components/Canvas/Canvas";
import Inbox from "@/components/Inbox/Inbox";
import DragWrapper from "@/components/DragWrapper";
import ItemCard from "@/components/Grid/ItemCard";
import ItemModal from "@/components/ItemModal/ItemModal";
import { useItemsStore } from "@/lib/store/itemsStore";
import { useState } from "react";
import MiniMap from "@/components/MiniMap/MiniMap";
import Header from "@/components/Header/Header";
import AddButton from "@/components/AddButton/AddButton";
import FolderItem from "@/components/Grid/FolderItem";
import FloatingBar from "@/components/FloatingBar/FloatingBar";
import FolderModal from "@/components/FolderModal/FolderModal";
import AccountMenu from "@/components/AccountMenu/AccountMenu";
import AuthModal from "@/components/AuthModal/AuthModal";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

import Toolbar from "@/components/Toolbar/Toolbar";
import ZoomWheel from "@/components/ZoomWheel/ZoomWheel";

export default function Home() {
  const { items, folders, fetchData, subscribeToChanges } = useItemsStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        fetchData();
        unsubscribe = subscribeToChanges();
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData();
        if (unsubscribe) unsubscribe();
        unsubscribe = subscribeToChanges();
      } else {
        if (unsubscribe) unsubscribe();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData, subscribeToChanges]);

  // Only show items that are NOT in a folder AND NOT in inbox
  const visibleItems = items.filter(item => !item.folder_id && item.status !== 'inbox');

  return (
    <DragWrapper>
      <main>
        {!session && <AuthModal onLogin={() => fetchData()} />}
        <Header />
        <AccountMenu />
        <Canvas>
          {folders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              onClick={() => setSelectedFolderId(folder.id)}
            />
          ))}
          {visibleItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItemId(item.id)}
            />
          ))}
        </Canvas>
        <MiniMap />
        <Toolbar />
        <ZoomWheel />
        <Inbox onItemClick={setSelectedItemId} />
        <AddButton />
        <FloatingBar />
        {selectedItemId && (
          <ItemModal
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
          />
        )}
        {selectedFolderId && (
          <FolderModal
            folderId={selectedFolderId}
            onClose={() => setSelectedFolderId(null)}
            onItemClick={(id) => setSelectedItemId(id)}
          />
        )}
      </main>
    </DragWrapper>
  );
}
