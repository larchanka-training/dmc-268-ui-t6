import { create } from 'zustand'

export type DiffViewType = 'unified' | 'split'

export interface DiffViewerState {
  viewType: DiffViewType
  setViewType: (v: DiffViewType) => void
}

export const useDiffViewerStore = create<DiffViewerState>()((set) => ({
  viewType: 'unified',
  setViewType: (v) => {
    set({ viewType: v })
  },
}))
