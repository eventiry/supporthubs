"use client"

import { useToast } from "./use-toast"
import { getErrorMessage, getErrorTitle, isAuthError, isRateLimitError } from "@ordafy/utils"

/**
 * Hook for consistent API error handling with toast notifications
 */
export function useApiError() {
  const { toast } = useToast()

  const handleError = (error: unknown, options?: {
    title?: string
    fallbackMessage?: string
    onAuthError?: () => void
    onRateLimitError?: () => void
    silent?: boolean
  }) => {
    if (options?.silent) return

    const title = options?.title || getErrorTitle(error)
    const message = getErrorMessage(error, options?.fallbackMessage)

    // Handle specific error types
    if (isAuthError(error) && options?.onAuthError) {
      options.onAuthError()
      return
    }

    if (isRateLimitError(error) && options?.onRateLimitError) {
      options.onRateLimitError()
      toast({
        title: "Too Many Requests",
        description: "Please wait a moment before trying again.",
        variant: "destructive",
      })
      return
    }

    toast({
      title,
      description: message,
      variant: "destructive",
    })
  }

  const handleSuccess = (message: string, title = "Success") => {
    toast({
      title,
      description: message,
    })
  }

  const handleWarning = (message: string, title = "Warning") => {
    toast({
      title,
      description: message,
      variant: "default",
    })
  }

  return {
    handleError,
    handleSuccess,
    handleWarning,
  }
}

