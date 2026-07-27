import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Pane, PaneStatus, AddPaneArgs } from './types'
import { movePaneOrder } from '../lib/reorder'
import { MAX_PANES, MAX_VISIBLE, visibleCount } from '../lib/limits'

type State = {
  panes: Pane[]
  focusedId: string | null
  isLauncherOpen: boolean
  draggingId: string | null
  dropTargetId: string | null

  insertPane(pane: Pane): void
  removePaneLocal(id: string): void
  setFocus(id: string): void
  toggleMinimize(id: string): void
  updateStatus(id: string, status: PaneStatus): void
  setExitCode(id: string, code: number | null): void
  renameTask(id: string, task: string): void
  openLauncher(): void
  closeLauncher(): void
  addPane(args: AddPaneArgs): Promise<void>
  removePane(id: string): Promise<void>
  beginDrag(id: string): void
  setDropTarget(id: string | null): void
  endDrag(): void
  movePane(fromId: string, toId: string): void
}

export const useStore = create<State>((set, get) => ({
  panes: [],
  focusedId: null,
  isLauncherOpen: false,
  draggingId: null,
  dropTargetId: null,

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

  toggleMinimize: (id) =>
    set((s) => {
      const current = s.panes.find((p) => p.id === id)
      if (!current) return s
      // Restoring while the grid is already full is refused rather than bumping
      // something else off screen. The dock shows the count so the block reads
      // as intentional.
      if (current.minimized && visibleCount(s.panes) >= MAX_VISIBLE) return s

      const panes = s.panes.map((p) =>
        p.id === id ? { ...p, minimized: !p.minimized } : p,
      )
      // When minimizing the focused pane, move focus to the next visible one
      let focusedId = s.focusedId
      const target = panes.find((p) => p.id === id)
      if (target?.minimized && s.focusedId === id) {
        focusedId = panes.find((p) => !p.minimized)?.id ?? null
      }
      return { panes, focusedId }
    }),

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
    if (get().panes.length >= MAX_PANES) return
    // Past MAX_VISIBLE the new pane starts archived, so nothing already on
    // screen is pushed out from under the user. Its PTY still spawns.
    const startArchived = visibleCount(get().panes) >= MAX_VISIBLE
    const pane = makePane(args, startArchived)
    set((s) => ({
      panes: [...s.panes, pane],
      focusedId: startArchived ? s.focusedId : pane.id,
    }))
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

  beginDrag: (id) => set({ draggingId: id, dropTargetId: null }),

  // Guarded so a pointermove that stays inside the same pane doesn't re-render.
  setDropTarget: (id) =>
    set((s) => (s.dropTargetId === id ? s : { dropTargetId: id })),

  endDrag: () => set({ draggingId: null, dropTargetId: null }),

  movePane: (fromId, toId) =>
    set((s) => {
      const panes = movePaneOrder(s.panes, fromId, toId)
      return panes === s.panes ? s : { panes }
    }),
}))

export function makePane(args: AddPaneArgs, minimized = false): Pane {
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
    minimized,
  }
}
