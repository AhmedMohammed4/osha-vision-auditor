"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function VideoUploader({ onFileSelected, disabled = false }: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setSizeError(null);
      if (rejectedFiles.length > 0) {
        setSizeError(rejectedFiles[0].errors.map((e: any) => e.message).join(". "));
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;
      if (file.size > MAX_SIZE_BYTES) {
        setSizeError(`File too large (${formatBytes(file.size)}). Max 100 MB.`);
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
        className={`relative overflow-hidden rounded-xl border-2 border-dashed px-6 py-10
                    text-center cursor-pointer transition-all duration-200 select-none
                    ${isDragActive
                      ? "border-amber-500/60 bg-amber-500/5"
                      : selectedFile
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/8 hover:border-white/15 bg-white/2"
                    }
                    ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        {/* Background glow when dragging */}
        {isDragActive && (
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: "radial-gradient(ellipse at center, rgba(245,158,11,0.06) 0%, transparent 70%)" }} />
        )}

        <div className="relative flex flex-col items-center gap-4">
          {/* Icon area */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200
                          ${isDragActive ? "scale-110" : "scale-100"}
                          ${selectedFile ? "bg-emerald-500/10 border border-emerald-500/20"
                                         : "bg-white/5 border border-white/8"}`}>
            {selectedFile ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 7L9 18L4 13" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : isDragActive ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 18H21" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="#6b7280" strokeWidth="1.5"/>
                <path d="M10 9L15 12L10 15V9Z" fill="#6b7280"/>
              </svg>
            )}
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <p className="text-white font-semibold text-sm">{selectedFile.name}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-500 text-xs">{formatBytes(selectedFile.size)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-700" />
                <span className="text-emerald-400 text-xs font-medium">Ready to analyze</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setSizeError(null); }}
                className="text-gray-600 hover:text-gray-400 text-xs underline mt-1 transition-colors"
              >
                Change file
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-gray-300 font-medium text-sm">
                {isDragActive ? "Drop to upload" : "Drop your video here"}
              </p>
              <p className="text-gray-600 text-xs">
                or <span className="text-gray-400 underline cursor-pointer">browse files</span>
              </p>
              <p className="text-gray-700 text-xs pt-1">MP4 · MOV · AVI · WebM — up to 100 MB</p>
            </div>
          )}
        </div>
      </div>

      {sizeError && (
        <p className="mt-2 text-red-400 text-xs px-1">{sizeError}</p>
      )}
    </div>
  );
}
