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
