'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface MobileSidebarCtx {
  open: boolean
  toggle: () => void
  close: () => void
}

const MobileSidebarContext = createContext<MobileSidebarCtx>({
  open: false,
  toggle: () => {},
  close: () => {},
})

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((o) => !o), [])
  const close  = useCallback(() => setOpen(false), [])

  return (
    <MobileSidebarContext.Provider value={{ open, toggle, close }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile overlay backdrop */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
          />
        )}
        {children}
      </div>
    </MobileSidebarContext.Provider>
  )
}
