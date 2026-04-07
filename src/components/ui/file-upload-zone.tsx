import * as React from "react"
import { type FileRejection, useDropzone } from "react-dropzone"
import { File, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface FileUploadZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (file: File | null) => void
  accept?: Record<string, string[]>
  disabled?: boolean
  value?: File | null
  label?: React.ReactNode
  description?: string
  id?: string
  maxSize?: number
  className?: string
}

function buildRejectionMessage(rejection: FileRejection | undefined, maxSize: number) {
  if (!rejection) return ""

  const firstError = rejection.errors[0]
  if (!firstError) return "File was rejected."

  if (firstError.code === "file-too-large") {
    return `File is too large. Maximum size is ${(maxSize / (1024 * 1024)).toFixed(0)} MB.`
  }

  if (firstError.code === "file-invalid-type") {
    return "This file type is not supported for this upload."
  }

  return firstError.message || "File was rejected."
}

export const FileUploadZone = React.forwardRef<HTMLDivElement, FileUploadZoneProps>(
  function FileUploadZone(
    {
      onFileSelect,
      accept,
      disabled = false,
      value,
      label,
      description,
      id,
      maxSize = 100 * 1024 * 1024,
      className,
      ...divProps
    },
    ref
  ) {
    const generatedId = React.useId()
    const inputId = id || `file-upload-${generatedId}`
    const descriptionId = `${inputId}-description`
    const statusId = `${inputId}-status`
    const [statusMessage, setStatusMessage] = React.useState("")
    const [hasError, setHasError] = React.useState(false)

    const onDrop = React.useCallback(
      (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
          setHasError(false)
          setStatusMessage(`Selected file: ${acceptedFiles[0].name}.`)
          onFileSelect(acceptedFiles[0])
        }
      },
      [onFileSelect]
    )

    const onDropRejected = React.useCallback(
      (fileRejections: FileRejection[]) => {
        setHasError(true)
        setStatusMessage(buildRejectionMessage(fileRejections[0], maxSize))
      },
      [maxSize]
    )

    const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
      onDrop,
      onDropRejected,
      accept,
      disabled,
      maxSize,
      multiple: false,
      noClick: true,
      noKeyboard: true,
    })

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      setHasError(false)
      setStatusMessage("File selection cleared.")
      onFileSelect(null)
    }

    const statusClassName =
      statusMessage.length === 0 ? "sr-only" : hasError || isDragReject ? "text-destructive" : "text-muted-foreground"

    return (
      <div ref={ref} className={className} {...divProps}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div
          {...getRootProps()}
          className={cn(
            "relative mt-2 flex items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors",
            "hover:border-primary/50 hover:bg-accent/50",
            isDragActive && "border-primary bg-accent",
            isDragReject && "border-destructive bg-destructive/10",
            disabled && "opacity-50",
            value && "border-solid py-4"
          )}
        >
          <input
            {...getInputProps({
              id: inputId,
              "aria-describedby": `${descriptionId} ${statusId}`,
            })}
          />

          {value ? (
            <div className="flex w-full items-center gap-3">
              <File className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{value.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(value.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={open}
                  disabled={disabled}
                >
                  Browse files
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={handleClear}
                  disabled={disabled}
                  aria-label="Clear selected file"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <Upload
                className={cn(
                  "mx-auto size-8 text-muted-foreground",
                  isDragActive && "text-primary"
                )}
              />
              <p className="text-sm">
                <span className="font-medium text-foreground">
                  {isDragActive ? "Drop file here" : "Drag and drop a file here"}
                </span>
                <span className="text-muted-foreground"> or browse from your device</span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={open}
                disabled={disabled}
              >
                Browse files
              </Button>
              <div id={descriptionId} className="space-y-1">
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
                <p className="text-2xs text-muted-foreground/80">
                  Keyboard: tab to the browse button and press Enter or Space.
                </p>
              </div>
            </div>
          )}
        </div>
        <p id={statusId} aria-live="polite" className={cn("mt-2 text-xs", statusClassName)}>
          {statusMessage || "No file selected."}
        </p>
      </div>
    )
  }
)

FileUploadZone.displayName = "FileUploadZone"
