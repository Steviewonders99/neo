import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Pane, PaneStatus, AddPaneArgs } from './types'

type State = {
  panes: Pane[]
  focusedId: string | null
  isLauncherOpen: boolean

  insertPane(pane: Pane): void
  removePaneLocal(id: string): void
  setFocus(id: string): void
  updateStatus(id: string, status: PaneStatus): void
  setExitCode(id: string, code: number | null): void
  renameTask(id: string, task: string): void
  openLauncher(): void
  closeLauncher(): void
  addPane(args: AddPaneArgs): Promise<void>
  removePane(id: string): Promise<void>
}

export const useStore = create<State>((set, get) => ({
  panes: [],
  focusedId: null,
  isLauncherOpen: false,

  insertPane: (pane) =>
    set((s) => ({ panes: [...s.panes, pane], focusedId: pane.id })),

  removePaneLocal: (id) =>
    set((s) => {
      const panes = s.panes.filter((p) => p.id !== id)
      const focusedId = s.focusedId === id ? (panes[0]?.id ?? null) : s.focusedId
      return { panes, focusedId }
    }),

  setFocus: (id) =>
    set((s) => ({
      focusedId: id,
      panes: s.panes.map((p) => (p.id === id ? { ...p, unread: false } : p)),
    })),

  updateStatus: (id, status) =>
    set((s) => ({
      panes: s.panes.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              unread:
                status === 'attention' && s.focusedId !== id ? true : p.unread,
            }
          : p,
      ),
    })),

  setExitCode: (id, code) =>
    set((s) => ({
      panes: s.panes.map((p) => (p.id === id ? { ...p, exitCode: code } : p)),
    })),

  renameTask: (id, task) =>
    set((s) => ({ panes: s.panes.map((p) => (p.id === id ? { ...p, task } : p)) })),

  openLauncher: () => set({ isLauncherOpen: true }),
  closeLauncher: () => set({ isLauncherOpen: false }),

  addPane: async (args) => {
    if (get().panes.length >= 10) return
    const pane = makePane(args)
    set((s) => ({ panes: [...s.panes, pane], focusedId: pane.id }))
    const { ipc } = await import('../lib/ipc')
    try {
      await ipc.spawn({
        id: pane.id,
        cwd: pane.cwd,
        kind: pane.kind,
        cols: 80,
        rows: 24,
      })
    } catch (err) {
      set((s) => ({
        panes: s.panes.map((p) =>
          p.id === pane.id ? { ...p, status: 'exited', exitCode: -1 } : p,
        ),
      }))
      console.error('spawn failed', err)
    }
  },

  removePane: async (id) => {
    const { ipc } = await import('../lib/ipc')
    try {
      await ipc.kill(id)
    } catch {
      /* already dead */
    }
    set((s) => {
      const panes = s.panes.filter((p) => p.id !== id)
      const focusedId = s.focusedId === id ? (panes[0]?.id ?? null) : s.focusedId
      return { panes, focusedId }
    })
  },
}))

export function makePane(args: AddPaneArgs): Pane {
  const repo = args.cwd.split('/').filter(Boolean).pop() ?? args.cwd
  return {
    id: uuid(),
    repo,
    cwd: args.cwd,
    task: args.task,
    kind: args.kind,
    status: 'starting',
    unread: false,
    exitCode: null,
  }
}
