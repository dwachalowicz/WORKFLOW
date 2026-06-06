import { create } from 'zustand';
import i18n from '@/i18n/config';

import { pb, type WorkflowUser } from '../lib/pocketbase';
import { getTierLimits, getEffectiveTier, loadTierConfig, unloadTierConfig } from '../lib/tierLimits';
import { sanitizeForFilter } from '../lib/parseUtils';
import { useToastStore } from './toastStore';

interface User {
  id: string;
  email: string;
  name?: string;
  tier: 'FREE' | 'MEDIUM' | 'PRO';
  tierExpiresAt?: string | null;
  avatar?: string;
}

interface Workspace {
  id: string;
  name: string;
  owner?: string;
  avatar?: string;
  icon?: string;
  role: 'admin' | 'editor' | 'viewer';
  isLocked?: boolean;
  joinCode?: string;
}

export interface PendingInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: 'admin' | 'editor' | 'viewer';
  invitedBy?: { name: string; email: string };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  workspaces: Workspace[];
  pendingInvitations: PendingInvitation[];
  sentJoinRequests: PendingInvitation[];
  pendingMembersCount: number;
  unreadNotificationsCount: number;
  activeWorkspace: Workspace | null;
  login: (token: string, user: User, workspaces?: Workspace[]) => void;
  logout: () => void;
  checkAuth: (skipRefresh?: boolean) => Promise<void>;
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<void>;
  inviteMember: (email: string, workspaceId: string, role?: 'admin' | 'editor' | 'viewer') => Promise<{ isNewUser: boolean }>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  rejectInvitation: (invitationId: string) => Promise<void>;
  joinByCode: (code: string) => Promise<void>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  isProfileModalOpen: boolean;
  setProfileModalOpen: (isOpen: boolean) => void;
  requestOTP: (email: string) => Promise<string>;
  confirmOTP: (otpId: string, code: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  getAccountDeletionInfo: () => Promise<{ processCount: number; workspaceCount: number; membershipCount: number; versionCount: number; commentCount: number }>;
  fetchUnreadNotificationsCount: () => Promise<void>;
  isInitializing: boolean;
}

let fetchWorkspacesPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  workspaces: [],
  pendingInvitations: [],
  sentJoinRequests: [],
  pendingMembersCount: 0,
  unreadNotificationsCount: 0,
  activeWorkspace: null,
  isProfileModalOpen: false,
  isInitializing: true,

  setProfileModalOpen: (isOpen) => set({ isProfileModalOpen: isOpen }),

  login: (token, user, workspaces = []) => {
    const savedWsId = localStorage.getItem('gryf_active_workspace_id');
    const savedWs = savedWsId ? workspaces.find(w => w.id === savedWsId) : null;
    set({ 
      user, 
      token, 
      isAuthenticated: true,
      workspaces: workspaces,
      activeWorkspace: savedWs || (workspaces.length > 0 ? workspaces[0] : null)
    });
  },

  logout: () => {
    pb.authStore.clear();
    unloadTierConfig();
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false,
      workspaces: [],
      pendingInvitations: [],
      sentJoinRequests: [],
      pendingMembersCount: 0,
      unreadNotificationsCount: 0,
      activeWorkspace: null
    });
  },

  setActiveWorkspace: (workspaceId) => {
    const workspace = get().workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      localStorage.setItem('gryf_active_workspace_id', workspace.id);
      set({ activeWorkspace: workspace });
    }
  },

  checkAuth: async (skipRefresh = false) => {
    const isValid = pb.authStore.isValid;
    let model = pb.authStore.model as WorkflowUser | null;
    
    if (isValid && model) {
      if (!skipRefresh) {
        try {
          // Refresh the auth state from DB to get latest tier, name, avatar etc.
          const authData = await pb.collection('WORKFLOW_users').authRefresh();
          model = authData.record as WorkflowUser;
        } catch (err) {
          const error = err as Error & { isAbort?: boolean };
          if (error?.isAbort) {
            console.warn("authRefresh was auto-cancelled, skipping.");
            return;
          }
          console.error("Failed to refresh auth, token likely expired:", err);
          pb.authStore.clear();
          set({ user: null, token: null, isAuthenticated: false, workspaces: [], activeWorkspace: null });
          set({ isInitializing: false });
          return;
        }
      }

      // Compute effective tier (downgrade to FREE if subscription expired)
      const rawTier = model.tier || 'FREE';
      const tierExpiresAt = model.tier_expires_at ?? null;
      const effectiveTier = getEffectiveTier(rawTier, tierExpiresAt);

      set({
        user: {
          id: model.id,
          email: model.email,
          name: model.name,
          tier: effectiveTier,
          tierExpiresAt: tierExpiresAt || null,
          avatar: model.avatar,
        },
        token: pb.authStore.token,
        isAuthenticated: true,
      });
      await get().fetchWorkspaces();
    } else {
      set({ user: null, token: null, isAuthenticated: false, workspaces: [], activeWorkspace: null });
    }
    
    // Load tier configuration from database (non-blocking fallback to hardcoded)
    loadTierConfig().catch(console.error);

    set({ isInitializing: false });
  },

  fetchWorkspaces: async () => {
    if (fetchWorkspacesPromise) {
      await fetchWorkspacesPromise;
      return;
    }

    const userId = get().user?.id;
    if (!userId) return;

    fetchWorkspacesPromise = (async () => {
      try {
        // Owned workspaces
        const owned = await pb.collection('WORKFLOW_workspaces').getFullList({
          filter: `owner = "${sanitizeForFilter(userId)}"`,
          sort: 'created', // oldest first
          fields: 'id,name,owner,avatar,icon,join_code',
          requestKey: null,
        });

        // Member workspaces (active & pending)
        const memberships = await pb.collection('WORKFLOW_workspace_members').getFullList({
          filter: `user = "${sanitizeForFilter(userId)}"`,
          expand: 'workspace,invited_by',
          sort: 'created',
          fields: 'id,status,role,workspace,invited_by,expand.workspace.id,expand.workspace.name,expand.workspace.owner,expand.workspace.avatar,expand.workspace.icon,expand.workspace.join_code,expand.invited_by.name,expand.invited_by.email',
          requestKey: null,
        });

        const workspaceMap = new Map<string, Workspace>();
        const pendingInvites: PendingInvitation[] = [];
        const sentRequests: PendingInvitation[] = [];

        owned.forEach((w) => {
          workspaceMap.set(w.id, { 
            id: w.id, 
            name: w.name, 
            owner: w.owner as string, 
            avatar: w.avatar || undefined, 
            icon: w.icon || undefined,
            role: 'admin',
            isLocked: false,
            joinCode: w.join_code
          });
        });

        memberships.forEach(m => {
          if (m.status === 'active' && m.expand?.workspace) {
            if (!workspaceMap.has(m.expand.workspace.id)) {
              workspaceMap.set(m.expand.workspace.id, {
                id: m.expand.workspace.id,
                name: m.expand.workspace.name,
                owner: m.expand.workspace.owner as string,
                avatar: m.expand.workspace.avatar || undefined,
                icon: m.expand.workspace.icon || undefined,
                role: m.role as 'admin' | 'editor' | 'viewer',
                joinCode: m.expand.workspace.join_code
              });
            }
          } else if (m.status === 'pending') {
            const inviteObj = {
              id: m.id,
              workspaceId: m.expand?.workspace?.id || m.workspace,
              workspaceName: m.expand?.workspace?.name || i18n.t('authStore.pendingWorkspaceName'),
              role: m.role as 'admin' | 'editor' | 'viewer',
              invitedBy: m.expand?.invited_by ? {
                name: m.expand.invited_by.name,
                email: m.expand.invited_by.email
              } : undefined
            };
            pendingInvites.push(inviteObj);
          }
        });

        // --- Fetch Pending Invitations Workspace Names ---
        if (pendingInvites.length > 0) {
          try {
            const pendingNames = await pb.send(`/api/workspaces/pending-invitations?t=${Date.now()}`, { method: 'GET' });
            if (Array.isArray(pendingNames)) {
              pendingNames.forEach((n: { id: string, workspaceName: string }) => {
                const inv = pendingInvites.find(p => p.id === n.id);
                if (inv && n.workspaceName && n.workspaceName !== 'Workspace') {
                  inv.workspaceName = n.workspaceName;
                }
              });
            }
          } catch (err) {
            console.error("Error fetching pending invitation workspace names", err);
          }
        }

        let wsList = Array.from(workspaceMap.values());

        // --- Fetch Locked Workspaces ---
        try {
          const lockedIds: string[] = await pb.send(`/api/locked-workspaces?t=${Date.now()}`, { method: 'GET' });
          if (Array.isArray(lockedIds)) {
            wsList = wsList.map(ws => ({
              ...ws,
              isLocked: lockedIds.includes(ws.id)
            }));
            
            // Update map in case it's used later
            wsList.forEach(ws => workspaceMap.set(ws.id, ws));
          }
        } catch (lockedErr) {
          console.error("Error fetching locked workspaces", lockedErr);
        }

        // --- New user bootstrap: create default workspace + sample folder ---
        if (wsList.length === 0 && pendingInvites.length === 0) {
          try {
            if (typeof navigator !== 'undefined' && navigator.locks) {
              await navigator.locks.request('create_default_workspace_' + userId, async () => {
                // Double check inside the lock
                const verifyOwned = await pb.collection('WORKFLOW_workspaces').getFullList({
                  filter: `owner = "${sanitizeForFilter(userId)}"`,
                  fields: 'id',
                  requestKey: null,
                });
                
                if (verifyOwned.length === 0) {
                  const newWs = await pb.collection('WORKFLOW_workspaces').create({
                    name: i18n.t('authStore.defaultWorkspaceName'),
                    owner: userId
                  });

                  await pb.collection('WORKFLOW_process_groups').create({
                    name: i18n.t('authStore.defaultFolderName'),
                    workspace: newWs.id
                  });

                  wsList = [{ id: newWs.id, name: newWs.name, owner: userId, avatar: undefined, role: 'admin' as const }];
                } else {
                  // Workspace was created by another tab while waiting for lock
                  wsList = [{ id: verifyOwned[0].id, name: i18n.t('authStore.defaultWorkspaceName'), owner: userId, avatar: undefined, role: 'admin' as const }];
                }
              });
            } else {
              // Fallback if Web Locks API is not supported
              // Add a small random delay to desynchronize simultaneous requests
              await new Promise(res => setTimeout(res, Math.random() * 500));
              
              const verifyOwnedFallback = await pb.collection('WORKFLOW_workspaces').getFullList({
                filter: `owner = "${sanitizeForFilter(userId)}"`,
                fields: 'id',
                requestKey: null,
              });

              if (verifyOwnedFallback.length === 0) {
                const newWs = await pb.collection('WORKFLOW_workspaces').create({
                  name: i18n.t('authStore.defaultWorkspaceName'),
                  owner: userId
                });

                await pb.collection('WORKFLOW_process_groups').create({
                  name: i18n.t('authStore.defaultFolderName'),
                  workspace: newWs.id
                });

                wsList = [{ id: newWs.id, name: newWs.name, owner: userId, avatar: undefined, role: 'admin' as const }];
              } else {
                wsList = [{ id: verifyOwnedFallback[0].id, name: i18n.t('authStore.defaultWorkspaceName'), owner: userId, avatar: undefined, role: 'admin' as const }];
              }
            }
          } catch (bootstrapErr) {
            console.error('Error bootstrapping default workspace:', bootstrapErr);
            useToastStore.getState().addToast({
              type: 'warning',
              title: i18n.t('toast.warning'),
              message: i18n.t('authStore.defaultWorkspaceError')
            });
          }
        }

        const activeWs = get().activeWorkspace;
        const savedWsId = localStorage.getItem('gryf_active_workspace_id');

        // If the current active workspace still exists in the refreshed list,
        // keep it selected — just update the object reference (role/name may have changed).
        // This prevents race conditions where multiple fetchWorkspaces calls
        // overwrite the user's workspace selection.
        if (activeWs) {
          const updatedActiveWs = wsList.find(w => w.id === activeWs.id);
          if (updatedActiveWs) {
            set({
              workspaces: wsList,
              pendingInvitations: pendingInvites,
              sentJoinRequests: sentRequests,
              activeWorkspace: updatedActiveWs
            });

            // Count pending members across all workspaces where user is owner/admin
            try {
              const ownedWsIds = wsList.filter(w => w.role === 'admin').map(w => w.id);
              if (ownedWsIds.length > 0) {
                const filterParts = ownedWsIds.map(id => `workspace = "${sanitizeForFilter(id)}"`);
                const pendingMembers = await pb.collection('WORKFLOW_workspace_members').getFullList({
                  filter: `(${filterParts.join(' || ')}) && status = "pending" && invited_by = ""`,
                  fields: 'id',
                  requestKey: null,
                });
                set({ pendingMembersCount: pendingMembers.length });
              } else {
                set({ pendingMembersCount: 0 });
              }
            } catch {
              // Non-critical
            }
            await get().fetchUnreadNotificationsCount();
            return; // Early return — workspace selection preserved
          }
        }

        // Active workspace is null or was removed — resolve from localStorage or fallback
        let nextActiveWs: Workspace | null = null;
        
        if (savedWsId) {
          nextActiveWs = wsList.find(w => w.id === savedWsId) || null;
        }

        if (!nextActiveWs) {
          nextActiveWs = wsList.length > 0 ? wsList[0] : null;
        }

        if (nextActiveWs) {
          localStorage.setItem('gryf_active_workspace_id', nextActiveWs.id);
        }

        set({
          workspaces: wsList,
          pendingInvitations: pendingInvites,
          sentJoinRequests: sentRequests,
          activeWorkspace: nextActiveWs
        });

        // Count pending members across all workspaces where user is owner/admin
        try {
          const ownedWsIds = wsList.filter(w => w.role === 'admin').map(w => w.id);
          if (ownedWsIds.length > 0) {
            const filterParts = ownedWsIds.map(id => `workspace = "${sanitizeForFilter(id)}"`);
            const pendingMembers = await pb.collection('WORKFLOW_workspace_members').getFullList({
              filter: `(${filterParts.join(' || ')}) && status = "pending" && invited_by = ""`,
              fields: 'id',
              requestKey: null,
            });
            set({ pendingMembersCount: pendingMembers.length });
          } else {
            set({ pendingMembersCount: 0 });
          }
        } catch {
          // Non-critical — don't break the flow
        }

        // Count unread notifications
        await get().fetchUnreadNotificationsCount();
      } catch (err) {
        const error = err as { isAbort?: boolean; status?: number };
        if (error?.isAbort || error?.status === 0) return;
        console.error('Error fetching workspaces:', err);
      }
    })();

    try {
      await fetchWorkspacesPromise;
    } finally {
      fetchWorkspacesPromise = null;
    }
  },

  fetchUnreadNotificationsCount: async () => {
    const userId = get().user?.id;
    if (!userId) {
      set({ unreadNotificationsCount: 0 });
      return;
    }
    try {
      const result = await pb.collection('WORKFLOW_notifications').getList(1, 1, {
        filter: `user = "${sanitizeForFilter(userId)}" && isRead = false`,
        fields: 'id',
        requestKey: null,
      });
      set({ unreadNotificationsCount: result.totalItems });
    } catch {
      set({ unreadNotificationsCount: 0 });
    }
  },

  createWorkspace: async (name: string) => {
    const user = get().user;
    if (!user) throw new Error(i18n.t('authStore.notAuthenticated'));
    
    // Check tier limit
    const limits = getTierLimits(user.tier);
    const allWorkspaces = get().workspaces;
    if (allWorkspaces.length >= limits.maxWorkspaces) {
      throw new Error(i18n.t('authStore.workspaceLimit', { tier: user.tier || 'FREE', limit: limits.maxWorkspaces }));
    }
    
    await pb.collection('WORKFLOW_workspaces').create({
      name,
      owner: user.id,
    });
    
    await get().fetchWorkspaces();
  },

  inviteMember: async (rawEmail: string, workspaceId: string, role = 'editor') => {
    const email = rawEmail.trim().toLowerCase();
    // 0. Check tier-based member limit
    const currentUser = get().user;
    if (currentUser) {
      const limits = getTierLimits(currentUser.tier);
      const allMembers = await pb.collection('WORKFLOW_workspace_members').getFullList({
        filter: `workspace = "${sanitizeForFilter(workspaceId)}"`,
        requestKey: null,
      });
      if (allMembers.length >= limits.maxMembersPerWorkspace) {
        throw new Error(i18n.t('tierLimits.memberLimitReached', { limit: limits.maxMembersPerWorkspace }));
      }
    }

    // 1. Find user by email
    const users = await pb.collection('WORKFLOW_users').getFullList({
      filter: `email = "${sanitizeForFilter(email)}"`
    });

    const invitedUser = users.length > 0 ? users[0] : null;

    // 2. Check for duplicates (by user ID or by invited_email)
    const existingFilter = invitedUser
      ? `workspace = "${sanitizeForFilter(workspaceId)}" && (user = "${sanitizeForFilter(invitedUser.id)}" || invited_email = "${sanitizeForFilter(email)}")`
      : `workspace = "${sanitizeForFilter(workspaceId)}" && invited_email = "${sanitizeForFilter(email)}"`;
    const existing = await pb.collection('WORKFLOW_workspace_members').getFullList({
      filter: existingFilter
    });

    if (existing.length > 0) {
      throw new Error(i18n.t('authStore.userAlreadyInWorkspace'));
    }

    // 3. Create member record
    if (invitedUser) {
      // User exists → standard pending invitation
      await pb.collection('WORKFLOW_workspace_members').create({
        workspace: workspaceId,
        user: invitedUser.id,
        role: role,
        status: 'pending',
        invited_by: currentUser?.id
      });
      return { isNewUser: false };
    } else {
      // User doesn't exist -> email-based invitation (deferred linking)
      // The server hook will automatically link the user and change status to 'pending' if the email exists.
      const newMember = await pb.collection('WORKFLOW_workspace_members').create({
        workspace: workspaceId,
        invited_email: email,
        role: role,
        status: 'pending_registration',
        invited_by: currentUser?.id
      });
      return { isNewUser: newMember.status === 'pending_registration' };
    }
  },

  acceptInvitation: async (invitationId: string) => {
    await pb.collection('WORKFLOW_workspace_members').update(invitationId, {
      status: 'active'
    });
    await get().fetchWorkspaces();
  },

  rejectInvitation: async (invitationId: string) => {
    await pb.collection('WORKFLOW_workspace_members').delete(invitationId);
    await get().fetchWorkspaces();
  },

  joinByCode: async (code: string) => {
    const userId = get().user?.id;
    if (!userId) throw new Error(i18n.t('authStore.mustBeLoggedIn'));
    
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) throw new Error(i18n.t('authStore.provideJoinCode'));

    // Use custom backend route to bypass workspace read API rules for non-members
    try {
      await pb.send('/api/workspaces/join-by-code', {
        method: 'POST',
        body: { code: trimmed }
      });
    } catch (err) {
      const error = err as { response?: { message?: string }, message?: string };
      const message = error?.response?.message || error?.message || i18n.t('authStore.workspaceNotFound');
      throw new Error(message, { cause: err });
    }

    await get().fetchWorkspaces();
  },

  leaveWorkspace: async (workspaceId: string) => {
    const userId = get().user?.id;
    if (!userId) throw new Error(i18n.t('authStore.mustBeLoggedIn'));

    // Check if user is the owner
    const ws = await pb.collection('WORKFLOW_workspaces').getOne(workspaceId);
    if (ws.owner === userId) throw new Error(i18n.t('authStore.cannotLeaveOwned'));

    // Find and delete membership
    const memberships = await pb.collection('WORKFLOW_workspace_members').getFullList({
      filter: `workspace = "${sanitizeForFilter(workspaceId)}" && user = "${sanitizeForFilter(userId)}"`,
    });
    for (const m of memberships) {
      await pb.collection('WORKFLOW_workspace_members').delete(m.id);
    }

    await get().fetchWorkspaces();
  },

  requestOTP: async (rawEmail: string) => {
    // Normalize email to lowercase — PocketBase auth lookups are case-sensitive,
    // so we must ensure the email matches the stored (lowercased) format.
    const email = rawEmail.trim().toLowerCase();

    // PocketBase v0.23+ does not send emails for non-existent users upon requestOTP (anti-enumeration security).
    // We must first create an empty (unverified) account to which Pocketbase will send the OTP email.
    try {
      const tempPassword = crypto.randomUUID().replace(/-/g, '') + 'A1@';
      await pb.collection('WORKFLOW_users').create({
        email: email,
        password: tempPassword,
        passwordConfirm: tempPassword,
        emailVisibility: true,
        tier: 'FREE',
      });
    } catch {
      // If the user already exists, Pocketbase will throw a validation error (400), which we simply ignore.
    }

    const authData = await pb.collection('WORKFLOW_users').requestOTP(email);
    return authData.otpId;
  },

  confirmOTP: async (otpId: string, code: string) => {
    await pb.collection('WORKFLOW_users').authWithOTP(otpId, code);
    await get().checkAuth();
  },

  getAccountDeletionInfo: async () => {
    const userId = get().user?.id;
    if (!userId) return { processCount: 0, workspaceCount: 0, membershipCount: 0, versionCount: 0, commentCount: 0 };

    try {
      const statsRes = await fetch(`${pb.baseUrl}/api/user-stats`, {
        headers: {
          'Authorization': pb.authStore.token
        }
      });
      
      if (statsRes.ok) {
        return await statsRes.json();
      }
      return { processCount: 0, workspaceCount: 0, membershipCount: 0, versionCount: 0, commentCount: 0 };
    } catch (err) {
      console.error('Error getting deletion info:', err);
      return { processCount: 0, workspaceCount: 0, membershipCount: 0, versionCount: 0, commentCount: 0 };
    }
  },

  deleteAccount: async () => {
    const userId = get().user?.id;
    if (!userId) throw new Error(i18n.t('authStore.notAuthenticated'));

    try {
      // Use the new fast server-side bulk deletion endpoint
      const response = await pb.send('/api/ai/delete-account', {
        method: 'POST'
      });

      if (!response.success) {
        throw new Error('Failed to delete account on server');
      }

      // 4. Clear auth and redirect
      pb.authStore.clear();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        workspaces: [],
        pendingInvitations: [],
        sentJoinRequests: [],
        pendingMembersCount: 0,
        activeWorkspace: null
      });
    } catch (err) {
      console.error('Error deleting account:', err);
      throw err;
    }
  }
}));

/** Initialize auth state and listener. Called once at module load. */
function initAuth(): void {
  try {
    useAuthStore.getState().checkAuth();
    pb.authStore.onChange(() => {
      useAuthStore.getState().checkAuth(true);
    });
  } catch (err) {
    console.error('[initAuth] Failed to initialize auth:', err);
  }
}

initAuth();
