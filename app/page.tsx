"use client";

import Canvas from "@/components/Canvas/Canvas";
import Inbox from "@/components/Inbox/Inbox";
import DragWrapper from "@/components/DragWrapper";
import ItemCard from "@/components/Grid/ItemCard";
import ItemModal from "@/components/ItemModal/ItemModal";
import { useItemsStore } from "@/lib/store/itemsStore";
import { useState, useEffect, useRef } from "react";
import MiniMap from "@/components/MiniMap/MiniMap";
import Header from "@/components/Header/Header";
import AddButton from "@/components/AddButton/AddButton";
import FolderItem from "@/components/Grid/FolderItem";
import FloatingBar from "@/components/FloatingBar/FloatingBar";
import FolderModal from "@/components/FolderModal/FolderModal";
import AccountMenu from "@/components/AccountMenu/AccountMenu";
import AuthModal from "@/components/AuthModal/AuthModal";
import { supabase } from "@/lib/supabase";

import Toolbar from "@/components/Toolbar/Toolbar";
import ZoomWheel from "@/components/ZoomWheel/ZoomWheel";
import ArchiveZone from "@/components/ArchiveZone/ArchiveZone";
import ArchiveView from "@/components/ArchiveView/ArchiveView";


import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import MobilePageContent from "@/components/Mobile/MobilePageContent";


export default function Home() {
  const { items, folders, fetchData, subscribeToChanges, clearSelection, loading: dataLoading } = useItemsStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [shouldShowAuth, setShouldShowAuth] = useState(false);

  // Refs to avoid closure staleness in auth listener
  const isInitializingRef = useRef(true);
  const showLoadingRef = useRef(true);

  const runInit = async () => {
    let unsubscribe: (() => void) | undefined;
    const MIN_LOADING_TIME = 3500;

    setInitializing(true);
    isInitializingRef.current = true;
    setShowLoading(true);
    showLoadingRef.current = true;
    setIsFading(false);

    try {
      const timerPromise = new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME));

      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);

      let dataPromise = Promise.resolve();
      if (initialSession) {
        dataPromise = fetchData(initialSession.user).then(() => {
          unsubscribe = subscribeToChanges();
        });
      }

      await Promise.all([timerPromise, dataPromise]);

      setIsFading(true);
      setTimeout(() => {
        setShowLoading(false);
        showLoadingRef.current = false;
        setInitializing(false);
        isInitializingRef.current = false;
      }, 800);

    } catch (err) {
      console.error("Initialization error:", err);
      setInitializing(false);
      isInitializingRef.current = false;
      setShowLoading(false);
      showLoadingRef.current = false;
    }
    return unsubscribe;
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    runInit().then(unsub => {
      unsubscribe = unsub;
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session && !showLoadingRef.current && !isInitializingRef.current) {
        fetchData();
        if (unsubscribe) unsubscribe();
        unsubscribe = subscribeToChanges();
      } else if (!session) {
        if (unsubscribe) unsubscribe();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, [fetchData, subscribeToChanges]);

  useEffect(() => {
    if (!session && !showLoading && !initializing) {
      setShouldShowAuth(true);
    }
  }, [session, showLoading, initializing]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileSize = window.innerWidth <= 768;
      const isCapacitor = (window as any).Capacitor !== undefined;
      setIsMobile(isMobileSize || isCapacitor);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Only show items and folders that are NOT nested (root level) and NOT archived
  const visibleItems = items.filter(item => !item.folder_id && item.status !== 'inbox' && item.status !== 'archived');
  const visibleFolders = folders.filter(folder => !folder.parent_id && folder.status !== 'archived');

  return (
    <DragWrapper>
      {(showLoading || isFading) && <LoadingScreen isFading={isFading} />}

      {(!showLoading || isFading) && (
        <>
          {(!session || shouldShowAuth) ? (
            <AuthModal onLogin={() => {
              setShouldShowAuth(false);
              runInit();
            }} />
          ) : (
            <>
              {isMobile ? (
                <MobilePageContent session={session} />
              ) : (
                <main className={`fade-in ${(isFading || showLoading) ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500 ${isFading && showLoading ? 'pointer-events-none' : ''}`}>
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
              )}
            </>
          )}
        </>
      )}
    </DragWrapper>
  );
}
