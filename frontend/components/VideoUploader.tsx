"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function VideoUploader({
  onFileSelected,
  disabled = false,
}: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setSizeError(null);

      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles[0].errors.map((e: any) => e.message);
        setSizeError(errors.join(". "));
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_SIZE_BYTES) {
        setSizeError(
          `File is too large (${formatBytes(file.size)}). Maximum size is 100 MB.`
        );
        return;
      }

      setSelectedFile(file);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/x-msvideo": [".avi"],
      "video/webm": [".webm"],
      "video/x-matroska": [".mkv"],
    },
    maxFiles: 1,
    maxSize: MAX_SIZE_BYTES,
    disabled,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragActive
              ? "border-yellow-400 bg-yellow-950/20"
              : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {/* Upload icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
            ${isDragActive ? "bg-yellow-500/20" : "bg-gray-800"}`}
          >
            {isDragActive ? "📥" : "🎬"}
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-gray-400 text-sm">{formatBytes(selectedFile.size)}</p>
              <p className="text-green-400 text-sm">✓ Ready to analyze</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-gray-200 font-medium">
                {isDragActive
                  ? "Drop your video here"
                  : "Drag & drop a worksite video"}
              </p>
              <p className="text-gray-500 text-sm">
                or click to browse — MP4, MOV, AVI, WebM up to 100 MB
              </p>
              <p className="text-gray-600 text-xs">Maximum 2 minutes recommended</p>
            </div>
          )}
        </div>
      </div>

      {sizeError && (
        <p className="mt-2 text-red-400 text-sm">{sizeError}</p>
      )}
    </div>
  );
}
