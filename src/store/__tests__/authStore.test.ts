import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';

// Mock PocketBase
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    authStore: {
      clear: vi.fn(),
      isValid: false,
      token: null,
      record: null,
      onChange: vi.fn(),
    },
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
      getOne: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    })),
    send: vi.fn().mockResolvedValue({}),
  },
  getAvatarUrl: vi.fn().mockReturnValue(''),
}));

vi.mock('@/lib/tierLimits', () => ({
  getTierLimits: vi.fn().mockReturnValue({ maxNodes: 25 }),
  getEffectiveTier: vi.fn().mockReturnValue('FREE'),
  loadTierConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/i18n/config', () => ({
  default: { language: 'en' },
}));

const mockUser = {
  id: 'user1',
  email: 'test@test.com',
  name: 'Test User',
  tier: 'FREE' as const,
  avatar: '',
};

const mockWorkspaces = [
  { id: 'ws1', name: 'Workspace 1', owner: 'user1', role: 'admin' as const },
  { id: 'ws2', name: 'Workspace 2', owner: 'user2', role: 'editor' as const },
];

describe('authStore — login', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      workspaces: [],
      activeWorkspace: null,
      pendingInvitations: [],
    });
  });

  it('sets user and token on login', () => {
    useAuthStore.getState().login('token123', mockUser, mockWorkspaces);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@test.com');
    expect(state.token).toBe('token123');
  });

  it('sets first workspace as active on login', () => {
    useAuthStore.getState().login('token123', mockUser, mockWorkspaces);
    expect(useAuthStore.getState().activeWorkspace?.id).toBe('ws1');
  });

  it('handles login with no workspaces', () => {
    useAuthStore.getState().login('token123', mockUser, []);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.activeWorkspace).toBeNull();
    expect(state.workspaces).toHaveLength(0);
  });
});

describe('authStore — logout', () => {
  beforeEach(() => {
    useAuthStore.getState().login('token123', mockUser, mockWorkspaces);
  });

  it('clears all auth state on logout', () => {
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.workspaces).toHaveLength(0);
    expect(state.activeWorkspace).toBeNull();
  });
});

describe('authStore — setActiveWorkspace', () => {
  beforeEach(() => {
    useAuthStore.getState().login('token123', mockUser, mockWorkspaces);
  });

  it('switches to a valid workspace', () => {
    useAuthStore.getState().setActiveWorkspace('ws2');
    expect(useAuthStore.getState().activeWorkspace?.id).toBe('ws2');
    expect(useAuthStore.getState().activeWorkspace?.name).toBe('Workspace 2');
  });

  it('ignores invalid workspace ID', () => {
    useAuthStore.getState().setActiveWorkspace('nonexistent');
    // Should remain on ws1 (the first one from login)
    expect(useAuthStore.getState().activeWorkspace?.id).toBe('ws1');
  });
});

describe('authStore — setProfileModalOpen', () => {
  it('toggles profile modal state', () => {
    expect(useAuthStore.getState().isProfileModalOpen).toBe(false);
    useAuthStore.getState().setProfileModalOpen(true);
    expect(useAuthStore.getState().isProfileModalOpen).toBe(true);
    useAuthStore.getState().setProfileModalOpen(false);
    expect(useAuthStore.getState().isProfileModalOpen).toBe(false);
  });
});
