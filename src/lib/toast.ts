// Fire-and-forget notifications. Any module can call `toast()`; the mounted
// <ToastContainer> registers itself as the listener and renders them.

export type Toast = { id: number; msg: string; type: 'success' | 'error' | 'info' }

type Listener = (t: Omit<Toast, 'id'>) => void
let listener: Listener | null = null

export function setToastListener(l: Listener | null) {
  listener = l
}

export function toast(msg: string, type: Toast['type'] = 'info') {
  listener?.({ msg, type })
}
