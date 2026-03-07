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
import { AnimatePresence, motion } from 'framer-motion';
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
import { MonitorSmartphone } from 'lucide-react';
import ProjectArea from "@/components/ProjectArea/ProjectArea";

import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import MobilePageContent from "@/components/Mobile/MobilePageContent";
import { useCanvasStore } from "@/lib/store/canvasStore";
import VaultAuthModal, { useVaultStore } from "@/components/Vault/VaultAuthModal";

export default function Home() {
  const { items, folders, fetchData, subscribeToChanges, clearSelection, currentRoomId, hasLoadedOnce, session, setSession, isSharing } = useItemsStore();
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
  const shouldSkipLoad = isShareMode || hasLoadedOnce || items.length > 0 || folders.length > 0;

  // Synchronous check to prevent first-render flash
  const [initializing, setInitializing] = useState(() => {
    if (typeof window === 'undefined') return true;
    const isShare = window.location.search.includes('title=') || window.location.search.includes('text=') || window.location.search.includes('url=');
    if (isShare) return false;
    const state = useItemsStore.getState();
    return !(state.hasLoadedOnce || state.items.length > 0 || state.folders.length > 0);
  });

  const [showLoading, setShowLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const isShare = window.location.search.includes('title=') || window.location.search.includes('text=') || window.location.search.includes('url=');
    if (isShare) return false;
    const state = useItemsStore.getState();
    return !(state.hasLoadedOnce || state.items.length > 0 || state.folders.length > 0);
  });

  const [isFading, setIsFading] = useState(false);
  const [shouldShowAuth, setShouldShowAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallScreenWeb, setIsSmallScreenWeb] = useState(false);
  const [isAuthExiting, setIsAuthExiting] = useState(false);

  const isInitializingRef = useRef(initializing);
  const showLoadingRef = useRef(showLoading);
  const isRunningInitRef = useRef(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const runInit = async () => {
    if (isRunningInitRef.current) return;
    isRunningInitRef.current = true;

    try {
      const MIN_LOADING_TIME = 800; // Increased to ensure smooth visual

      // Check for 'isAuthenticating' flag OR hash/search parameters
      const checkRedirect = () => {
        if (typeof window === 'undefined') return false;

        // If we already have a session, we don't need to stay in redirect state
        const currentSession = useItemsStore.getState().session;
        if (currentSession) return false;

        const isAuthenticating = localStorage.getItem('isAuthenticating') === 'true';
        const hash = window.location.hash;
        const search = window.location.search;

        const hasAuthParams = hash.includes('access_token') ||
          hash.includes('type=recovery') ||
          hash.includes('error_description') ||
          search.includes('code=');

        if (isAuthenticating || hasAuthParams) {
          console.log("Auth redirect or authenticating state detected, showing loader...");

          // Show loader immediately
          if (!showLoadingRef.current) {
            setShowLoading(true);
            showLoadingRef.current = true;
            setInitializing(true);
            isInitializingRef.current = true;
          }

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
                  showLoadingRef.current = false;
                  isInitializingRef.current = false;
                }
              }).catch(() => { });
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
        return isCapacitor; // Only return true for actual mobile builds, not small screens
      };

      const isCurrentlyMobile = checkMobileWidth();

      const timerPromise = new Promise(resolve => setTimeout(resolve, shouldSkipLoad ? 0 : MIN_LOADING_TIME));

      let initialSession = useItemsStore.getState().session;

      if (!initialSession) {
        const { data, error } = await supabase.auth.getSession();
        initialSession = data?.session;
        if (error) {
          console.warn("Session check error (clearing invalid session):", error.message);
          await supabase.auth.signOut().catch(() => { });
          setSession(null);
        } else {
          setSession(initialSession);
        }
      }

      let dataPromise = Promise.resolve();
      if (initialSession) {
        // View restoration logic integrated here
        if (initialSession.user?.user_metadata?.canvas_view && !isCurrentlyMobile) {
          const { scale, x, y, isMinimapCollapsed, currentRoomId, currentRoomTitle, roomHistory } = initialSession.user.user_metadata.canvas_view;
          useCanvasStore.getState().restoreView(scale, { x, y });
          if (isMinimapCollapsed !== undefined) {
            useCanvasStore.getState().setIsMinimapCollapsed(isMinimapCollapsed);
          }
          if (currentRoomId !== undefined) {
            useItemsStore.setState({
              currentRoomId: currentRoomId || null,
              currentRoomTitle: currentRoomTitle || (currentRoomId ? 'Room' : 'Canvas'),
              roomHistory: roomHistory || []
            });
          }
        } else {
          useCanvasStore.getState().setViewRestored(true);
        }

        dataPromise = fetchData(initialSession.user).then(() => {
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeRef.current = subscribeToChanges();
        }).catch((err: any) => {
          if (err.name === 'AbortError') return;
          console.error("fetchData error:", err);
        });
      } else {
        useCanvasStore.getState().setViewRestored(true);
      }

      await Promise.all([timerPromise, dataPromise]);

      const finishLoading = () => {
        setShowLoading(false);
        showLoadingRef.current = false;
        setInitializing(false);
        isInitializingRef.current = false;
        setIsFading(false);
      };

      // Start fade sequence
      const fadeTime = shouldSkipLoad ? 500 : 800;

      if (fadeTime > 0) {
        setIsFading(true);
        setTimeout(finishLoading, fadeTime);
      } else {
        finishLoading();
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Initialization error:", err);
      // Ensure we don't get stuck
      useCanvasStore.getState().setViewRestored(true);
      setInitializing(false);
      setShowLoading(false);
      setIsFading(false);
    } finally {
      isRunningInitRef.current = false;
    }
  };

  useEffect(() => {
    runInit();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        localStorage.removeItem('isAuthenticating');
        // If we were waiting for redirect auth (initializing is true), 
        // trigger runInit again to proceed with data fetching and finish loading
        if (isInitializingRef.current) {
          runInit();
        }
      }

      // If we already finished loading but session changed (e.g. login/logout manually), refresh data
      if (session && !showLoadingRef.current && !isInitializingRef.current) {
        fetchData(session.user).catch((err: any) => {
          if (err.name === 'AbortError') return;
          console.error('[AuthChange] fetchData failed:', err);
        });
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
    } else if (session && !isAuthExiting) {
      setShouldShowAuth(false);
    }
  }, [session, showLoading, initializing, isAuthExiting]);

  const _hasHydrated = useVaultStore(state => state._hasHydrated);

  useEffect(() => {
    if (session && !isInitializingRef.current && _hasHydrated) {
      fetchData();
    }
  }, [session, fetchData, _hasHydrated]);

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
      // We no longer fallback to Mobile View for small screens on desktop
      setIsMobile(isCapacitor);

      // But we will use a separate state to show the redirect
      setIsSmallScreenWeb(!isCapacitor && isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // View Sync Logic
  useEffect(() => {
    // This effect handles updates when session changes but loading screen is ALREADY gone
    if (session?.user?.user_metadata?.canvas_view && !isMobile && !showLoading) {
      const { scale, x, y, isMinimapCollapsed, currentRoomId, currentRoomTitle, roomHistory } = session.user.user_metadata.canvas_view;
      useCanvasStore.getState().restoreView(scale, { x, y });
      if (isMinimapCollapsed !== undefined) {
        useCanvasStore.getState().setIsMinimapCollapsed(isMinimapCollapsed);
      }
      if (currentRoomId !== undefined) {
        useItemsStore.setState({
          currentRoomId: currentRoomId || null,
          currentRoomTitle: currentRoomTitle || (currentRoomId ? 'Room' : 'Canvas'),
          roomHistory: roomHistory || []
        });
      }
    }
  }, [session, isMobile, showLoading]);

  useEffect(() => {
    if (!session || isMobile) return;

    let timer: NodeJS.Timeout;
    const unsubscribe = useCanvasStore.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const itemState = useItemsStore.getState();
          await supabase.auth.updateUser({
            data: {
              ...session.user.user_metadata,
              canvas_view: {
                scale: state.scale,
                x: state.position.x,
                y: state.position.y,
                isMinimapCollapsed: state.isMinimapCollapsed,
                currentRoomId: itemState.currentRoomId,
                currentRoomTitle: itemState.currentRoomTitle,
                roomHistory: itemState.roomHistory
              }
            }
          });
        } catch (e: any) {
          if (e.name === 'AbortError') return;
          console.error('[MetadataSync] Failed to update user metadata:', e);
        }
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

  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleNavStart = () => setIsNavigating(true);
    window.addEventListener('navigatingToSettings', handleNavStart);
    return () => window.removeEventListener('navigatingToSettings', handleNavStart);
  }, []);

  return (
    <DragWrapper>
      {/* Loading Screen: Only visible during initial load OR fading out */}
      {((showLoading || isFading) && !isSharing) && <LoadingScreen isFading={isFading} />}

      {/* Main Content: Rendered when loading is finished OR currently fading in OR exiting auth */}
      {(!showLoading || isFading || isAuthExiting) && (
        <>
          {(!session || shouldShowAuth || isAuthExiting) ? (
            <AuthModal onLogin={() => {
              setIsAuthExiting(true);
              runInit(); // Start loading immediately behind the fading auth modal
              setTimeout(() => {
                setShouldShowAuth(false);
                setIsAuthExiting(false);
              }, 800);
            }} />
          ) : (
            <>
              {isSmallScreenWeb ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  padding: '24px',
                  textAlign: 'center',
                  zIndex: 9999,
                  position: 'fixed',
                  top: 0,
                  left: 0
                }}>
                  <MonitorSmartphone size={64} style={{ color: '#a1a1aa', marginBottom: '24px' }} />
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>Please use a larger screen</h1>
                  <p style={{ color: '#a1a1aa', maxWidth: '400px', lineHeight: '1.5' }}>Brainia is currently optimized for desktop view. Please open this app on a larger screen, or download our Android App.</p>
                </div>
              ) : isMobile ? (
                <div className={clsx(isFading ? 'fade-in' : 'opacity-100')}>
                  <MobilePageContent session={session} />
                </div>
              ) : (
                <main className={clsx(
                  'desktop-version w-screen h-screen overflow-hidden',
                  isFading ? 'fade-in' : 'opacity-100',
                  isNavigating && 'fade-out'
                )}>
                  <Header />
                  <AccountMenu />
                  <Inbox />
                  <Canvas>

                    <AnimatePresence mode="popLayout">
                      {projectAreas.map(area => (
                        <motion.div
                          key={area.id}
                          initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            transformOrigin: `${area.position_x + (area.metadata?.width || 300) / 2}px ${area.position_y + (area.metadata?.height || 200) / 2}px`
                          }}
                        >
                          <div style={{ pointerEvents: 'auto' }}>
                            <ProjectArea item={area} />
                          </div>
                        </motion.div>
                      ))}
                      {visibleFolders.map(folder => (
                        <motion.div
                          key={folder.id}
                          initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          style={{
                            position: 'absolute',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            transformOrigin: `${folder.position_x + 100}px ${folder.position_y + 60}px`
                          }}
                        >
                          <div style={{ pointerEvents: 'auto' }}>
                            <FolderItem
                              folder={folder}
                              onClick={() => setOpenFolderId(folder.id)}
                              isLocked={isInsideLockedArea(folder.position_x, folder.position_y, 200, 100)}
                            />
                          </div>
                        </motion.div>
                      ))}
                      {visibleItems.map(item => {
                        const w = item.metadata?.width || (item.type === 'room' ? 220 : 280);
                        const h = item.metadata?.height || (item.type === 'room' ? 220 : 120);
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            style={{
                              position: 'absolute',
                              pointerEvents: 'none',
                              zIndex: 9999,
                              transformOrigin: `${item.position_x + w / 2}px ${item.position_y + h / 2}px`
                            }}
                          >
                            <div style={{ pointerEvents: 'auto' }}>
                              <ItemCard
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
                                isLocked={isInsideLockedArea(item.position_x, item.position_y, w, h)}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <RoomBackButton />
                  </Canvas>
                  <MiniMap />
                  <Toolbar />
                  <ZoomWheel />
                  <FloatingBar />
                  <ArchiveZone />
                  <ArchiveView />

                  {openFolderId && (
                    <FolderModal
                      folderId={openFolderId}
                      onClose={() => {
                        setOpenFolderId(null);
                        clearSelection();
                      }}
                      onItemClick={(id) => setSelectedItemId(id)}
                      isChildOpen={!!selectedItemId}
                    />
                  )}
                  {selectedItemId && (
                    <ItemModal
                      itemId={selectedItemId}
                      onClose={() => {
                        setSelectedItemId(null);
                        clearSelection();
                      }}
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
