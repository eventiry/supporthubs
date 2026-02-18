"use client"

import { useState } from "react"
import { FileViewer } from "./file-viewer"
import { cn } from "./utils"

export interface ImageGalleryProps {
  images: string[]
  className?: string
  maxDisplay?: number // Maximum number of images to show in grid before "View All"
  columns?: 2 | 3 | 4 // Number of columns in grid
}

export function ImageGallery({ images, className, maxDisplay = 6, columns = 3 }: ImageGalleryProps) {
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)

  if (!images || images?.length === 0) return null

  const displayImages = images.slice(0, maxDisplay)
  const hasMore = images?.length > maxDisplay

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  }

  return (
    <>
      <div className={cn("grid gap-2", gridCols[columns], className)}>
        {displayImages?.map((image, index) => (
          <div
            key={index}
            className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group relative"
            onClick={() => setViewingIndex(index)}
          >
            <img
              src={image}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {index === maxDisplay - 1 && hasMore && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-medium">+{images?.length - maxDisplay} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewingIndex !== null && (
        <FileViewer
          files={images}
          currentIndex={viewingIndex}
          onClose={() => setViewingIndex(null)}
          title="Image Gallery"
        />
      )}
    </>
  )
}

