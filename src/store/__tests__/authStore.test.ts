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
  unloadTierConfig: vi.fn(),
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

import { pb } from '@/lib/pocketbase';

describe('authStore — checkAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('sets unauthenticated when authStore is invalid', async () => {
    pb.authStore.isValid = false;
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refreshes auth data if valid', async () => {
    pb.authStore.isValid = true;
    pb.authStore.model = mockUser as any;
    pb.authStore.token = 'test-token';
    
    const mockAuthRefresh = vi.fn().mockResolvedValue({ record: mockUser });
    vi.mocked(pb.collection).mockReturnValue({
      authRefresh: mockAuthRefresh,
      getFullList: vi.fn().mockResolvedValue([]),
    } as any);

    await useAuthStore.getState().checkAuth();
    
    expect(mockAuthRefresh).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('test@test.com');
  });
});

describe('authStore — createWorkspace', () => {
  beforeEach(() => {
    useAuthStore.getState().login('token123', mockUser, mockWorkspaces);
  });

  it('creates workspace successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new-ws' });
    vi.mocked(pb.collection).mockReturnValue({
      create: mockCreate,
      getFullList: vi.fn().mockResolvedValue([]),
    } as any);

    await useAuthStore.getState().createWorkspace('New WS');
    expect(mockCreate).toHaveBeenCalledWith({ name: 'New WS', owner: 'user1' });
  });

  it('throws error if limit reached', async () => {
    // mockUser has tier FREE, limit is maxWorkspaces
    const limitsMock = await import('@/lib/tierLimits');
    vi.mocked(limitsMock.getTierLimits).mockReturnValue({ maxWorkspaces: 1, maxNodes: 25, maxMembersPerWorkspace: 2 } as any);
    
    // User already has 'ws1' as admin (which counts as 1)
    await expect(useAuthStore.getState().createWorkspace('New WS')).rejects.toThrow();
  });
});

describe('authStore — OTP', () => {
  it('requests OTP by creating temp user and calling requestOTP', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const mockRequestOTP = vi.fn().mockResolvedValue({ otpId: 'otp-123' });
    vi.mocked(pb.collection).mockReturnValue({
      create: mockCreate,
      requestOTP: mockRequestOTP,
    } as any);

    const otpId = await useAuthStore.getState().requestOTP('test@otp.com');
    expect(mockCreate).toHaveBeenCalled();
    expect(mockRequestOTP).toHaveBeenCalledWith('test@otp.com');
    expect(otpId).toBe('otp-123');
  });

  it('confirms OTP successfully', async () => {
    const mockAuthWithOTP = vi.fn().mockResolvedValue({});
    vi.mocked(pb.collection).mockReturnValue({
      authWithOTP: mockAuthWithOTP,
      authRefresh: vi.fn().mockResolvedValue({ record: mockUser }),
      getFullList: vi.fn().mockResolvedValue([]),
    } as any);

    await useAuthStore.getState().confirmOTP('otp-123', '000000');
    expect(mockAuthWithOTP).toHaveBeenCalledWith('otp-123', '000000');
  });
});

describe('authStore — deleteAccount', () => {
  beforeEach(() => {
    useAuthStore.getState().login('token123', mockUser, mockWorkspaces);
  });

  it('deletes account via custom endpoint', async () => {
    const mockSend = vi.fn().mockResolvedValue({ success: true });
    pb.send = mockSend;

    await useAuthStore.getState().deleteAccount();
    
    expect(mockSend).toHaveBeenCalledWith('/api/ai/delete-account', { method: 'POST' });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
