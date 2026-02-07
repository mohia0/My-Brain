"use client";

import Canvas from "@/components/Canvas/Canvas";
import Inbox from "@/components/Inbox/Inbox";
import DragWrapper from "@/components/DragWrapper";
import ItemCard from "@/components/Grid/ItemCard";
import ItemModal from "@/components/ItemModal/ItemModal";
import { useItemsStore } from "@/lib/store/itemsStore";
import { useState, useEffect, useRef } from "react";
import clsx from 'clsx';
import MiniMap from "@/components/MiniMap/MiniMap";
import Header from "@/components/Header/Header";
import AccountMenu from "@/components/AccountMenu/AccountMenu";
import AuthModal from "@/components/AuthModal/AuthModal";
import { supabase } from "@/lib/supabase";

import Toolbar from "@/components/Toolbar/Toolbar";
import ZoomWheel from "@/components/ZoomWheel/ZoomWheel";
import ArchiveZone from "@/components/ArchiveZone/ArchiveZone";
import ArchiveView from "@/components/ArchiveView/ArchiveView";
import FloatingBar from "@/components/FloatingBar/FloatingBar";
import FolderItem from "@/components/Grid/FolderItem";
import FolderModal from "@/components/FolderModal/FolderModal";

import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import MobilePageContent from "@/components/Mobile/MobilePageContent";

export default function Home() {
  const { items, folders, fetchData, subscribeToChanges, clearSelection } = useItemsStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [shouldShowAuth, setShouldShowAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isInitializingRef = useRef(true);
  const showLoadingRef = useRef(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const runInit = async () => {
    const MIN_LOADING_TIME = 1500;

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
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeRef.current = subscribeToChanges();
        });
      }

      await Promise.all([timerPromise, dataPromise]);

      // Start fade sequence
      setIsFading(true);
      setTimeout(() => {
        setShowLoading(false);
        showLoadingRef.current = false;
        setInitializing(false);
        isInitializingRef.current = false;
        setIsFading(false);
      }, 800);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Initialization error:", err);
      setInitializing(false);
      setShowLoading(false);
      setIsFading(false);
    }
  };

  useEffect(() => {
    runInit();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session && !showLoadingRef.current && !isInitializingRef.current) {
        fetchData();
        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = subscribeToChanges();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  useEffect(() => {
    if (!session && !showLoading && !initializing) {
      setShouldShowAuth(true);
    }
  }, [session, showLoading, initializing]);

  useEffect(() => {
    const checkMobile = () => {
      const params = new URLSearchParams(window.location.search);
      const viewOverride = params.get('view');

      if (viewOverride === 'desktop') {
        setIsMobile(false);
        console.log("[Platform] Forced Desktop view via URL.");
        return;
      }
      if (viewOverride === 'mobile') {
        setIsMobile(true);
        console.log("[Platform] Forced Mobile view via URL.");
        return;
      }

      // Default to Mobile for easier Android Studio sync.
      setIsMobile(true);
      console.log("[Platform] Defaulting to Mobile view. Use ?view=desktop for Canvas.");
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const visibleItems = items.filter(item => !item.folder_id && item.status !== 'inbox' && item.status !== 'archived');
  const visibleFolders = folders.filter(folder => !folder.parent_id && folder.status !== 'archived');

  return (
    <DragWrapper>
      {/* Loading Screen: Only visible during initial load OR fading out */}
      {(showLoading || isFading) && <LoadingScreen isFading={isFading} />}

      {/* Main Content: Rendered when loading is finished OR currently fading in */}
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
                <main className={clsx(
                  'desktop-version',
                  isFading ? 'fade-in' : 'opacity-100'
                )}>
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
