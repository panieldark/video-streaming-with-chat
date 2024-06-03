"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

type AwsIvsPlayerState = "Buffering" | "Ended" | "Idle" | "Playing" | "Ready";
export default function Home() {
  const [isInitializeComplete, setIsInitializeComplete] = useState(false);

  const videoRef = useRef(null);
  const ivsPlayerRef = useRef(null);
  const streamUrl =
    "https://4844c5bc739b.us-west-2.playback.live-video.net/api/video/v1/us-west-2.714567495486.channel.FgXf7YVomET2.m3u8";
  const [playerState, setPlayerState] = useState<AwsIvsPlayerState>("Idle");
  const initialize = () => {
    const ivsPlayer = IVSPlayer.create();

    ivsPlayerRef.current = ivsPlayer;
    ivsPlayer.attachHTMLVideoElement(videoRef.current);
    ivsPlayer.load(streamUrl);
    ivsPlayer.play();
    ivsPlayer.addEventListener(IVSPlayer.PlayerState.PLAYING, () =>
      setPlayerState("Playing")
    );
    (["Buffering", "Ended", "Idle", "Ready"] as const).forEach((state) =>
      ivsPlayer.addEventListener(state, () => setPlayerState(state))
    );

    setIsInitializeComplete(true);
  };
  const playerOnline = !(playerState === "Ended");

  return (
    <>
      <Script
        src="https://player.live-video.net/1.28.0/amazon-ivs-player.min.js"
        onLoad={initialize}
      />
      <div className="bg-black">
        <div className="flex py-2 flex-row items-center justify-center">
          <span
            className={twMerge(
              "rounded-md text-white mb-3 p-2",
              playerOnline ? "bg-green-600" : "bg-gray-600"
            )}>
            {playerOnline ? "Online" : "Offline"}
          </span>
          <span className="rounded-md text-white mb-3 p-2">
            Current State: {playerState}
          </span>
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
