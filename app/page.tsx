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
import ArchiveZone from "@/components/ArchiveZone/ArchiveZone";
import ArchiveView from "@/components/ArchiveView/ArchiveView";


import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";


export default function Home() {
  const { items, folders, fetchData, subscribeToChanges, clearSelection, loading: dataLoading } = useItemsStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);

        if (initialSession) {
          // Fire and wait for data
          await fetchData(initialSession.user);
          unsubscribe = subscribeToChanges();
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setInitializing(false);
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

  // Only show items and folders that are NOT nested (root level) and NOT archived
  const visibleItems = items.filter(item => !item.folder_id && item.status !== 'inbox' && item.status !== 'archived');
  const visibleFolders = folders.filter(folder => !folder.parent_id && folder.status !== 'archived');

  if (initializing || (session && dataLoading)) {
    return <LoadingScreen />;
  }

  return (
    <DragWrapper>
      <main className="fade-in">
        {!session && <AuthModal onLogin={() => fetchData()} />}
        <Header />
        <AccountMenu />
        <Canvas>
          {visibleFolders.map(folder => (
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
        <FloatingBar />
        <ArchiveZone />
        <ArchiveView />

        {selectedItemId && (
          <ItemModal
            itemId={selectedItemId}
            onClose={() => {
              setSelectedItemId(null);
              clearSelection();
            }}
          />
        )}
        {selectedFolderId && (
          <FolderModal
            folderId={selectedFolderId}
            onClose={() => {
              setSelectedFolderId(null);
              clearSelection();
            }}
            onItemClick={(id) => setSelectedItemId(id)}
          />
        )}
      </main>
    </DragWrapper>
  );
}
