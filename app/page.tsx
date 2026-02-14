"use client";

import Canvas from "@/components/Canvas/Canvas";
import { RoomBackButton } from "@/components/Canvas/RoomPortal";

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
import ProjectArea from "@/components/ProjectArea/ProjectArea";

import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import MobilePageContent from "@/components/Mobile/MobilePageContent";
import { useCanvasStore } from "@/lib/store/canvasStore";
import VaultAuthModal, { useVaultStore } from "@/components/Vault/VaultAuthModal";

export default function Home() {
  const { items, folders, fetchData, subscribeToChanges, clearSelection, currentRoomId } = useItemsStore();
  const { openFolderId, setOpenFolderId } = useCanvasStore();
  const { isModalOpen, setModalOpen, checkVaultStatus } = useVaultStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    checkVaultStatus();
  }, []);

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
    const MIN_LOADING_TIME = 500;

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

    const handleFocus = () => {
      if (!isInitializingRef.current && !showLoadingRef.current) {
        fetchData();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      if (unsubscribeRef.current) unsubscribeRef.current();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!session && !showLoading && !initializing) {
      setShouldShowAuth(true);
    }
  }, [session, showLoading, initializing]);

  const _hasHydrated = useVaultStore(state => state._hasHydrated);

  useEffect(() => {
    if (session && !isInitializingRef.current && _hasHydrated) {
      fetchData();
    }
  }, [currentRoomId, session, fetchData, _hasHydrated]);

  useEffect(() => {
    const checkMobile = () => {
      // 1. Force override via URL (debugging)
      const params = new URLSearchParams(window.location.search);
      const viewOverride = params.get('view');
      if (viewOverride === 'desktop') { setIsMobile(false); return; }
      if (viewOverride === 'mobile') { setIsMobile(true); return; }

      // 2. Check for Capacitor (Native App) - Primary Check
      // We check for the Capacitor global or specific native flag
      const isCapacitor = (
        typeof window !== 'undefined' &&
        ((window as any).Capacitor?.isNativePlatform() || (window as any).Capacitor?.isNative)
      );

      if (isCapacitor) {
        setIsMobile(true);
        return;
      }

      // 3. Fallback to screen size
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // View Sync Logic
  useEffect(() => {
    if (session?.user?.user_metadata?.canvas_view && !isMobile) {
      const { scale, x, y, isMinimapCollapsed } = session.user.user_metadata.canvas_view;
      useCanvasStore.getState().restoreView(scale, { x, y });
      if (isMinimapCollapsed !== undefined) {
        useCanvasStore.getState().setIsMinimapCollapsed(isMinimapCollapsed);
      }
    }
  }, [session, isMobile]);

  useEffect(() => {
    if (!session || isMobile) return;

    let timer: NodeJS.Timeout;
    const unsubscribe = useCanvasStore.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            canvas_view: {
              scale: state.scale,
              x: state.position.x,
              y: state.position.y,
              isMinimapCollapsed: state.isMinimapCollapsed
            }
          }
        });
      }, 3000);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [session, isMobile]);

  const visibleItems = items.filter(item =>
    (item.room_id || null) === currentRoomId &&
    !item.folder_id &&
    item.status !== 'inbox' &&
    item.status !== 'archived' &&
    item.type !== 'project'
  );

  const projectAreas = items.filter(item =>
    (item.room_id || null) === currentRoomId &&
    item.type === 'project' &&
    item.status !== 'archived'
  );

  const visibleFolders = folders.filter(folder =>
    (folder.room_id || null) === currentRoomId &&
    !folder.parent_id &&
    folder.status !== 'archived'
  );

  const lockedProjectAreas = projectAreas.filter(p => p.metadata?.locked);

  const isInsideLockedArea = (x: number, y: number, w: number, h: number) => {
    if (lockedProjectAreas.length === 0) return false;
    const cx = x + w / 2;
    const cy = y + h / 2;

    for (const area of lockedProjectAreas) {
      const areaW = area.metadata?.width || 300;
      const areaH = area.metadata?.height || 200;
      if (
        cx >= area.position_x &&
        cx <= area.position_x + areaW &&
        cy >= area.position_y &&
        cy <= area.position_y + areaH
      ) {
        return true;
      }
    }
    return false;
  };

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
                  'desktop-version w-screen h-screen overflow-hidden',
                  isFading ? 'fade-in' : 'opacity-100'
                )}>
                  <Header />
                  <AccountMenu />
                  <Inbox />
                  <Canvas>

                    {projectAreas.map(area => (
                      <ProjectArea key={area.id} item={area} />
                    ))}
                    {visibleFolders.map(folder => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        onClick={() => setOpenFolderId(folder.id)}
                        isLocked={isInsideLockedArea(folder.position_x, folder.position_y, 200, 100)}
                      />
                    ))}
                    {visibleItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onClick={item.type === 'room' ? undefined : () => {
                          const isRevealedLocal = useItemsStore.getState().vaultedItemsRevealed.includes(item.id);
                          const isUnlockedGlobal = !useVaultStore.getState().isVaultLocked;
                          const isUnlockedIndividual = useVaultStore.getState().unlockedIds.includes(item.id);
                          const isObscured = item.is_vaulted && !isRevealedLocal && !isUnlockedGlobal && !isUnlockedIndividual;

                          if (!isObscured) {
                            setSelectedItemId(item.id);
                          }
                        }}
                        isLocked={isInsideLockedArea(item.position_x, item.position_y, item.metadata?.width || 280, item.metadata?.height || (item.type === 'room' ? 280 : 120))}
                      />
                    ))}
                    <RoomBackButton />
                  </Canvas>
                  <MiniMap />
                  <Toolbar />
                  <ZoomWheel />
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
                  {openFolderId && (
                    <FolderModal
                      folderId={openFolderId}
                      onClose={() => {
                        setOpenFolderId(null);
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

      {isModalOpen && (
        <VaultAuthModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => setModalOpen(false)}
        />
      )}
    </DragWrapper>
  );
}
