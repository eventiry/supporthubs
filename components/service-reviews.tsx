"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Avatar, AvatarImage, AvatarFallback } from "./avatar"
import { Badge } from "./badge"
import { Button } from "./button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import type { ServiceReview, User, PaginatedResponse } from "@ordafy/types"
import { formatDate } from "@ordafy/utils"
import { cn } from "./utils"
import { FileViewer } from "./file-viewer"

export interface ServiceReviewsProps {
  reviews: ServiceReview[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onFilterChange?: (filter: { minRating?: number; sortBy?: string }) => void
  showOwnerResponse?: boolean
}

export function ServiceReviews({
  reviews,
  total,
  page = 1,
  limit = 10,
  totalPages,
  onPageChange,
  onFilterChange,
  showOwnerResponse = true,
}: ServiceReviewsProps) {
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [viewingImage, setViewingImage] = useState<{ files: string[]; index: number } | null>(null)

  const handleRatingFilterChange = (value: string) => {
    setRatingFilter(value)
    onFilterChange?.({
      minRating: value === "all" ? undefined : parseInt(value),
      sortBy,
    })
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    onFilterChange?.({
      minRating: ratingFilter === "all" ? undefined : parseInt(ratingFilter),
      sortBy: value,
    })
  }

  const getAverageRating = (review: ServiceReview): number => {
    const ratings = [
      review.overallRating,
      review.cleanlinessRating,
      review.valueRating,
      review.locationRating,
      review.amenitiesRating,
      review.communicationRating,
    ].filter((r) => r !== undefined && r > 0) as number[]

    if (ratings?.length === 0) return 0
    return ratings.reduce((sum, r) => sum + r, 0) / ratings?.length
  }

  const getRatingBreakdown = (review: ServiceReview) => {
    return {
      overall: review.overallRating,
      cleanliness: review.cleanlinessRating,
      value: review.valueRating,
      location: review.locationRating,
      amenities: review.amenitiesRating,
      communication: review.communicationRating,
    }
  }

  const getUserName = (review: ServiceReview): string => {
    if (review.user) {
      const user = review.user as User
      return user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email || "Anonymous"
    }
    return "Anonymous"
  }

  const getUserInitials = (review: ServiceReview): string => {
    if (review.user) {
      const user = review.user as User
      if (user.firstName && user.lastName) {
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      }
      if (user.firstName) {
        return user.firstName[0].toUpperCase()
      }
      if (user.email) {
        return user.email[0].toUpperCase()
      }
    }
    return "A"
  }

  const getUserAvatar = (review: ServiceReview): string | undefined => {
    if (review.user) {
      const user = review.user as User
      return user.avatar || undefined
    }
    return undefined
  }

  const StarDisplay = ({ rating }: { rating: number }) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5]?.map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating ? "text-yellow-400 fill-current" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    )
  }

  const RatingBreakdown = ({ review }: { review: ServiceReview }) => {
    const breakdown = getRatingBreakdown(review)
    const categories = [
      { key: "cleanliness", label: "Cleanliness", value: breakdown.cleanliness },
      { key: "value", label: "Value", value: breakdown.value },
      { key: "location", label: "Location", value: breakdown.location },
      { key: "amenities", label: "Amenities", value: breakdown.amenities },
      { key: "communication", label: "Communication", value: breakdown.communication },
    ].filter((cat) => cat.value !== undefined && cat.value > 0)

    if (categories?.length === 0) return null

    return (
      <div className="mt-2 space-y-1">
        {categories?.map(({ key, label, value }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}:</span>
            <div className="flex items-center gap-1">
              <span className="font-medium">{value}</span>
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Select value={ratingFilter} onValueChange={handleRatingFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="2">2+ Stars</SelectItem>
              <SelectItem value="1">1+ Stars</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {total !== undefined && (
          <div className="text-sm text-muted-foreground">
            {total} {total === 1 ? "review" : "reviews"}
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No reviews yet. Be the first to review this service!
            </CardContent>
          </Card>
        ) : (
          reviews?.map((review) => {
            const averageRating = getAverageRating(review)
            return (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={getUserAvatar(review)} />
                        <AvatarFallback>{getUserInitials(review)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{getUserName(review)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(review.createdAt))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={review.overallRating} />
                      <span className="text-sm font-medium">{review.overallRating}.0</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rating Breakdown */}
                  <RatingBreakdown review={review} />

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
                  )}

                  {/* Images */}
                  {review.images && review.images?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {review.images?.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="h-24 w-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setViewingImage({ files: review.images || [], index })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Owner Response */}
                  {showOwnerResponse && review.ownerResponse && (
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Owner Response</Badge>
                        {review.ownerRespondedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(new Date(review.ownerRespondedAt))}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{review.ownerResponse}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <FileViewer
          files={viewingImage.files}
          currentIndex={viewingImage.index}
          onClose={() => setViewingImage(null)}
          title="Review Image"
        />
      )}
    </div>
  )
}

