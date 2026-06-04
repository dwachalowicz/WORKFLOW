import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePBSubscription } from '@/hooks/usePBSubscription';
import { invalidateGroupCache } from '@/lib/groupService';

/**
 * Mounts globally when the user is authenticated.
 * Listens to Realtime (SSE) events for core workspace, membership, and user changes.
 * When changes occur, it triggers centralized store refreshes.
 */
export function GlobalRealtimeListener() {
  const { isAuthenticated, user, fetchWorkspaces, checkAuth, fetchUnreadNotificationsCount, workspaces } = useAuthStore();
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use ref for workspaces to break the subscribe→fetch→resubscribe dependency cycle
  const workspacesRef = useRef(workspaces);
  useEffect(() => {
    workspacesRef.current = workspaces;
  }, [workspaces]);

  // Debounced workspace refresh to prevent query spikes (server throttling)
  const debouncedFetchWorkspaces = useCallback(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchWorkspaces();
    }, 1000); // 1-second debounce
  }, [fetchWorkspaces]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  // 1. Listen for changes to the current User (e.g. Stripe Tier update, Profile edits)
  const onUserChange = useCallback(() => {
    // Calling checkAuth(false) forces a DB refresh of the user record
    // which instantly applies any new tier limits or avatar changes.
    checkAuth(false);
  }, [checkAuth]);

  usePBSubscription(
    'WORKFLOW_users',
    isAuthenticated && user?.id ? user.id : undefined,
    onUserChange,
    isAuthenticated
  );

  // 2. Listen for changes to Workspaces and Workspace Memberships
  // This covers: 
  // - You getting invited to a new workspace
  // - Your role changing (e.g. Viewer -> Editor)
  // - A workspace you are in being renamed
  // - Someone accepting an invite to a workspace you own (pending members count updates)
  const onWorkspaceChange = useCallback(() => {
    debouncedFetchWorkspaces();
  }, [debouncedFetchWorkspaces]);

  const onWorkspaceMemberChange = useCallback((e: import('pocketbase').RecordSubscription<Record<string, unknown>>) => {
    const isRelevantToMe = user && (e.record.user === user.id || e.record.invited_email === user.email);
    const amIAdminOrOwner = workspacesRef.current.some(w => w.id === e.record.workspace && (w.role === 'admin' || w.owner === user?.id));
    
    if (isRelevantToMe || amIAdminOrOwner) {
      debouncedFetchWorkspaces();
    }
  }, [debouncedFetchWorkspaces, user]);

  // We can't easily filter workspaces if we want to hear about newly shared ones, so topic '*' is kept.
  usePBSubscription('WORKFLOW_workspaces', '*', onWorkspaceChange, isAuthenticated);
  usePBSubscription('WORKFLOW_workspace_members', '*', onWorkspaceMemberChange, isAuthenticated);

  // 3. Listen for Notifications
  // Updates the unread badge globally without fetching workspaces.
  const onNotificationChange = useCallback(() => {
    fetchUnreadNotificationsCount();
  }, [fetchUnreadNotificationsCount]);

  const userId = user?.id;
  const notificationOptions = useMemo(() => ({ filter: userId ? `user = "${userId}"` : '' }), [userId]);
  usePBSubscription('WORKFLOW_notifications', '*', onNotificationChange, isAuthenticated, notificationOptions);

  // 4. Listen for Group changes (invalidate local cache so other tabs/users see fresh data)
  const onGroupChange = useCallback(() => {
    invalidateGroupCache();
  }, []);
  usePBSubscription('WORKFLOW_groups', '*', onGroupChange, isAuthenticated);

  return null; // This is a headless listener component
}
