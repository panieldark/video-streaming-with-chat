"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

type AwsIvsPlayerState = "Buffering" | "Ended" | "Idle" | "Playing" | "Ready";
export default function Home() {
  const [isInitializeComplete, setIsInitializeComplete] = useState(false);

  const videoRef = useRef(null);
  const ivsPlayerRef = useRef<typeof IVSPlayer | null>(null);
  const streamUrl =
    "https://4844c5bc739b.us-west-2.playback.live-video.net/api/video/v1/us-west-2.714567495486.channel.FgXf7YVomET2.m3u8";
  const [playerState, setPlayerState] = useState<AwsIvsPlayerState>("Idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [framerate, setFramerate] = useState<string | null>(null);
  const initialize = () => {
    const ivsPlayer = IVSPlayer.create();

    ivsPlayerRef.current = ivsPlayer;

    // event listeners
    ivsPlayer.addEventListener("Playing", () => {
      const quality = ivsPlayer.getQuality();
      // TODO in real app, use videojs that lets you set quality more natively
      setQuality(quality.name);
      setFramerate(quality.framerate);
      // TODO in real app, need to solve the case:
      // ffmpeg server is not serving (stream isn't live), then it starts playing. videojs should pick up this event and autoplay
      setPlayerState("Playing");
    });
    (["Buffering", "Ended", "Idle", "Ready"] as const).forEach((state) =>
      ivsPlayer.addEventListener(state, () => setPlayerState(state))
    );
    ivsPlayer.addEventListener(
      IVSPlayer.PlayerEventType.QUALITY_CHANGED,
      (quality: any) => {
        setQuality(quality.name);
        setFramerate(quality.framerate);
      }
    );

    ivsPlayer.attachHTMLVideoElement(videoRef.current);
    ivsPlayer.load(streamUrl);
    ivsPlayer.play();
    setIsInitializeComplete(true);
  };
  const playerOnline = !(playerState === "Ended" || playerState === "Idle");

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLatency(ivsPlayerRef.current?.getLiveLatency().toFixed(2));
    }, 1500);

    return () => {
      ivsPlayerRef.current?.removeEventListener("Playing", () =>
        setPlayerState("Playing")
      );
      (["Buffering", "Ended", "Idle", "Ready"] as const).forEach((state) =>
        ivsPlayerRef.current?.removeEventListener(state, () =>
          setPlayerState(state)
        )
      );
      clearInterval(intervalId);
    };
  }, [isInitializeComplete]);

  useEffect(() => {
    if (playerState === "Ended") {
      console.log("player ended");
      setLatency(null);
      setQuality(null);
      setFramerate(null);
    }
  }, [playerState]);

  const Badge = ({
    children,
    color = "bg-teal-800"
  }: {
    children: React.ReactNode;
    color?: string;
  }) => (
    <span
      className={twMerge(
        "rounded-lg text-white mb-3 py-0.5 px-1.5 text-sm",
        color
      )}>
      {children}
    </span>
  );
  return (
    <>
      <Script
        src="https://player.live-video.net/1.28.0/amazon-ivs-player.min.js"
        onLoad={initialize}
      />
      <div className="bg-black">
        <div className="flex pt-4 gap-1 flex-row items-center justify-center">
          <Badge color={playerOnline ? "bg-green-600" : "bg-gray-600"}>
            {playerOnline ? "Online" : "Offline"}
          </Badge>
          <Badge>Current State: {playerState}</Badge>
          {latency && <Badge>Latency: {latency}ms</Badge>}
          {quality && <Badge>Quality: {quality}</Badge>}
          {framerate && <Badge>Framerate: {framerate}</Badge>}
        </div>

        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="w-full h-[90%] left-0 top-16 fixed"
        />
      </div>
    </>
  );
}
