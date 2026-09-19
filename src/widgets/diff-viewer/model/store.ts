import { create } from 'zustand'

export type DiffViewType = 'unified' | 'split'

export interface DiffViewerState {
  viewType: DiffViewType
  selectedFile: string | null
  setViewType: (v: DiffViewType) => void
  selectFile: (filename: string | null) => void
}

export const useDiffViewerStore = create<DiffViewerState>()((set) => ({
  viewType: 'unified',
  selectedFile: null,
  setViewType: (v) => {
    set({ viewType: v })
  },
  selectFile: (filename) => {
    set({ selectedFile: filename })
  },
}))
