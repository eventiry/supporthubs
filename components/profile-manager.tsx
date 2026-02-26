"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Textarea } from "./textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { Skeleton } from "./skeleton"
import { useApiError } from "./use-api-error"
import type { User } from "@ordafy/types"
import { Loader2, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog"
export type UserRole = "customer" | "business" | "admin"

interface Session {
  id: string
  isCurrent: boolean
  device: string
  location: string
  lastActive: string
  expiresAt: string
}

export interface ProfileManagerProps {
  role: UserRole
  userId?: string
  onProfileUpdate?: (profile: User) => void
  showLocationSettings?: boolean
  showSecurityTab?: boolean
  showPreferencesTab?: boolean
  onNavigateTo2FA?: () => void
  apiClient: {
    getProfile: () => Promise<User>
    updateProfile: (data: Partial<User>) => Promise<User>
    changePassword?: (data: { currentPassword: string; newPassword: string }) => Promise<{ message?: string } | void>
    uploadAvatar?: (file: File) => Promise<{ url: string; avatar?: string }>
    getSessions?: () => Promise<{ sessions: Session[] }>
    deleteSession?: (sessionId: string) => Promise<unknown>
    disable2FA?: () => Promise<{ message?: string }>
    deleteAccount?: () => Promise<{ success: boolean; message?: string }>
  }
}

export function ProfileManager({
  role: _role,
  userId: _userId,
  onProfileUpdate,
  showLocationSettings = false,
  showSecurityTab = true,
  showPreferencesTab = true,
  onNavigateTo2FA,
  apiClient,
}: ProfileManagerProps) {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false)
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { handleError, handleSuccess } = useApiError()

  useEffect(() => {
    fetchProfile()
    
    // Check if we're returning from 2FA setup
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get("2fa") === "enabled") {
        // Refresh profile to get updated 2FA status
        fetchProfile()
        // Clean up URL
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await apiClient.getProfile()
      setProfile(data)
    } catch (error) {
      console.error("[ProfileManager] Failed to fetch profile:", error)
      handleError(error, { fallbackMessage: "Failed to load profile", silent: true })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!apiClient.uploadAvatar) {
      handleError(new Error("Avatar upload not available"), {
        fallbackMessage: "Avatar upload is not available",
      })
      return
    }

    setUploadingAvatar(true)
    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image")
      }

      // Validate file size (max 2MB for avatars)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image size must be less than 2MB")
      }

      const result = await apiClient.uploadAvatar(file)
      const avatarUrl = result.url || result.avatar

      if (avatarUrl) {
        // Update profile with new avatar
        const updated = await apiClient.updateProfile({ avatar: avatarUrl })
        setProfile(updated)
        if (onProfileUpdate) {
          onProfileUpdate(updated)
        }
        handleSuccess("Avatar updated successfully", "Success")
      }
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to upload avatar" })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleAvatarUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSaveProfile = async (data: Partial<User>) => {
    setSaving(true)
    try {
      const updated = await apiClient.updateProfile(data)
      setProfile(updated)
      if (onProfileUpdate) {
        onProfileUpdate(updated)
      }
      handleSuccess("Profile updated successfully", "Success")
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to update profile" })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.PreventDefault()
    
    if (!apiClient.changePassword) {
      handleError(new Error("Password change not available"), {
        fallbackMessage: "Password change is not available",
      })
      return
    }

    // Check if user has a password - OAuth users might not have one
    const hasPassword = profile?.hasPassword !== false

    // Only require current password if user has a password
    if (hasPassword && !passwordData.currentPassword) {
      handleError(new Error("Current password is required"), {
        fallbackMessage: "Current password is required",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      handleError(new Error("Passwords do not match"), {
        fallbackMessage: "New passwords do not match",
      })
      return
    }

    if (passwordData.newPassword?.length < 8) {
      handleError(new Error("Password too short"), {
        fallbackMessage: "Password must be at least 8 characters",
      })
      return
    }

    setSaving(true)
    try {
      await apiClient.changePassword({
        currentPassword: hasPassword ? passwordData.currentPassword : "", // Empty string for OAuth users
        newPassword: passwordData.newPassword,
      })
      handleSuccess("Password changed successfully", "Success")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      ;(e.target as HTMLFormElement).reset()
      // Refresh profile to update hasPassword status
      await fetchProfile()
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to change password" })
    } finally {
      setSaving(false)
    }
  }

  const handleLoadSessions = async () => {
    if (!apiClient.getSessions) return

    setLoadingSessions(true)
    try {
      const data = await apiClient.getSessions()
      setSessions(data?.sessions)
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to load sessions", silent: true })
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!apiClient.deleteSession) return

    try {
      await apiClient.deleteSession(sessionId)
      handleSuccess("Session terminated successfully", "Success")
      await handleLoadSessions()
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to terminate session" })
    }
  }

  const handleEnable2FA = () => {
    if (onNavigateTo2FA) {
      onNavigateTo2FA()
    }
  }

  const handleDisable2FA = async () => {
    if (!apiClient.disable2FA) {
      handleError(new Error("2FA disable not available"), {
        fallbackMessage: "2FA disable functionality is not available",
      })
      return
    }

    setDisabling2FA(true)
    try {
      await apiClient.disable2FA()
      // Refresh profile to get updated status
      await fetchProfile()
      setShowDisable2FADialog(false)
      handleSuccess("Two-factor authentication disabled successfully", "Success")
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to disable 2FA" })
    } finally {
      setDisabling2FA(false)
    }
  }

  const _handleEnable2FALegacy = () => {
    if (onNavigateTo2FA) {
      onNavigateTo2FA()
    } else {
      // Default navigation - try to navigate to 2FA setup page
      if (typeof window !== "undefined") {
        window.location.href = `${process.env.NEXT_PUBLIC_AUTH_URL}/settings/2fa`
      }
    }
  }

  const handleDeleteAccount = async () => {
    if (!apiClient.deleteAccount) {
      handleError(new Error("Delete account not available"), {
        fallbackMessage: "Delete account functionality is not available",
      })
      return
    }

    setDeletingAccount(true)
    try {
      await apiClient.deleteAccount()
      handleSuccess("Account deleted successfully", "Success")
      // Redirect to home or login page after a short delay
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/"
        }
      }, 2000)
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to delete account" })
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-4xl md:px-20 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 max-w-4xl md:px-20 py-8">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl md:px-20 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          {showPreferencesTab && <TabsTrigger value="preferences">Preferences</TabsTrigger>}
          {showSecurityTab && <TabsTrigger value="security">Security</TabsTrigger>}
          {showLocationSettings && <TabsTrigger value="location">Location & Currency</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar || undefined} />
                  <AvatarFallback>
                    {profile.firstName?.[0] || ""}
                    {profile.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar || !apiClient.uploadAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Change Photo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>

              {/* Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName || ""}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName || ""}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profile.username || ""}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value || undefined })}
                  placeholder="Choose a unique username"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value || undefined })}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>

              {/* Contact */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input id="email" type="email" value={profile.email} disabled />
                    {profile.emailVerified && <Badge variant="secondary">Verified</Badge>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value || undefined })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={
                      profile.dateOfBirth
                        ? profile.dateOfBirth instanceof Date
                          ? profile.dateOfBirth?.toISOString().split("T")[0]
                          : String(profile.dateOfBirth).split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        dateOfBirth: e.target.value ? new Date(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={profile.gender || ""}
                    onValueChange={(value) => setProfile({ ...profile, gender: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() =>
                  handleSaveProfile({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    username: profile.username,
                    bio: profile.bio,
                    phone: profile.phone,
                    dateOfBirth: profile.dateOfBirth,
                    gender: profile.gender,
                  })
                }
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {showPreferencesTab && (
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your experience on Ordafy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={profile.timezone || "UTC"}
                    onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="locale">Language</Label>
                  <Select
                    value={profile.locale || "en"}
                    onValueChange={(value) => setProfile({ ...profile, locale: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() =>
                    handleSaveProfile({
                      timezone: profile.timezone,
                      locale: profile.locale,
                    })
                  }
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {showSecurityTab && (
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and security preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {apiClient.changePassword ? (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Only show current password field if user has a password (not OAuth-only user) */}
                    {profile?.hasPassword !== false && (
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, currentPassword: e.target.value })
                          }
                          required
                        />
                      </div>
                    )}
                    {!profile?.hasPassword && (
                      <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                        You signed up with OAuth, so you can set a password without providing your current one.
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        required
                        minLength={8}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        required
                        minLength={8}
                      />
                    </div>

                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">Password</h4>
                      <p className="text-sm text-muted-foreground">Password change not available</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      {profile.twoFactorEnabled
                        ? "Two-factor authentication is enabled on your account"
                        : "Add an extra layer of security to your account"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={profile.twoFactorEnabled ? "default" : "secondary"}>
                      {profile.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {profile.twoFactorEnabled ? (
                      <>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDisable2FADialog(true)}
                        >
                          Disable 2FA
                        </Button>
                        <AlertDialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to disable two-factor authentication? This will make your account less secure. 
                                You can re-enable it at any time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={disabling2FA}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDisable2FA}
                                disabled={disabling2FA}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {disabling2FA ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Disabling...
                                  </>
                                ) : (
                                  "Disable 2FA"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleEnable2FA}
                      >
                        Enable 2FA
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground">
                      Manage devices where you&apos;re logged in
                    </p>
                  </div>
                  <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSessionsDialogOpen(true)
                          handleLoadSessions()
                        }}
                      >
                        View Sessions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="">
                      <DialogHeader>
                        <DialogTitle>Active Sessions</DialogTitle>
                        <DialogDescription>
                          Manage devices where you&apos;re currently logged in. You can terminate any session except the current one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {loadingSessions ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : sessions?.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No active sessions found
                          </p>
                        ) : (
                          sessions?.map((session) => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{session.device}</h4>
                                  {session.isCurrent && (
                                    <Badge variant="secondary">Current</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {session.location} • Last active:{" "}
                                  {new Date(session.lastActive).toLocaleDateString()}
                                </p>
                              </div>
                              {!session.isCurrent && apiClient.deleteSession && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSession(session.id)}
                                >
                                  Terminate
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {apiClient.deleteAccount && (
                  <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                    <div>
                      <h4 className="font-semibold text-destructive">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deletingAccount}>
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all of your data from our servers. 
                            This includes:
                            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                              <li>Your profile and personal information</li>
                              <li>All your tickets and orders</li>
                              <li>Your product history and preferences</li>
                              <li>All saved products and favorites</li>
                            </ul>
                            <p className="mt-3 font-semibold text-destructive">
                              If you have active orders, you will need to contact support before deleting your account.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deletingAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingAccount ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Yes, delete my account"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

