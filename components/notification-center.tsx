"use client"

import { useEffect, useState } from "react"
import { Button } from "./button"
import { NotificationItem } from "./notification-item"
import { Bell, Check } from 'lucide-react'
import type { Notification, NotificationAction, PaginatedResponse } from "@ordafy/types"
import { useNotificationSSE } from "./hooks/use-notification-sse"

export interface NotificationApiAdapter {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => Promise<PaginatedResponse<Notification>>
  markAsRead: (id: string) => Promise<Notification>
  markAllAsRead: () => Promise<PaginatedResponse<Notification>>
}

export interface NotificationCenterProps {
  apiAdapter: NotificationApiAdapter
  enableRealtime?: boolean // Enable SSE for real-time notifications
  /** Resolve notification.action to a web URL (e.g. getWebActionUrl from @ordafy/notifications) for action-based links. */
  resolveActionUrl?: (action: NotificationAction) => string | null
}

export function NotificationCenter({ apiAdapter, enableRealtime = true, resolveActionUrl }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [page, _setPage] = useState(1)

  // Connect to SSE for real-time notifications
  const { isConnected: _isConnected } = useNotificationSSE({
    enabled: enableRealtime,
    onNotification: (notification) => {
      // Add new notification to the list
      setNotifications((prev) => {
        // Check if notification already exists (avoid duplicates)
        if (prev.some((n) => n.id === notification.id)) {
          return prev
        }
        return [notification, ...prev]
      })
      
      // Update unread count
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1)
      }
    },
    onError: (error) => {
      console.error("[NotificationCenter] SSE error:", error)
    },
  })

  useEffect(() => {
    fetchNotifications()
  }, [filter, page])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const data = await apiAdapter.list({
        page,
        limit: 20,
        unreadOnly: filter === "unread",
      })

      const notificationsList = Array.isArray(data) 
        ? data 
        : (data?.data || (data as Record<string, unknown>).notifications || [])
      setNotifications(notificationsList)
      const unread = Array.isArray(data) 
        ? data?.filter((n: Notification) => !n.read)?.length 
        : ((data as Record<string, unknown>).unreadCount ?? notificationsList.filter((n: Notification) => !n.read)?.length)
      setUnreadCount(unread)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  async function markAllAsRead() {
    try {
      await apiAdapter.markAllAsRead()
      fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  async function markAsRead(id: string) {
    try {
      await apiAdapter.markAsRead(id)
      setNotifications((prev) =>
        prev?.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date() } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  if (loading && notifications?.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)]?.map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications?.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-muted-foreground">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications?.map((notification) => {
            // Normalize dates: convert strings to Date, keep Date as Date
            // NotificationItem accepts both string | Date
            const normalizedNotification = {
              ...notification,
              createdAt: notification.createdAt instanceof Date 
                ? notification.createdAt 
                : new Date(notification.createdAt),
              readAt: notification.readAt 
                ? (notification.readAt instanceof Date 
                    ? notification.readAt 
                    : new Date(notification.readAt))
                : undefined,
            } as Notification & {
              readAt?: string | Date
              createdAt: string | Date
            }
            
            return (
              <NotificationItem
                key={notification.id}
                notification={normalizedNotification}
                onMarkAsRead={markAsRead}
                resolveActionUrl={resolveActionUrl}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

