"use client";

import { useState } from "react";
import { TacticsBoard } from "@/components/tactics-board";
import { MarkdownContent } from "@/components/ui/markdown-content";
import type { TacticCone, TacticPassChain, TacticPlayer } from "@/lib/types";

type ArchiveTacticsPanelProps = {
  players: TacticPlayer[];
  passChains: TacticPassChain[];
  cones: TacticCone[];
  introMarkdown?: string | null;
};

const BOARD_MARKER = "[[spelplan]]";

type SplitMarkdownResult = {
  before: string;
  after: string;
  hasMarker: boolean;
};

function splitInlineBoardMarkdown(markdown: string | null | undefined): SplitMarkdownResult {
  const source = (markdown ?? "").replace(/\r\n/g, "\n");
  if (!source.trim()) {
    return { before: "", after: "", hasMarker: false };
  }

  const firstMarkerIndex = source.indexOf(BOARD_MARKER);
  if (firstMarkerIndex === -1) {
    return {
      before: source.split(BOARD_MARKER).join("").trim(),
      after: "",
      hasMarker: false,
    };
  }

  const before = source
    .slice(0, firstMarkerIndex)
    .split(BOARD_MARKER)
    .join("")
    .trim();
  const after = source
    .slice(firstMarkerIndex + BOARD_MARKER.length)
    .split(BOARD_MARKER)
    .join("")
    .trim();

  return { before, after, hasMarker: true };
}

export function ArchiveTacticsPanel({ players, passChains, cones, introMarkdown }: ArchiveTacticsPanelProps) {
  const [showAreas, setShowAreas] = useState(false);
  const inline = splitInlineBoardMarkdown(introMarkdown);
  const showBefore = inline.before.length > 0;
  const showAfter = inline.after.length > 0;

  const board = (
    <section className="tactics-inline-board" aria-label="Spelplan inline">
      <div className="tactics-inline-toggle-row">
        <button className="tactics-inline-toggle" type="button" onClick={() => setShowAreas((current) => !current)}>
          {showAreas ? "Dolj ytor" : "Visa ytor"}
        </button>
      </div>
      <div className="tactics-board-archive-wrap tactics-inline-board-wrap">
        <TacticsBoard
          mode="view"
          players={players}
          passChains={passChains}
          cones={cones}
          showAreas={showAreas}
          variant="archive"
          surface="bare"
          showPlayerLabels
          className="tactics-board tactics-board--archive tactics-inline-board-surface"
        />
      </div>
    </section>
  );

  return (
    <div className="archive-tabs-content tactics-inline-flow">
      {inline.hasMarker ? (
        <>
          {showBefore ? <MarkdownContent markdown={inline.before} className="tactics-inline-copy" /> : null}
          {board}
          {showAfter ? <MarkdownContent markdown={inline.after} className="tactics-inline-copy" /> : null}
        </>
      ) : (
        <>
          {showBefore ? <MarkdownContent markdown={inline.before} className="tactics-inline-copy" /> : null}
          {board}
        </>
      )}
    </div>
  );
}
