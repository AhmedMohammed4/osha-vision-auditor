"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import VideoUploader from "@/components/VideoUploader";
import LiveCaptureRecorder from "@/components/LiveCaptureRecorder";
import ProcessingStatus from "@/components/ProcessingStatus";
import { cancelProcessing, getSavedDemo, getVideo, startProcessing, uploadVideo, warmUpBackend } from "@/lib/api";
import { MAX_VIDEO_SECONDS, readVideoDuration } from "@/lib/video-duration";
import { useAuth } from "@/context/AuthContext";

type PageState = "idle" | "uploading" | "starting" | "processing" | "error";

function errorText(error: unknown, fallback: string) {
  const detail = isAxiosError(error) ? error.response?.data?.detail : null;
  return typeof detail === "string" ? detail : fallback;
}

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, session, loading } = useAuth();
  const [pageState, setPageState] = useState<PageState>("idle");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checkedClip, setCheckedClip] = useState<{ file: File; duration: number | null } | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "live">("upload");
  const [notice, setNotice] = useState<string | null>(null);
  const [openingDemo, setOpeningDemo] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const submitting = useRef(false);

  const checkingClip = selectedFile !== null && checkedClip?.file !== selectedFile;
  const clipDuration = checkedClip?.file === selectedFile ? checkedClip?.duration ?? null : null;
  const clipTooLong = clipDuration !== null && clipDuration > MAX_VIDEO_SECONDS;

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) void warmUpBackend().catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedFile) return;
    let current = true;
    void readVideoDuration(selectedFile).then((duration) => {
      if (current) setCheckedClip({ file: selectedFile, duration });
    });
    return () => { current = false; };
  }, [selectedFile]);

  const { data: videoData, isError: progressFailed } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideo(videoId!),
    enabled: !!videoId && pageState === "processing",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed" || status === "cancelled") return false;
      return 2000;
    },
    retry: 2,
  });

  useEffect(() => {
    if (pageState !== "processing") return;
    if (videoData?.status === "completed" && videoId) {
      router.push(`/dashboard/${videoId}`);
      return;
    }
    if (videoData?.status === "failed") {
      setPageState("error");
      setErrorMessage(
        videoData.report?.startsWith("Video analysis could not finish.")
          ? videoData.report
          : "Video processing failed. Please try again."
      );
      return;
    }
    if (videoData?.status === "cancelled") {
      setVideoId(null);
      setSelectedFile(null);
      setPageState("idle");
      setErrorMessage(null);
      setNotice("Audit cancelled.");
      return;
    }
    if (progressFailed) {
      setPageState("error");
      setErrorMessage("Couldn't check the audit status. Retry to reconnect to this upload.");
    }
  }, [pageState, progressFailed, videoData, videoId, router]);

  function selectFile(file: File | null) {
    setSelectedFile(file);
    setVideoId(null);
    setErrorMessage(null);
    setNotice(null);
    setPageState("idle");
  }

  async function handleStartAnalysis() {
    if (!selectedFile || !session || checkingClip || clipTooLong || submitting.current) return;
    submitting.current = true;
    let currentId = videoId;
    try {
      setErrorMessage(null);
      if (!currentId) {
        setPageState("uploading");
        const uploaded = await uploadVideo(selectedFile, session.access_token);
        currentId = uploaded.video_id;
        setVideoId(currentId);
      }
      setPageState("starting");
      await startProcessing(currentId, session.access_token);
      queryClient.removeQueries({ queryKey: ["video", currentId], exact: true });
      setPageState("processing");
    } catch (error) {
      setErrorMessage(errorText(error, "Couldn't start the audit. Please try again."));
      setPageState("error");
    } finally {
      submitting.current = false;
    }
  }

  async function handleCancel() {
    if (!videoId || !session || cancelling) return;
    setCancelling(true);
    try {
      await cancelProcessing(videoId, session.access_token);
      selectFile(null);
      setNotice("Audit cancelled.");
    } catch (error) {
      setErrorMessage(errorText(error, "Couldn't cancel the audit. Please try again."));
    } finally {
      setCancelling(false);
    }
  }

  async function openDemo() {
    if (!session || openingDemo) return;
    setOpeningDemo(true);
    setNotice(null);
    try {
      const demoId = await getSavedDemo(session.access_token);
      router.push(`/dashboard/${demoId}`);
    } catch (error) {
      setNotice(errorText(error, "Couldn't open the saved demo. Please try again."));
      setOpeningDemo(false);
    }
  }

  if (loading || !user) return null;

  const isActive = pageState === "idle" || pageState === "error";

  return (
    <div className="grid-bg min-h-[calc(100vh-3.5rem)] -mt-10 -mx-5 sm:-mx-8 px-5 sm:px-8 pt-10">
      <div className="max-w-2xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-3 leading-tight">
            Run a worksite audit
          </h1>
          <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto">
            Drop in any construction video. OpenAI reviews sampled frames for OSHA
            violations, then scores the risk and generates a report.
          </p>
          <button type="button" className="btn-ghost mt-4 text-sm" onClick={openDemo} disabled={openingDemo || !isActive}>
            {openingDemo ? "Opening demo..." : "View saved demo"}
          </button>
          {notice && <p className="mt-2 text-sm text-gray-300" role="status">{notice}</p>}
        </div>

        {/* Upload card */}
        <div className="card glow-red animate-fade-in-up" style={{ animationDelay: "0.1s", border: "1px solid rgba(255,255,255,0.32)" }}>
          {isActive ? (
            <div className="space-y-4">
                <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1 text-xs">
                  <button
                  type="button"
                  onClick={() => { setInputMode("upload"); selectFile(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${
                    inputMode === "upload" ? "bg-red-600/20 text-red-300" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Upload video
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode("live"); selectFile(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${
                    inputMode === "live" ? "bg-red-600/20 text-red-300" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Live capture
                </button>
              </div>

              {inputMode === "upload" ? (
                <VideoUploader selectedFile={selectedFile} onFileSelected={selectFile} />
              ) : (
                <LiveCaptureRecorder onFileReady={selectFile} onReset={() => selectFile(null)} />
              )}
              
              {selectedFile && (
                <button
                  onClick={handleStartAnalysis}
                  disabled={checkingClip || clipTooLong || openingDemo}
                  className="btn-primary w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor"/>
                  </svg>
                  {checkingClip ? "Checking clip length..." : videoId ? "Retry this audit" : "Analyze for OSHA Violations"}
                </button>
              )}
              {selectedFile && !checkingClip && (
                <p className={clipTooLong ? "text-sm text-red-400" : "text-xs text-gray-400"}>
                  {clipDuration === null
                    ? "The server will check the clip length before analysis. Limit: 2 minutes."
                    : clipTooLong
                      ? `This clip is ${Math.ceil(clipDuration)} seconds. Trim it to two minutes or less and select it again.`
                      : `${Math.ceil(clipDuration)}-second clip · Up to 2 minutes per audit`}
                </p>
              )}

              {errorMessage && (
                <div className="rounded-xl px-4 py-3 text-sm"
                     style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-red-400 font-medium mb-0.5">Analysis failed</p>
                  <p className="text-red-400/70">{errorMessage}</p>
                  <button onClick={() => selectFile(null)} className="text-xs text-red-500 hover:text-red-300 mt-2 underline">
                    Choose a different clip
                  </button>
                </div>
              )}
            </div>
          ) : pageState === "uploading" ? (
            <ProcessingStatus
              message="Uploading video..."
              subMessage="Sending your video and waiting for the server"
            />
          ) : pageState === "starting" ? (
            <ProcessingStatus message="Starting the audit..." subMessage="Connecting to the analysis worker" />
          ) : (
            <>
              <ProcessingStatus progress={videoData?.progress} />
              <div className="pb-5 text-center">
                <button type="button" className="btn-ghost text-sm" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? "Cancelling..." : "Cancel audit"}
                </button>
                {errorMessage && <p className="mt-2 text-xs text-red-400" role="status">{errorMessage}</p>}
              </div>
            </>
          )}
        </div>

        {/* Info row */}
        {isActive && (
          <div className="mt-5 flex items-center justify-center gap-6 animate-fade-in-up text-xs text-gray-700"
               style={{ animationDelay: "0.2s" }}>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="#555" strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              OpenAI vision
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="#555" strokeWidth="1"/>
                <path d="M6 3.5V6L7.5 7.5" stroke="#555" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              Frame every 2s
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="2" width="9" height="8" rx="1.5" stroke="#555" strokeWidth="1"/>
                <path d="M3.5 5H8.5M3.5 7H6.5" stroke="#555" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              OpenAI report
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5L10 4V8L6 10.5L2 8V4L6 1.5Z" stroke="#555" strokeWidth="1" strokeLinejoin="round"/>
                <path d="M4 6L5.5 7.5L8.5 4.5" stroke="#555" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              OSHA framework
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
