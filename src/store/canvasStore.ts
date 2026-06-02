import { create } from 'zustand';
import { temporal } from 'zundo';
import type { CanvasState } from './canvasTypes';
import { createGraphSlice } from './slices/createGraphSlice';
import { createProcessSlice } from './slices/createProcessSlice';
import { createVersionSlice } from './slices/createVersionSlice';
import { createMetadataSlice } from './slices/createMetadataSlice';

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (...a) => ({
      ...createGraphSlice(...a),
      ...createProcessSlice(...a),
      ...createVersionSlice(...a),
      ...createMetadataSlice(...a),
      searchQuery: '',
      searchSelectedUsers: [] as string[],
      setSearchQuery: (query: string) => a[0]({ searchQuery: query }),
      setSearchSelectedUsers: (users: string[]) => a[0]({ searchSelectedUsers: users }),
    }),
    {
      partialize: (state) => {
        const { nodes, edges } = state;
        return { nodes, edges };
      },
      limit: 100,
    }
  )
);
