export type PaneStatus = 'starting' | 'idle' | 'working' | 'attention' | 'exited'
export type PaneKind = 'claude' | 'shell'

export type Pane = {
  id: string
  repo: string
  cwd: string
  task: string
  kind: PaneKind
  status: PaneStatus
  unread: boolean
  exitCode: number | null
  minimized: boolean
}

export type AddPaneArgs = {
  cwd: string
  task: string
  kind: PaneKind
}
