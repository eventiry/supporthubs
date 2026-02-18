"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useNotificationSSE } from "./hooks/use-notification-sse"
import type { Notification } from "@ordafy/types"

interface NotificationContextValue {
  unreadCount: number
  notifications: Notification[]
  isConnected: boolean
  refresh: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export interface NotificationProviderProps {
  children: ReactNode
  enabled?: boolean
  onNotification?: (notification: Notification) => void
}

/**
 * Provider component that manages real-time notifications via SSE
 * Add this to your app layout to enable global notification handling
 * 
 * @example
 * ```tsx
 * <NotificationProvider>
 *   <App />
 * </NotificationProvider>
 * ```
 */
export function NotificationProvider({ 
  children, 
  enabled = true,
  onNotification 
}: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])

  const { isConnected, notifications: sseNotifications } = useNotificationSSE({
    enabled,
    onNotification: (notification) => {
      // Add to notifications list
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === notification.id)) {
          return prev
        }
        return [notification, ...prev]
      })

      // Update unread count
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1)
      }

      // Call custom handler
      onNotification?.(notification)
    },
    onError: (error) => {
      console.error("[NotificationProvider] SSE error:", error)
    },
  })

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

  const refresh = () => {
    // This would typically trigger a refetch from the API
    // For now, we rely on SSE for updates
  }

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        isConnected,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * Hook to access notification context
 * 
 * @example
 * ```tsx
 * const { unreadCount, isConnected } = useNotificationContext()
 * ```
 */
export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotificationContext must be used within NotificationProvider")
  }
  return context
}


