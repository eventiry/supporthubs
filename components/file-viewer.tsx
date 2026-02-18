"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { Button } from "./button"
import { Download, ChevronLeft, ChevronRight } from "lucide-react"

export interface FileViewerProps {
  files: string[]
  currentIndex?: number
  onClose: () => void
  title?: string
}

export function FileViewer({ files, currentIndex = 0, onClose, title }: FileViewerProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseStartX = useRef<number | null>(null)
  const isDragging = useRef(false)

  const fileCount = files?.length ?? 0
  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : fileCount - 1))
  }, [fileCount])

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev < fileCount - 1 ? prev + 1 : 0))
  }, [fileCount])

  // Update active index when currentIndex prop changes
  useEffect(() => {
    setActiveIndex(currentIndex)
  }, [currentIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious()
      } else if (e.key === "ArrowRight") {
        goToNext()
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goToPrevious, goToNext, onClose])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = currentFile
    // Try to extract filename from URL
    try {
      const urlObj = new URL(currentFile)
      const pathParts = urlObj.pathname.split("/")
      const fileName = pathParts[pathParts.length - 1]
      link.download = fileName.replace(/^\d+-[a-z0-9]+-/, "") || "file"
    } catch {
      const parts = currentFile.split("/")
      link.download = parts[parts.length - 1] || "file"
    }
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe left - next
        goToNext()
      } else {
        // Swipe right - previous
        goToPrevious()
      }
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  // Mouse drag handlers for desktop (refs declared at top)
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX
    isDragging.current = true
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return
    e.preventDefault()
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return

    const distance = mouseStartX.current - e.clientX
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Drag left - next
        goToNext()
      } else {
        // Drag right - previous
        goToPrevious()
      }
    }

    mouseStartX.current = null
    isDragging.current = false
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="h-full">
        <DialogHeader className="px-6 pt-2 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{title || `File ${activeIndex + 1} of ${files?.length}`}</DialogTitle>
            <div className="flex items-center gap-2">
              {files?.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPrevious} aria-label="Previous file">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {activeIndex + 1} / {files?.length}
                  </span>
                  <Button variant="outline" size="icon" onClick={goToNext} aria-label="Next file">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download file">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/50 min-h-[400px] select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            mouseStartX.current = null
            isDragging.current = false
          }}
        >
          {isImage && (
            <img
              src={currentFile}
              alt={`File ${activeIndex + 1}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              draggable={false}
            />
          )}

          {isPDF && (
            <iframe
              src={`${currentFile}#toolbar=1`}
              className="w-full h-[70vh] border rounded-lg"
              title={`PDF ${activeIndex + 1}`}
            />
          )}

          {isVideo && (
            <video
              src={currentFile}
              controls
              className="max-w-full max-h-[70vh] rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          )}

          {!isImage && !isPDF && !isVideo && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Preview not available for this file type</p>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}

          {/* Navigation hints */}
          {files?.length > 1 && (
            <>
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="bg-background/80 hover:bg-background"
                  aria-label="Previous file"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="bg-background/80 hover:bg-background"
                  aria-label="Next file"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Keyboard hint */}
        {files?.length > 1 && (
          <div className="px-6 pb-4 text-center">
            <p className="text-xs text-muted-foreground">
              Use arrow keys or swipe to navigate • Press Esc to close
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
