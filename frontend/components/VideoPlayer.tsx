"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import ReactPlayer from "react-player";

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface VideoPlayerProps {
  url: string;
  onDuration?: (duration: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ url, onDuration }, ref) => {
    const playerRef = useRef<ReactPlayer>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        playerRef.current?.seekTo(seconds, "seconds");
      },
    }));

    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden"
           style={{ background: "#000000", border: "1px solid #1e1e30", isolation: "isolate" }}>
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
               style={{ background: "#0f0f1a" }}>
            <div className="relative w-10 h-10">
              <svg className="absolute inset-0 w-full h-full animate-spin"
                   style={{ animationDuration: "1.2s" }}
                   viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#1e1e30" strokeWidth="3"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="#f59e0b" strokeWidth="3"
                        strokeLinecap="round" strokeDasharray="25 75"/>
              </svg>
            </div>
            <p className="text-gray-600 text-xs">Loading player...</p>
          </div>
        )}
        <ReactPlayer
          ref={playerRef}
          url={url}
          controls
          width="100%"
          height="100%"
          onReady={() => setReady(true)}
          onDuration={onDuration}
          config={{
            file: {
              attributes: { crossOrigin: "anonymous" },
            },
          }}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
