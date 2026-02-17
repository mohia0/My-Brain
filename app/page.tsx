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
  const { items, folders, fetchData, subscribeToChanges, clearSelection, currentRoomId, hasLoadedOnce } = useItemsStore();
  const { openFolderId, setOpenFolderId } = useCanvasStore();
  const { isModalOpen, setModalOpen, checkVaultStatus } = useVaultStore();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    checkVaultStatus();
  }, []);

  // Synchronous check for share intent to prevent first-render flashes
  const checkShareIntentSync = () => {
    if (typeof window === 'undefined') return false;
    const url = window.location.search;
    return url.includes('title=') || url.includes('text=') || url.includes('url=');
  };

  const isShareMode = checkShareIntentSync();
  const shouldSkipLoad = isShareMode || hasLoadedOnce;

  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(!shouldSkipLoad);
  const [showLoading, setShowLoading] = useState(!shouldSkipLoad);
  const [isFading, setIsFading] = useState(false);
  const [shouldShowAuth, setShouldShowAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isInitializingRef = useRef(!shouldSkipLoad);
  const showLoadingRef = useRef(!shouldSkipLoad);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const runInit = async () => {
    const MIN_LOADING_TIME = 800; // Increased to ensure smooth visual

    // Check for 'isAuthenticating' flag OR hash/search parameters
    const checkRedirect = () => {
      if (typeof window === 'undefined') return false;

      const isAuthenticating = localStorage.getItem('isAuthenticating') === 'true';
      const hash = window.location.hash;
      const search = window.location.search;

      const hasAuthParams = hash.includes('access_token') ||
        hash.includes('type=recovery') ||
        hash.includes('error_description') ||
        search.includes('code=');

      if (isAuthenticating || hasAuthParams) {
        console.log("Auth redirect or authenticating state detected, waiting for session...");

        // Clear the flag after a delay to prevent getting stuck if auth fails
        setTimeout(() => {
          if (isInitializingRef.current) {
            console.log("Auth timeout reached, verifying state.");
            localStorage.removeItem('isAuthenticating');

            // Re-check session one last time
            supabase.auth.getSession().then((result: any) => {
              if (!result.data.session) {
                setInitializing(false);
                setShowLoading(false);
              }
            });
          }
        }, 10000); // 10 seconds timeout for full auth flow
        return true;
      }
      return false;
    }

    if (checkRedirect()) return;

    if (!shouldSkipLoad) {
      setInitializing(true);
      isInitializingRef.current = true;
      setShowLoading(true);
      showLoadingRef.current = true;
    }
    setIsFading(false);

    const checkMobileWidth = () => {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'desktop') return false;
      if (params.get('view') === 'mobile') return true;
      const isCapacitor = ((window as any).Capacitor?.isNativePlatform() || (window as any).Capacitor?.isNative);
      return isCapacitor || window.innerWidth <= 768;
    };

    const isCurrentlyMobile = checkMobileWidth();

    try {
      if (shouldSkipLoad) {
        setShowLoading(false);
        showLoadingRef.current = false;
        setInitializing(false);
        isInitializingRef.current = false;
      }

      const timerPromise = new Promise(resolve => setTimeout(resolve, shouldSkipLoad ? 0 : MIN_LOADING_TIME));
      const { data, error } = await supabase.auth.getSession();
      const initialSession = data?.session;

      if (error) {
        console.warn("Session check error (clearing invalid session):", error.message);
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(initialSession);
      }

      let dataPromise = Promise.resolve();
      if (initialSession) {
        // View restoration logic integrated here
        if (initialSession.user?.user_metadata?.canvas_view && !isCurrentlyMobile) {
          const { scale, x, y, isMinimapCollapsed } = initialSession.user.user_metadata.canvas_view;
          useCanvasStore.getState().restoreView(scale, { x, y });
          if (isMinimapCollapsed !== undefined) {
            useCanvasStore.getState().setIsMinimapCollapsed(isMinimapCollapsed);
          }
        } else {
          useCanvasStore.getState().setViewRestored(true);
        }

        dataPromise = fetchData(initialSession.user).then(() => {
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeRef.current = subscribeToChanges();
        });
      } else {
        useCanvasStore.getState().setViewRestored(true);
      }

      await Promise.all([timerPromise, dataPromise]);

      // Double check if data is actually loaded (items/folders might be empty, that's fine, but fetchData should have finished)
      // The loading state in itemsStore will be false now due to await dataPromise

      // Start fade sequence
      const fadeTime = shouldSkipLoad ? 0 : 800;
      if (fadeTime > 0) setIsFading(true);

      setTimeout(() => {
        setShowLoading(false);
        showLoadingRef.current = false;
        setInitializing(false);
        isInitializingRef.current = false;
        setIsFading(false);
      }, fadeTime);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Initialization error:", err);
      // Ensure we don't get stuck
      useCanvasStore.getState().setViewRestored(true);
      setInitializing(false);
      setShowLoading(false);
      setIsFading(false);
    }
  };

  useEffect(() => {
    runInit();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) localStorage.removeItem('isAuthenticating');

      // If we already finished loading but session changed (e.g. login/logout), refresh data
      if (session && !showLoadingRef.current && !isInitializingRef.current) {
        fetchData(session.user);
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
    } else if (session) {
      setShouldShowAuth(false);
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
    // This effect handles updates when session changes but loading screen is ALREADY gone
    if (session?.user?.user_metadata?.canvas_view && !isMobile && !showLoading) {
      const { scale, x, y, isMinimapCollapsed } = session.user.user_metadata.canvas_view;
      useCanvasStore.getState().restoreView(scale, { x, y });
      if (isMinimapCollapsed !== undefined) {
        useCanvasStore.getState().setIsMinimapCollapsed(isMinimapCollapsed);
      }
    }
  }, [session, isMobile, showLoading]);

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
