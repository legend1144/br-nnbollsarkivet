"use client";

import { useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { TacticCone, TacticPassChain, TacticPlayer } from "@/lib/types";
import { clamp01, resolveRemainingPassSegments } from "@/lib/tactics";

type DragState =
  | { type: "player"; id: string }
  | { type: "cone"; id: string }
  | null;

type TacticsBoardProps = {
  players: TacticPlayer[];
  passChains?: TacticPassChain[];
  cones?: TacticCone[];
  mode?: "view" | "edit";
  showAreas?: boolean;
  variant?: "admin" | "archive";
  surface?: "panel" | "bare";
  showPlayerLabels?: boolean;
  className?: string;
  onPlayersChange?: (players: TacticPlayer[]) => void;
  onConesChange?: (cones: TacticCone[]) => void;
};

const width = 600;
const height = 600;
const FIELD_INSET = 30;
const PLAYER_RADIUS_BASE = 5.8;
const PLAYER_LABEL_FONT_SIZE = 11;
const CONE_SIZE_BASE = 10;
const CHAIN_WIDTH_BASE = 2.35;
const CHAIN_BASE_COLOR = "color-mix(in oklab, var(--gold-specular) 48%, #e4e9ef 52%)";
const CHAIN_GLOW_COLOR = "color-mix(in oklab, var(--gold-bright) 34%, #d7dfe8 66%)";

function toX(value: number) {
  return value * width;
}

function toY(value: number) {
  return value * height;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function diamondPoints(half: number) {
  return `0 ${-half} ${half} 0 0 ${half} ${-half} 0`;
}

export function TacticsBoard({
  players,
  passChains = [],
  cones = [],
  mode = "view",
  showAreas = true,
  variant = "admin",
  surface = "panel",
  showPlayerLabels = true,
  className,
  onPlayersChange,
  onConesChange,
}: TacticsBoardProps) {
  const [dragState, setDragState] = useState<DragState>(null);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [tappedPlayerId, setTappedPlayerId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const markerId = useId().replace(/:/g, "");
  const clipPathId = `field-clip-${markerId}`;

  const boardScale = variant === "archive" ? 0.92 : 1;
  const playerRadius = PLAYER_RADIUS_BASE * boardScale;
  const playerHitRadius = Math.max(playerRadius + 8, 17);
  const labelFontSize = PLAYER_LABEL_FONT_SIZE * boardScale;
  const labelOffsetY = playerRadius + 10;
  const burnerSize = playerRadius * 2.05;
  const burnerRingSize = burnerSize + 2;
  const burnerHaloSize = burnerSize + 3.6;
  const haloRadius = playerRadius + 1.45;
  const ringRadius = playerRadius + 0.8;
  const coneSize = CONE_SIZE_BASE * boardScale;
  const chainWidth = CHAIN_WIDTH_BASE * boardScale;
  const chainGlowWidth = chainWidth + 1.1;
  const burnerCorePoints = diamondPoints(burnerSize / 2);
  const burnerRingPoints = diamondPoints(burnerRingSize / 2);
  const burnerHaloPoints = diamondPoints(burnerHaloSize / 2);
  const wrapperClassName =
    surface === "panel"
      ? cn("panel panel--elevated overflow-hidden", variant === "archive" ? "p-3" : "p-4")
      : cn("tactics-board-surface-bare", variant === "archive" ? "tactics-board-surface-bare--archive" : "");

  const playerIds = useMemo(() => new Set(players.map((player) => player.id)), [players]);
  const activeHoveredPlayerId = hoveredPlayerId && playerIds.has(hoveredPlayerId) ? hoveredPlayerId : null;
  const activeTappedPlayerId = tappedPlayerId && playerIds.has(tappedPlayerId) ? tappedPlayerId : null;
  const focusedPlayerId = activeHoveredPlayerId ?? activeTappedPlayerId;

  const visibleSegments = useMemo(
    () => resolveRemainingPassSegments(passChains, players, focusedPlayerId),
    [passChains, players, focusedPlayerId],
  );

  const visibleAreaPlayers = useMemo(() => {
    if (showAreas) {
      return players;
    }
    if (!focusedPlayerId) {
      return [];
    }
    return players.filter((player) => player.id === focusedPlayerId);
  }, [focusedPlayerId, players, showAreas]);

  function isTouchLikePointer(pointerType: string) {
    return pointerType === "touch" || pointerType === "pen";
  }

  function resolvePointer(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;

    const bounds = svg.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;

    return {
      x: clamp01((clientX - bounds.left) / bounds.width),
      y: clamp01((clientY - bounds.top) / bounds.height),
    };
  }

  function moveFromPointer(clientX: number, clientY: number) {
    const point = resolvePointer(clientX, clientY);
    if (!point) return;

    if (dragState?.type === "player" && onPlayersChange) {
      onPlayersChange(players.map((player) => (player.id === dragState.id ? { ...player, x: point.x, y: point.y } : player)));
      return;
    }

    if (dragState?.type === "cone" && onConesChange) {
      onConesChange(cones.map((cone) => (cone.id === dragState.id ? { ...cone, x: point.x, y: point.y } : cone)));
    }
  }

  function handleBoardPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (mode !== "edit" || !dragState) return;
    event.preventDefault();
    moveFromPointer(event.clientX, event.clientY);
  }

  function handleBoardPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!isTouchLikePointer(event.pointerType)) return;
    const target = event.target as Element | null;
    if (target?.closest('[data-interactive="true"]')) {
      return;
    }
    setTappedPlayerId(null);
  }

  function handleBoardPointerUp() {
    if (mode !== "edit") return;
    setDragState(null);
  }

  function handleBoardPointerLeave(event: ReactPointerEvent<SVGSVGElement>) {
    handleBoardPointerUp();
    if (event.pointerType === "mouse") {
      setHoveredPlayerId(null);
    }
  }

  function handlePlayerPointerEnter(playerId: string, event: ReactPointerEvent<SVGGElement>) {
    if (event.pointerType !== "mouse") return;
    setHoveredPlayerId(playerId);
  }

  function handlePlayerPointerLeave(playerId: string, event: ReactPointerEvent<SVGGElement>) {
    if (event.pointerType !== "mouse") return;
    setHoveredPlayerId((current) => (current === playerId ? null : current));
  }

  function handlePlayerPointerDown(playerId: string, event: ReactPointerEvent<SVGGElement>) {
    if (isTouchLikePointer(event.pointerType)) {
      setTappedPlayerId((current) => (current === playerId ? null : playerId));
    }

    if (mode !== "edit" || !onPlayersChange) return;
    setDragState({ type: "player", id: playerId });
    moveFromPointer(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function handleConePointerDown(coneId: string, event: ReactPointerEvent<SVGRectElement>) {
    if (mode !== "edit" || !onConesChange) return;
    setDragState({ type: "cone", id: coneId });
    moveFromPointer(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  return (
    <div
      className={cn(
        wrapperClassName,
        className,
      )}
    >
      <div className="overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={cn(
            "tactics-board__svg h-auto w-full select-none",
            variant === "archive" ? "rounded-lg" : "rounded-xl",
            "border border-cyan-400/20",
            mode === "edit" ? "touch-none" : "",
          )}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onPointerCancel={handleBoardPointerUp}
          onPointerLeave={handleBoardPointerLeave}
        >
          <defs>
            <clipPath id={clipPathId}>
              <rect
                x={FIELD_INSET}
                y={FIELD_INSET}
                width={width - FIELD_INSET * 2}
                height={height - FIELD_INSET * 2}
              />
            </clipPath>
            <linearGradient id={`field-border-${markerId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--gold-base) 56%, var(--gold-deep) 44%)" />
              <stop offset="50%" stopColor="color-mix(in oklab, var(--gold-specular) 54%, var(--gold-bright) 46%)" />
              <stop offset="100%" stopColor="color-mix(in oklab, var(--gold-base) 56%, var(--gold-deep) 44%)" />
            </linearGradient>
            <linearGradient id={`chain-stroke-${markerId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={CHAIN_BASE_COLOR} />
              <stop offset="50%" stopColor="color-mix(in oklab, var(--gold-specular) 66%, #eef2f8 34%)" />
              <stop offset="100%" stopColor={CHAIN_BASE_COLOR} />
            </linearGradient>
            <radialGradient id={`player-core-${markerId}`} cx="38%" cy="34%" r="78%">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--gold-specular) 38%, #f5f7fb 62%)" />
              <stop offset="52%" stopColor="color-mix(in oklab, var(--gold-bright) 34%, var(--surface-2) 66%)" />
              <stop offset="100%" stopColor="color-mix(in oklab, var(--gold-deep) 34%, var(--surface-3) 66%)" />
            </radialGradient>
            <linearGradient id={`player-ring-${markerId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--gold-bright) 60%, var(--gold-base) 40%)" />
              <stop offset="50%" stopColor="var(--gold-specular)" />
              <stop offset="100%" stopColor="color-mix(in oklab, var(--gold-bright) 60%, var(--gold-base) 40%)" />
            </linearGradient>
            <filter id={`player-shadow-${markerId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.65" floodColor="rgba(0, 0, 0, 0.26)" />
            </filter>
          </defs>

          <rect x={0} y={0} width={width} height={height} fill="var(--bg-2)" />
          <rect
            x={FIELD_INSET}
            y={FIELD_INSET}
            width={width - FIELD_INSET * 2}
            height={height - FIELD_INSET * 2}
            fill="none"
            stroke={`url(#field-border-${markerId})`}
            strokeOpacity={0.84}
            strokeWidth={2.25}
          />
          <rect
            x={FIELD_INSET + 0.8}
            y={FIELD_INSET + 0.8}
            width={width - FIELD_INSET * 2 - 1.6}
            height={height - FIELD_INSET * 2 - 1.6}
            fill="none"
            stroke="var(--gold-specular)"
            strokeOpacity={0.2}
            strokeWidth={1}
          />

          <g clipPath={`url(#${clipPathId})`}>
            {visibleAreaPlayers.map((player) => {
                  const radius = player.radius ?? 0;
                  if (radius <= 0) return null;
                  return (
                    <circle
                      key={`radius-${player.id}`}
                      cx={toX(player.x)}
                      cy={toY(player.y)}
                      r={radius * width}
                      fill="color-mix(in oklab, var(--gold-bright) 78%, transparent 22%)"
                      fillOpacity={0.07}
                      stroke="color-mix(in oklab, var(--gold-specular) 34%, var(--gold-bright) 66%)"
                      strokeOpacity={0.36}
                      strokeWidth={1.1}
                    />
                  );
                })}
          </g>

          {visibleSegments.map((segment) => (
            <g key={segment.key}>
              <line
                x1={toX(segment.x1)}
                y1={toY(segment.y1)}
                x2={toX(segment.x2)}
                y2={toY(segment.y2)}
                stroke={CHAIN_GLOW_COLOR}
                strokeWidth={chainGlowWidth}
                strokeOpacity={0.16}
                className="tactics-chain-glow"
                strokeLinecap="round"
              />
              <line
                x1={toX(segment.x1)}
                y1={toY(segment.y1)}
                x2={toX(segment.x2)}
                y2={toY(segment.y2)}
                stroke={`url(#chain-stroke-${markerId})`}
                strokeWidth={chainWidth}
                strokeOpacity={0.96}
                className="tactics-chain-main"
                strokeLinecap="round"
              />
            </g>
          ))}

          {cones.map((cone) => (
            <rect
              key={cone.id}
              x={toX(cone.x) - coneSize / 2}
              y={toY(cone.y) - coneSize / 2}
              width={coneSize}
              height={coneSize}
              fill="none"
              stroke="color-mix(in oklab, var(--gold-bright) 62%, var(--text-1) 38%)"
              strokeOpacity={0.86}
              strokeWidth={1.85}
              data-interactive="true"
              onPointerDown={(event) => handleConePointerDown(cone.id, event)}
              className={mode === "edit" ? "cursor-grab" : ""}
            />
          ))}

          {players.map((player) => (
            <g
              key={player.id}
              transform={`translate(${toX(player.x)}, ${toY(player.y)})`}
              onPointerDown={(event) => handlePlayerPointerDown(player.id, event)}
              onPointerEnter={(event) => handlePlayerPointerEnter(player.id, event)}
              onPointerLeave={(event) => handlePlayerPointerLeave(player.id, event)}
              className={mode === "edit" ? "cursor-grab" : ""}
              data-interactive="true"
            >
              {mode === "edit" ? <circle r={playerHitRadius} fill="transparent" /> : null}
              {player.isBurner ? (
                <g className="tactics-player-burner" filter={`url(#player-shadow-${markerId})`}>
                  <polygon
                    points={burnerHaloPoints}
                    fill="none"
                    stroke="var(--gold-specular)"
                    strokeOpacity={0.22}
                    strokeWidth={1}
                    className="tactics-player-halo"
                  />
                  <polygon
                    points={burnerRingPoints}
                    fill="none"
                    stroke={`url(#player-ring-${markerId})`}
                    strokeWidth={1.1}
                    className="tactics-player-ring"
                  />
                  <polygon
                    points={burnerCorePoints}
                    fill={`url(#player-core-${markerId})`}
                    stroke="color-mix(in oklab, var(--gold-specular) 34%, var(--gold-bright) 66%)"
                    strokeOpacity={0.84}
                    strokeWidth={0.9}
                    className="tactics-player-core"
                  />
                </g>
              ) : (
                <g filter={`url(#player-shadow-${markerId})`}>
                  <circle
                    r={haloRadius}
                    fill="none"
                    stroke="var(--gold-specular)"
                    strokeOpacity={0.22}
                    strokeWidth={0.95}
                    className="tactics-player-halo"
                  />
                  <circle
                    r={ringRadius}
                    fill="none"
                    stroke={`url(#player-ring-${markerId})`}
                    strokeWidth={1.08}
                    className="tactics-player-ring"
                  />
                  <circle
                    r={playerRadius}
                    fill={`url(#player-core-${markerId})`}
                    stroke="color-mix(in oklab, var(--gold-specular) 28%, var(--gold-bright) 72%)"
                    strokeOpacity={0.78}
                    strokeWidth={0.9}
                    className="tactics-player-core"
                  />
                </g>
              )}
              {showPlayerLabels ? (
                <text
                  textAnchor="middle"
                  y={labelOffsetY}
                  fill="color-mix(in oklab, var(--gold-specular) 26%, var(--text-1) 74%)"
                  fontSize={labelFontSize}
                  className="tactics-player-label tactics-player-label--premium"
                >
                  {player.name}
                </text>
              ) : null}
            </g>
          ))}

          {players.length === 0 ? (
            <text textAnchor="middle" x={width / 2} y={height / 2} fill="var(--text-2)" fontSize={18}>
              Inga spelare placerade
            </text>
          ) : null}
        </svg>
      </div>
      {mode === "edit" ? (
        <p className={cn("mt-3 text-sm text-slate-300", surface === "bare" ? "px-1" : "")}>
          Dra spelare och koner for att justera planen.
        </p>
      ) : (
        <p className={cn("mt-3 text-sm text-slate-300 tactics-board__hint", surface === "bare" ? "px-1" : "")}>
          Hovra eller tryck en spelare for att visa aterstaende passningar.
        </p>
      )}
    </div>
  );
}
