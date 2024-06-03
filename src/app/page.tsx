"use client";

import Script from "next/script";
import { useRef, useState } from "react";

export default function Home() {
  const [isInitializeComplete, setIsInitializeComplete] = useState(false);

  const videoRef = useRef(null);
  const streamUrl =
    "https://4844c5bc739b.us-west-2.playback.live-video.net/api/video/v1/us-west-2.714567495486.channel.FgXf7YVomET2.m3u8";

  const initialize = () => {
    const ivsPlayer = IVSPlayer.create();
    ivsPlayer.attachHTMLVideoElement(videoRef.current);
    ivsPlayer.load(streamUrl);
    ivsPlayer.play();
    setIsInitializeComplete(true);
  };

  return (
    <div>
      <Script
        src="https://player.live-video.net/1.11.0/amazon-ivs-player.min.js"
        onLoad={initialize}
      />
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        className="w-full h-full left-0 top-0 fixed"
      />
    </div>
  );
}
