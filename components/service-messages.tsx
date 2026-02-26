"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "./button"
import { Textarea } from "./textarea"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"
import { ScrollArea } from "./scroll-area"
import { useApiError } from "./use-api-error"
import { FileViewer } from "./file-viewer"
import { Send, Check, CheckCheck, Paperclip, X, Image as ImageIcon, File } from "lucide-react"
import type { ServiceBookingMessage, User } from "@ordafy/types"
import { formatDateWithTime } from "@ordafy/utils"
import { cn } from "./utils"
import { api } from "@ordafy/api"

export interface ServiceMessagesProps {
  serviceId: string
  currentUserId: string
  messages: ServiceBookingMessage[]
  onMessageSent?: (message: ServiceBookingMessage) => void
  onMessagesUpdate?: (messages: ServiceBookingMessage[]) => void
  fetchMessages: () => Promise<ServiceBookingMessage[]>
  sendMessage: (serviceId: string, message: string, attachments?: string[]) => Promise<ServiceBookingMessage>
  pollInterval?: number // Polling interval in milliseconds (default: 5000ms)
  enablePolling?: boolean // Enable/disable polling for real-time updates
}

interface AttachmentPreview {
  file: File
  url: string
  name: string
  type: string
}

export function ServiceMessages({
  serviceId,
  currentUserId,
  messages: initialMessages,
  onMessageSent,
  onMessagesUpdate,
  fetchMessages,
  sendMessage,
  pollInterval = 5000,
  enablePolling = true,
}: ServiceMessagesProps) {
  const [messages, setMessages] = useState<ServiceBookingMessage[]>(initialMessages)
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)
  const [_loading, _setLoading] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [viewingAttachments, setViewingAttachments] = useState<{ urls: string[]; index: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate files
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ]

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not supported`)
        continue
      }
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds 10MB limit`)
        continue
      }
      validFiles.push(file)
    }

    if (errors.length > 0) {
      handleError(new Error(errors.join(", ")), { title: "File validation failed" })
    }

    if (validFiles.length === 0) return

    // Create previews
    const previews: AttachmentPreview[] = []
    for (const file of validFiles) {
      const url = URL.createObjectURL(file)
      previews.push({
        file,
        url,
        name: file.name,
        type: file.type,
      })
    }

    setAttachments((prev) => [...prev, ...previews])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev]
      const removed = newAttachments.splice(index, 1)[0]
      URL.revokeObjectURL(removed.url)
      return newAttachments
    })
  }

  const handleSend = async () => {
    if ((!messageText.trim() && attachments.length === 0) || sending) return

    try {
      setSending(true)
      setUploading(true)

      // Upload attachments if any
      let attachmentUrls: string[] = []
      if (attachments.length > 0) {
        try {
          const filesToUpload = attachments.map((att) => att.file)
          const uploadResult = await api.upload.messageAttachments(filesToUpload)
          attachmentUrls = uploadResult.urls || []
          
          if (uploadResult.errors && uploadResult.errors.length > 0) {
            handleError(new Error(uploadResult.errors.join(", ")), { title: "Some files failed to upload" })
          }
        } catch (error) {
          handleError(error, { title: "Failed to upload attachments" })
          setUploading(false)
          setSending(false)
          return
        }
      }

      // Send message with attachments
      const newMessage = await sendMessage(serviceId, messageText.trim() || "", attachmentUrls)
      
      // Clean up
      setMessageText("")
      attachments.forEach((att) => URL.revokeObjectURL(att.url))
      setAttachments([])
      
      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)
      onMessageSent?.(newMessage)
      onMessagesUpdate?.(updatedMessages)
      handleSuccess("Message sent")
    } catch (error) {
      handleError(error, { title: "Failed to send message" })
    } finally {
      setSending(false)
      setUploading(false)
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

  const getFileIcon = (url: string): React.ReactNode => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes("image/")
    if (isImage) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const handleAttachmentClick = (message: ServiceBookingMessage, index: number) => {
    if (message.attachments && message.attachments.length > 0) {
      setViewingAttachments({
        urls: message.attachments,
        index,
      })
    }
  }

  const getFileName = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/")
      const fileName = pathParts[pathParts.length - 1]
      // Remove timestamp and random string prefix if present
      return fileName.replace(/^\d+-[a-z0-9]+-/, "") || "attachment"
    } catch {
      const parts = url.split("/")
      return parts[parts.length - 1] || "attachment"
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Messages List */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 border rounded-lg p-4 mb-4 min-h-[400px]">
          <div className="space-y-4 overflow-y-auto max-h-[400px] webkit-scrollbar-thin webkit-scrollbar-thumb-gray-300 webkit-scrollbar-track-gray-100">
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
                      ownMessage ? "flex-row justify-end" : "flex-row justify-start"
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
                        {message.message && (
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        )}
                        {message.attachments && message.attachments?.length > 0 && (
                          <div className={cn("mt-2 space-y-2", message.message && "mt-2")}>
                            {message.attachments?.map((attachment, idx) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment) || attachment.includes("image/")
                              return (
                                <div
                                  key={idx}
                                  className={cn(
                                    "rounded-md overflow-hidden border",
                                    isImage ? "cursor-pointer" : "cursor-pointer"
                                  )}
                                  onClick={() => handleAttachmentClick(message, idx)}
                                >
                                  {isImage ? (
                                    <img
                                      src={attachment}
                                      alt={`Attachment ${idx + 1}`}
                                      className="max-w-[200px] max-h-[200px] object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 p-2 bg-background/50">
                                      {getFileIcon(attachment)}
                                      <span className="text-xs truncate max-w-[150px]">
                                        {getFileName(attachment)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
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

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((attachment, idx) => {
              const isImage = attachment.type.startsWith("image/")
              return (
                <div
                  key={idx}
                  className="relative group border rounded-md overflow-hidden"
                >
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-16 h-16 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-muted">
                      <File className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate">
                    {attachment.name}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
            type="button"
            className="self-end"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="min-h-[20px] resize-none"
            disabled={sending || uploading}
          />
          <Button
            onClick={handleSend}
            disabled={(!messageText.trim() && attachments.length === 0) || sending || uploading}
            size="default"
            className="self-end"
          >
            {uploading ? (
              <span className="text-xs">Uploading...</span>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Attachment Viewer Dialog */}
      {viewingAttachments && (
        <FileViewer
          files={viewingAttachments.urls}
          currentIndex={viewingAttachments.index}
          onClose={() => setViewingAttachments(null)}
          title="Attachment Viewer"
        />
      )}
    </>
  )
}
