"use client"

import { useState } from "react"
import { Button } from "./button"
import { Textarea } from "./textarea"
import { Label } from "./label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card"
import { useApiError } from "./use-api-error"
import { Star, Upload, X } from "lucide-react"
import type { CreateServiceReviewRequest } from "@ordafy/types"
import { cn } from "./utils"

export interface ServiceReviewFormProps {
  bookingId: string
  serviceId: string
  onSubmit: (data: CreateServiceReviewRequest) => Promise<void>
  onCancel?: () => void
}

const RATING_CATEGORIES = [
  { key: "overallRating", label: "Overall", required: true },
  { key: "cleanlinessRating", label: "Cleanliness", required: false },
  { key: "valueRating", label: "Value", required: false },
  { key: "locationRating", label: "Location", required: false },
  { key: "amenitiesRating", label: "Amenities", required: false },
  { key: "communicationRating", label: "Communication", required: false },
] as const

export function ServiceReviewForm({ bookingId, serviceId, onSubmit, onCancel }: ServiceReviewFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({
    overallRating: 0,
    cleanlinessRating: 0,
    valueRating: 0,
    locationRating: 0,
    amenitiesRating: 0,
    communicationRating: 0,
  })
  const [comment, setComment] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { handleError, handleSuccess } = useApiError()

  const handleRatingChange = (category: string, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files?.length === 0) return

    setUploading(true)
    try {
      // Convert FileList to Array
      const fileArray = Array.from(files)
      
      // Upload images using the unified service upload endpoint
      const { api } = await import("@ordafy/api")
      const result = await api.upload.service(fileArray)

      // Add uploaded URLs to images
      setImages((prev) => [...prev, ...result.urls])
      setUploading(false)
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to upload image" })
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.PreventDefault()

    // Validate required rating
    if (ratings.overallRating === 0) {
      handleError(new Error("Overall rating is required"), { fallbackMessage: "Please provide an overall rating" })
      return
    }

    try {
      setSubmitting(true)
      const reviewData: CreateServiceReviewRequest = {
        serviceId,
        bookingId,
        overallRating: ratings.overallRating,
        cleanlinessRating: ratings.cleanlinessRating > 0 ? ratings.cleanlinessRating : undefined,
        valueRating: ratings.valueRating > 0 ? ratings.valueRating : undefined,
        locationRating: ratings.locationRating > 0 ? ratings.locationRating : undefined,
        amenitiesRating: ratings.amenitiesRating > 0 ? ratings.amenitiesRating : undefined,
        communicationRating: ratings.communicationRating > 0 ? ratings.communicationRating : undefined,
        comment: comment.trim() || undefined,
        images: images?.length > 0 ? images : undefined,
      }

      await onSubmit(reviewData)
      handleSuccess("Review submitted successfully")
    } catch (error) {
      handleError(error, { fallbackMessage: "Failed to submit review. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({ category, label, required }: { category: string; label: string; required: boolean }) => {
    const value = ratings[category] || 0
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5]?.map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(category, star)}
              className={cn(
                "transition-colors",
                star <= value ? "text-yellow-400" : "text-muted-foreground"
              )}
            >
              <Star className={cn("h-5 w-5", star <= value ? "fill-current" : "")} />
            </button>
          ))}
          {value > 0 && <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
        <CardDescription>Share your experience with this service</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ratings */}
          <div className="space-y-4">
            {RATING_CATEGORIES?.map(({ key, label, required }) => (
              <StarRating key={key} category={key} label={label} required={required} />
            ))}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              className="min-h-[120px]"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{comment?.length}/2000 characters</p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Photos (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {images?.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Review image ${index + 1}`}
                    className="h-24 w-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {images?.length < 5 && (
                <label className="flex h-24 w-24 items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Upload up to 5 photos</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting || ratings.overallRating === 0}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

