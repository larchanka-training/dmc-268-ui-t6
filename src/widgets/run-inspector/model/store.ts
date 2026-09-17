import { create } from 'zustand'

export interface RunInspectorState {
  expandedKeys: string[]
  selectedActionIndex: number | null
  setExpandedKeys: (keys: string[]) => void
  selectAction: (index: number | null) => void
}

export const useRunInspectorStore = create<RunInspectorState>()((set) => ({
  expandedKeys: [],
  selectedActionIndex: null,
  setExpandedKeys: (keys) => {
    set({ expandedKeys: keys })
  },
  selectAction: (index) => {
    set({ selectedActionIndex: index })
  },
}))
