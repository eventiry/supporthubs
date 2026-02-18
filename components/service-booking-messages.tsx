"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "./button"
import { Textarea } from "./textarea"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"
import { ScrollArea } from "./scroll-area"
import { Badge } from "./badge"
import { useApiError } from "./use-api-error"
import { Send, Check, CheckCheck } from "lucide-react"
import type { ServiceBookingMessage, User } from "@ordafy/types"
import { formatDateWithTime } from "@ordafy/utils"
import { cn } from "./utils"

export interface ServiceBookingMessagesProps {
  bookingId: string
  currentUserId: string
  messages: ServiceBookingMessage[]
  onMessageSent?: (message: ServiceBookingMessage) => void
  onMessagesUpdate?: (messages: ServiceBookingMessage[]) => void
  fetchMessages: () => Promise<ServiceBookingMessage[]>
  sendMessage: (bookingId: string, message: string, attachments?: string[]) => Promise<ServiceBookingMessage>
  pollInterval?: number // Polling interval in milliseconds (default: 5000ms)
  enablePolling?: boolean // Enable/disable polling for real-time updates
}

export function ServiceBookingMessages({
  bookingId,
  currentUserId,
  messages: initialMessages,
  onMessageSent,
  onMessagesUpdate,
  fetchMessages,
  sendMessage,
  pollInterval = 5000,
  enablePolling = true,
}: ServiceBookingMessagesProps) {
  const [messages, setMessages] = useState<ServiceBookingMessage[]>(initialMessages)
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { handleError, handleSuccess } = useApiError()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Polling for new messages
  useEffect(() => {
    if (!enablePolling) return

    const poll = async () => {
      try {
        const updatedMessages = await fetchMessages()
        if (updatedMessages?.length !== messages?.length) {
          setMessages(updatedMessages)
          onMessagesUpdate?.(updatedMessages)
        }
      } catch (error) {
        // Silently fail polling errors
        console.error("Failed to poll messages:", error)
      }
    }

    const interval = setInterval(poll, pollInterval)
    return () => clearInterval(interval)
  }, [enablePolling, pollInterval, fetchMessages, messages?.length, onMessagesUpdate])

  const handleSend = async () => {
    if (!messageText.trim() || sending) return

    try {
      setSending(true)
      const newMessage = await sendMessage(bookingId, messageText.trim())
      setMessageText("")
      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)
      onMessageSent?.(newMessage)
      onMessagesUpdate?.(updatedMessages)
      handleSuccess("Message sent")
    } catch (error) {
      handleError(error, { title: "Failed to send message" })
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.keyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.PreventDefault()
      handleSend()
    }
  }

  const getSenderName = (message: ServiceBookingMessage): string => {
    if (message.sender) {
      const sender = message.sender as User
      return sender.firstName && sender.lastName
        ? `${sender.firstName} ${sender.lastName}`
        : sender.email || "Unknown"
    }
    return "Unknown"
  }

  const getSenderInitials = (message: ServiceBookingMessage): string => {
    if (message.sender) {
      const sender = message.sender as User
      if (sender.firstName && sender.lastName) {
        return `${sender.firstName[0]}${sender.lastName[0]}`.toUpperCase()
      }
      if (sender.firstName) {
        return sender.firstName[0].toUpperCase()
      }
      if (sender.email) {
        return sender.email[0].toUpperCase()
      }
    }
    return "?"
  }

  const getSenderAvatar = (message: ServiceBookingMessage): string | undefined => {
    if (message.sender) {
      const sender = message.sender as User
      return sender.avatar || undefined
    }
    return undefined
  }

  const isOwnMessage = (message: ServiceBookingMessage): boolean => {
    return message.senderId === currentUserId
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 border rounded-lg p-4 mb-4">
        <div className="space-y-4">
          {messages?.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages?.map((message) => {
              const ownMessage = isOwnMessage(message)
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    ownMessage ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {!ownMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getSenderAvatar(message)} />
                      <AvatarFallback>{getSenderInitials(message)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "flex flex-col gap-1 max-w-[70%]",
                      ownMessage ? "items-end" : "items-start"
                    )}
                  >
                    {!ownMessage && (
                      <div className="text-sm font-medium text-foreground">
                        {getSenderName(message)}
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 text-sm",
                        ownMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      {message.attachments && message.attachments?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments?.map((attachment, idx) => (
                            <a
                              key={idx}
                              href={attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline block"
                            >
                              Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDateWithTime(new Date(message.createdAt))}</span>
                      {ownMessage && (
                        <div className="flex items-center">
                          {message.read ? (
                            <CheckCheck className="h-3 w-3 text-primary" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {ownMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getSenderAvatar(message)} />
                      <AvatarFallback>{getSenderInitials(message)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="flex gap-2">
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="min-h-[80px] resize-none"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={!messageText.trim() || sending}
          size="default"
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

