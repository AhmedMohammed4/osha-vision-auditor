"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
        if (playerRef.current) {
          playerRef.current.seekTo(seconds, "seconds");
        }
      },
    }));

    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-gray-600 text-sm">Loading player...</div>
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
              attributes: {
                crossOrigin: "anonymous",
              },
            },
          }}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
