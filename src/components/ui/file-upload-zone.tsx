import * as React from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface FileUploadZoneProps {
  onFileSelect: (file: File | null) => void
  accept?: Record<string, string[]>
  disabled?: boolean
  value?: File | null
  label?: string
  description?: string
  id?: string
  maxSize?: number
  className?: string
}

export function FileUploadZone({
  onFileSelect,
  accept,
  disabled = false,
  value,
  label,
  description,
  id,
  maxSize = 100 * 1024 * 1024,
  className,
}: FileUploadZoneProps) {
  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      disabled,
      maxSize,
      multiple: false,
    })

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileSelect(null)
  }

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div
        {...getRootProps()}
        className={cn(
          "relative mt-2 flex items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/50",
          isDragActive && "border-primary bg-accent",
          isDragReject && "border-destructive bg-destructive/10",
          disabled && "pointer-events-none opacity-50",
          value && "border-solid py-4"
        )}
      >
        <input {...getInputProps()} id={id} />

        {value ? (
          <div className="flex items-center gap-3 w-full">
            <File className="size-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{value.name}</p>
              <p className="text-xs text-muted-foreground">
                {(value.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={handleClear}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload
              className={cn(
                "mx-auto size-8 mb-2 text-muted-foreground",
                isDragActive && "text-primary"
              )}
            />
            <p className="text-sm mb-1">
              <span className="font-medium text-foreground">
                {isDragActive ? "Drop file here" : "Click to upload"}
              </span>
              <span className="text-muted-foreground"> or drag and drop</span>
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
