"use client"

import * as React from "react"
import { Button } from "./button"
import { X, Cookie, CheckCircle2, Circle } from "lucide-react"
import { cn } from "./utils"

// Local type definitions to avoid dependency on @ordafy/types
interface ConsentUpdateRequest {
  termsOfService?: boolean
  privacyPolicy?: boolean
  essentialCookies?: boolean
  marketingCommunications?: boolean
  consentMethod?: string
  source?: string
  termsOfServiceDate?: string
  privacyPolicyDate?: string
  essentialCookiesDate?: string
  marketingCommunicationsDate?: string
}

interface ConsentBannerProps {
  webUrl?: string
  className?: string
  source?: string
  onConsentUpdate?: (consent: ConsentUpdateRequest) => void
  // Optional API methods - if provided, will use these instead of fetch
  apiMethods?: {
    getConsent?: () => Promise<{ termsOfService: boolean; privacyPolicy: boolean; essentialCookies: boolean; marketingCommunications: boolean }>
    updateConsent?: (data: ConsentUpdateRequest) => Promise<{ success: boolean }>
  }
}

interface LocalConsent {
  termsOfService: boolean
  privacyPolicy: boolean
  essentialCookies: boolean
  marketingCommunications: boolean
  termsOfServiceDate?: string
  privacyPolicyDate?: string
  essentialCookiesDate?: string
  marketingCommunicationsDate?: string
}

export function ConsentBanner({ webUrl, className, source = "web", onConsentUpdate, apiMethods }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  
  // Consent states
  const [consents, setConsents] = React.useState<LocalConsent>({
    termsOfService: false,
    privacyPolicy: false,
    essentialCookies: false,
    marketingCommunications: false,
  })

  React.useEffect(() => {
    setIsMounted(true)
    
    // Only access localStorage/sessionStorage in browser
    if (typeof window === "undefined") {
      return
    }

    let timer: NodeJS.Timeout | null = null

    // Check if user is authenticated and has consents
    const checkAuth = async () => {
      let shouldShowBanner = true

      try {
        let data
        if (apiMethods?.getConsent) {
          // Use provided API method
          try {
            data = await apiMethods.getConsent()
            setIsAuthenticated(true)
            // If user has all required consents, don't show banner
            if (data?.termsOfService && data?.privacyPolicy) {
              shouldShowBanner = false
            }
          } catch {
            // User not authenticated or API error
            setIsAuthenticated(false)
          }
        } else {
          // Fallback to fetch
          try {
            const response = await fetch("/api/consent", {
              credentials: "include",
            })
            if (response.ok) {
              setIsAuthenticated(true)
              data = await response.json()
              // If user has all required consents, don't show banner
              if (data?.termsOfService && data?.privacyPolicy) {
                shouldShowBanner = false
              }
            } else {
              setIsAuthenticated(false)
            }
          } catch {
            // User not authenticated or API error
            setIsAuthenticated(false)
          }
        }
      } catch {
        // User not authenticated or API error
        setIsAuthenticated(false)
      }

      // Check localStorage for existing consents
      const storedConsent = localStorage.getItem("ordafy-user-consent")
      if (storedConsent) {
        try {
          const parsed = JSON.parse(storedConsent) as LocalConsent
          setConsents(parsed)
          
          // If required consents are already given, don't show banner
          if (parsed.termsOfService && parsed.privacyPolicy) {
            shouldShowBanner = false
          }
        } catch {
          // Invalid stored consent, continue to show banner
        }
      }

      // Check if dismissed for this session
      const dismissed = sessionStorage.getItem("ordafy-consent-banner-dismissed")
      if (dismissed === "true") {
        shouldShowBanner = false
      }

      // Show banner after 30 seconds if we should show it
      if (shouldShowBanner) {
        timer = setTimeout(() => {
          setIsVisible(true)
        }, 30000)
      }
    }

    checkAuth()

    // Cleanup function
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [apiMethods])

  const saveConsent = React.useCallback(async (consentData: LocalConsent) => {
    const now = new Date()?.toISOString()
    
    // Update local state
    setConsents(consentData)
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ordafy-user-consent", JSON.stringify(consentData))
        localStorage.setItem("ordafy-cookie-consent", consentData.essentialCookies ? "accepted" : "rejected")
        localStorage.setItem("ordafy-cookie-consent-date", now)
      } catch (error) {
        console.error("Failed to save consent to localStorage:", error)
      }
    }

    // Prepare API request
    const apiData: ConsentUpdateRequest = {
      termsOfService: consentData.termsOfService,
      privacyPolicy: consentData.privacyPolicy,
      essentialCookies: consentData.essentialCookies,
      marketingCommunications: consentData.marketingCommunications,
      consentMethod: "banner",
      source,
    }

    // Try to save to database if authenticated
    if (isAuthenticated) {
      try {
        if (apiMethods?.updateConsent) {
          // Use provided API method
          await apiMethods.updateConsent(apiData)
        } else {
          // Fallback to fetch
          const response = await fetch("/api/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(apiData),
          })
          
          if (!response.ok) {
            console.error("Failed to save consent to database")
          }
        }
      } catch (error) {
        console.error("Error saving consent:", error)
      }
    }

    // Call optional callback
    if (onConsentUpdate) {
      onConsentUpdate(apiData)
    }
  }, [isAuthenticated, source, onConsentUpdate])

  const handleAcceptAll = React.useCallback(() => {
    const now = new Date()?.toISOString()
    saveConsent({
      termsOfService: true,
      privacyPolicy: true,
      essentialCookies: true,
      marketingCommunications: true,
      termsOfServiceDate: now,
      privacyPolicyDate: now,
      essentialCookiesDate: now,
      marketingCommunicationsDate: now,
    })
    setIsVisible(false)
  }, [saveConsent])

  const handleRejectAll = React.useCallback(() => {
    const now = new Date()?.toISOString()
    saveConsent({
      termsOfService: true, // Required
      privacyPolicy: true, // Required
      essentialCookies: false,
      marketingCommunications: false,
      termsOfServiceDate: now,
      privacyPolicyDate: now,
    })
    setIsVisible(false)
  }, [saveConsent])

  const handleCustomSave = React.useCallback(() => {
    const now = new Date()?.toISOString()
    const updatedConsents: LocalConsent = {
      ...consents,
      termsOfService: true, // Always required
      privacyPolicy: true, // Always required
      termsOfServiceDate: consents.termsOfService ? consents.termsOfServiceDate : now,
      privacyPolicyDate: consents.privacyPolicy ? consents.privacyPolicyDate : now,
      essentialCookiesDate: consents.essentialCookies ? (consents.essentialCookiesDate || now) : undefined,
      marketingCommunicationsDate: consents.marketingCommunications ? (consents.marketingCommunicationsDate || now) : undefined,
    }
    saveConsent(updatedConsents)
    setIsVisible(false)
  }, [consents, saveConsent])

  const handleClose = React.useCallback(() => {
    if (typeof window === "undefined") return
    
    try {
      setIsVisible(false)
      sessionStorage.setItem("ordafy-consent-banner-dismissed", "true")
    } catch (error) {
      console.error("Failed to save dismissal:", error)
      setIsVisible(false)
    }
  }, [])

  const toggleConsent = (type: keyof LocalConsent) => {
    if (type === "termsOfService" || type === "privacyPolicy") {
      // Required consents cannot be toggled off
      return
    }
    setConsents((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  // Don't render on server
  if (!isMounted) {
    return null
  }

  // Don't render if dismissed for this session
  if (typeof window !== "undefined") {
    try {
      const dismissed = sessionStorage.getItem("ordafy-consent-banner-dismissed")
      if (dismissed === "true") {
        return null
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }

  // Don't render if not visible yet
  if (!isVisible) {
    return null
  }

  // Get base URL
  const baseUrl = webUrl || (typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_WEB_URL || "") : "")

  return (
    <div className="mx-4">
      <div
      className={cn(
        "fixed bottom-5 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 mx-4 max-w-7xl mx-auto border border-2",
        "bg-background border-t shadow-2xl",
        className
      )}
    >
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {!showDetails ? (
          // Simple view
          <div className="flex flex-col  items-start  gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base mb-2">We Value Your Privacy</h3>
                <button
                onClick={handleClose}
                className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4 " />
              </button>
              </div>
              <section className="flex flex-col items-start gap-4">
                <p className="text-sm text-muted-foreground">
                  We use cookies and similar technologies to enhance your experience, analyze site usage, and assist in our
                  marketing efforts. By clicking &quot;Accept All&quot;, you consent to our use of cookies. You can manage your
                  preferences or learn more in our{" "}
                  <a
                    href={`${baseUrl}/legal/cookies`}
                    className="text-primary hover:underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cookie Policy
                  </a>
                  ,{" "}
                  <a
                    href={`${baseUrl}/legal/privacy`}
                    className="text-primary hover:underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
                  , and{" "}
                  <a
                    href={`${baseUrl}/legal/terms`}
                    className="text-primary hover:underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>
                  .
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="whitespace-nowrap"
              >
                Customize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="whitespace-nowrap"
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="whitespace-nowrap"
              >
                Accept All
              </Button>
             
                </div>
                </section>
                </div>
            </div>
           
          </div>
        ) : (
          // Detailed view
          <div className="container mx-auto px-4 py-6 max-w-5xspace-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Manage Your Privacy Preferences</h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-muted rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Terms of Service - Required */}
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                <button
                  onClick={() => {}}
                  className="mt-0.5"
                  disabled
                  aria-label="Terms of Service - Required"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">Terms of Service</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Required</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Essential for platform functionality and legal compliance
                  </p>
                </div>
              </div>

              {/* Privacy Policy - Required */}
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                <button
                  onClick={() => {}}
                  className="mt-0.5"
                  disabled
                  aria-label="Privacy Policy - Required"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">Privacy Policy</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Required</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Essential for platform functionality and legal compliance
                  </p>
                </div>
              </div>

              {/* Essential Cookies - Optional */}
              <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <button
                  onClick={() => toggleConsent("essentialCookies")}
                  className="mt-0.5"
                  aria-label="Toggle Essential Cookies"
                >
                  {consents.essentialCookies ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">Essential Cookies</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Helps us improve your experience and provide relevant content
                  </p>
                </div>
              </div>

              {/* Marketing Communications - Optional */}
              <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <button
                  onClick={() => toggleConsent("marketingCommunications")}
                  className="mt-0.5"
                  aria-label="Toggle Marketing Communications"
                >
                  {consents.marketingCommunications ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">Marketing Communications</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receive updates, promotions, and relevant content
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t gap-4">
              <a
                href={`${baseUrl}/legal/privacy`}
                className="text-xs text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more about our privacy practices
              </a>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomSave}
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
