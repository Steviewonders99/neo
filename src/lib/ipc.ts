import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { PaneKind, PaneStatus } from '../state/types'

export type SpawnRequest = {
  id: string
  cwd: string
  kind: PaneKind
  cols: number
  rows: number
}

export const ipc = {
  spawn: (req: SpawnRequest) => invoke<void>('pane_spawn', { req }),
  write: (id: string, data: number[]) => invoke<void>('pane_write', { id, data }),
  resize: (id: string, cols: number, rows: number) =>
    invoke<void>('pane_resize', { id, cols, rows }),
  kill: (id: string) => invoke<void>('pane_kill', { id }),
}

export function listenPtyData(
  id: string,
  cb: (bytes: Uint8Array) => void,
): Promise<UnlistenFn> {
  return listen<number[]>(`pty:data:${id}`, (e) => cb(new Uint8Array(e.payload)))
}

export function listenPtyExit(
  id: string,
  cb: (code: number | null) => void,
): Promise<UnlistenFn> {
  return listen<number | null>(`pty:exit:${id}`, (e) => cb(e.payload))
}

export function listenActivity(
  id: string,
  cb: (status: PaneStatus) => void,
): Promise<UnlistenFn> {
  return listen<PaneStatus>(`activity:${id}`, (e) => cb(e.payload))
}

export type RecentDir = { cwd: string; repo: string; lastUsedAt: number }

export const recentDirs = {
  list: () => invoke<RecentDir[]>('list_recent_dirs'),
  add: (cwd: string) => invoke<RecentDir[]>('add_recent_dir', { cwd }),
}

export const meta = {
  set: (id: string, repo: string, task: string) =>
    invoke<void>('set_pane_meta', { id, repo, task }),
  focus: (id: string) => invoke<void>('pane_focus', { id }),
}
