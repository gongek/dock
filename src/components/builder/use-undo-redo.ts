"use client";

import { useCallback, useRef, useState } from "react";
import type { SiteBlock } from "@/lib/blocks/types";

const MAX_HISTORY = 50;

export function useUndoRedo(initial: SiteBlock[]) {
  const [blocks, setBlocksState] = useState(initial);
  const pastRef = useRef<SiteBlock[][]>([]);
  const futureRef = useRef<SiteBlock[][]>([]);
  const skipHistoryRef = useRef(false);

  const setBlocks = useCallback((next: SiteBlock[], recordHistory = true) => {
    if (recordHistory && !skipHistoryRef.current) {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), blocks];
      futureRef.current = [];
    }
    setBlocksState(next);
  }, [blocks]);

  const resetBlocks = useCallback((next: SiteBlock[]) => {
    skipHistoryRef.current = true;
    setBlocksState(next);
    pastRef.current = [];
    futureRef.current = [];
    skipHistoryRef.current = false;
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1]!;
    pastRef.current = past.slice(0, -1);
    futureRef.current = [blocks, ...futureRef.current];
    skipHistoryRef.current = true;
    setBlocksState(previous);
    skipHistoryRef.current = false;
    return previous;
  }, [blocks]);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[0]!;
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, blocks];
    skipHistoryRef.current = true;
    setBlocksState(next);
    skipHistoryRef.current = false;
    return next;
  }, [blocks]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return {
    blocks,
    setBlocks,
    resetBlocks,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
