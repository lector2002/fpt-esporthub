"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getSocket } from "@/features/chat/socket";
import { useSession } from "@/lib/session";
import {
  handleCallEnded,
  handleCallState,
  handleDisconnect,
  handleRoomSignal,
  handleRoomState,
  handleSignal,
  leaveCall,
  syncCalls,
} from "./call-controller";
import { useVoiceMessages } from "./messages";
import type { CallEndReason, CallEndedEvent, CallInfo, RoomInfo } from "./types";

const END_KEYS = { ended: "callEnded", declined: "callDeclined", no_answer: "callNoAnswer" } as const satisfies Record<CallEndReason, string>;

/**
 * Listens for `call:*` and `room:*` events on the shared `/realtime` socket. Never connects or disconnects it:
 * `useRealtimeSync` owns the socket lifecycle. Mount once (the voice layer does it).
 */
export function useVoiceSocket() {
  const { t } = useVoiceMessages();
  const tRef = useRef(t);
  const { status } = useSession();

  useEffect(() => {
    tRef.current = t;
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket || status !== "authenticated") return;

    const onState = ({ call }: { call: CallInfo }) => {
      if (handleCallState(call)) toast(tRef.current("callEnded"));
    };
    const onEnded = (event: CallEndedEvent) => {
      if (handleCallEnded(event)) toast(tRef.current(END_KEYS[event.reason] ?? "callEnded"));
    };
    const onRoom = ({ room }: { room: RoomInfo }) => {
      if (handleRoomState(room)) toast(tRef.current("leftRoom"));
    };
    const onConnect = () => void syncCalls();
    const onDisconnect = () => {
      if (handleDisconnect()) toast.error(tRef.current("connectionLost"));
    };
    const onUnload = () => leaveCall();

    socket.on("call:state", onState);
    socket.on("call:ringing", onState);
    socket.on("call:ended", onEnded);
    socket.on("call:signal", handleSignal);
    socket.on("room:state", onRoom);
    socket.on("room:signal", handleRoomSignal);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    if (socket.connected) void syncCalls();

    return () => {
      socket.off("call:state", onState);
      socket.off("call:ringing", onState);
      socket.off("call:ended", onEnded);
      socket.off("call:signal", handleSignal);
      socket.off("room:state", onRoom);
      socket.off("room:signal", handleRoomSignal);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      leaveCall();
    };
  }, [status]);
}
