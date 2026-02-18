"use client"

import { formatDistanceToNow } from "date-fns"
import { Button } from "./button"
import { Bell, Calendar, CreditCard, Star, Users } from "lucide-react"
import Link from "next/link"
import type { Notification, NotificationAction } from "@ordafy/types"

export interface NotificationItemProps {
  notification: Notification & {
    readAt?: string | Date
    createdAt: string | Date
  }
  onMarkAsRead: (id: string) => void
  /** Resolve notification.action to a web URL. Provide from getWebActionUrl (e.g. in web/business app) for action-based links. */
  resolveActionUrl?: (action: NotificationAction) => string | null
}

export function NotificationItem({ notification, onMarkAsRead, resolveActionUrl }: NotificationItemProps) {
  const icon = getNotificationIcon(notification.type)
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })

  const href =
    notification.action && resolveActionUrl
      ? resolveActionUrl(notification.action)
      : notification.actionUrl
  const hasLink = href && href.trim() !== ""

  const content = (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
        notification.read ? "bg-background" : "bg-muted/50"
      } hover:bg-muted/70`}
    >
      <div className={`p-2 rounded-full ${notification.read ? "bg-muted" : "bg-primary/10"}`}>{icon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.PreventDefault()
                onMarkAsRead(notification.id)
              }}
            >
              Mark as read
              </Button>
            )}
          </div>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
          </div>

          
        </div>
      </div>
    </div>
  )

  if (hasLink && href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

function getNotificationIcon(type: string) {
  const className = "h-5 w-5"

  switch (type) {
    case "ORDER_CONFIRMATION":
    case "TICKET_PURCHASED":
      return <CreditCard className={className} />
    case "PRODUCT_REMINDER":
    case "PRODUCT_UPDATE":
    case "PRODUCT_CANCELLED":
      return <Calendar className={className} />
    case "FOLLOW":
      return <Users className={className} />
    case "REVIEW":
      return <Star className={className} />
    case "WAITLIST_AVAILABLE":
      return <Bell className={className} />
    default:
      return <Bell className={className} />
  }
}

