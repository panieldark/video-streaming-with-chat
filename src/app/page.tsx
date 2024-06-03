"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

type AwsIvsPlayerState = "Buffering" | "Ended" | "Idle" | "Playing" | "Ready";
export default function Home() {
  const [isInitializeComplete, setIsInitializeComplete] = useState(false);

  const videoRef = useRef(null);
  const ivsPlayerRef = useRef<typeof IVSPlayer | null>(null);
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL;
  const [playerState, setPlayerState] = useState<AwsIvsPlayerState>("Idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [framerate, setFramerate] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { username: string; content: string }[]
  >([]);
  const [textInputValue, setTextInputValue] = useState("");
  const [overlayText, setOverlayText] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
    ivsPlayer.addEventListener(
      IVSPlayer.PlayerEventType.TEXT_METADATA_CUE,
      (metadata: any) => {
        console.log(metadata);
        setOverlayText(metadata?.text);
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

  useEffect(() => {
    const initChat = async (username: string) => {
      const chatAccessToken = await fetch("/api/create-token", {
        method: "POST",
        body: JSON.stringify({
          username
        })
      }).then((res) => res.text());
      const ws = new WebSocket(
        "wss://edge.ivschat.us-west-2.amazonaws.com",
        chatAccessToken
      );
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            action: "SEND_MESSAGE",
            content: "*joined the chat*",
            attributes: {
              username: username
            }
          })
        );
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
        setChatMessages((prev) => [
          ...prev,
          {
            username: data?.Attributes?.username,
            content: data?.Content
          }
        ]);
      };
    };
    if (username) {
      initChat(username);
    }
  }, [username]);

  useEffect(() => {
    console.log(wsRef.current);
  }, [wsRef.current, chatMessages]);
  const sendChatMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          action: "SEND_MESSAGE",
          content: textInputValue,
          attributes: {
            username
          }
        })
      );
    }
    setTextInputValue("");
    console.log(chatMessages);
  };

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

  useEffect(() => {
    // Scroll to the bottom of the chat container when chatMessages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight - 50;
    }
  }, [chatMessages]);

  return (
    <>
      {!username ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-3xl font-bold mb-4">Enter your username</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // @ts-ignore
              setUsername(e.target.username.value);
            }}>
            <input
              type="text"
              className="p-2 bg-gray-800 text-white"
              placeholder="Username"
              name="username"
            />
            <button className="p-2 bg-primary text-white mt-4" type="submit">
              Submit
            </button>
          </form>
        </div>
      ) : (
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
              {username && (
                <Badge color="bg-teal-600">Username: {username}</Badge>
              )}
            </div>

            <div className="grid grid-cols-[75%_25%] gap-2 items-center justify-center w-full h-[90%] left-0 top-16 fixed">
              <div className="relative">
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  className="w-full"
                />
                {overlayText && overlayText !== " " && (
                  <div className="absolute top-4 left-4 bg-gray-600 p-2 rounded-sm text-white z-10">
                    {overlayText}
                  </div>
                )}
              </div>
              <div
                className="flex flex-col max-h-[80%] w-full h-full overflow-y-scroll justify-between relative"
                ref={chatContainerRef}>
                <div>
                  {chatMessages.map((message, i) => (
                    <div className="mb-2" key={i}>
                      <b
                        className={twMerge(
                          "text-primary",
                          message.username === username && "text-green-400"
                        )}>
                        {message.username}
                      </b>
                      : {message.content}
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={sendChatMessage}
                  className="flex flex-col gap-2 w-full">
                  <input
                    type="text"
                    className="p-1 bg-gray-800 text-white"
                    name="message"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                  />
                  <button type="submit">Send</button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
