"use client";

import { useEffect, useMemo, useState } from "react";
import { TacticsBoard } from "@/components/tactics-board";
import { clamp01, defaultCones, validateBurnerSelection } from "@/lib/tactics";
import type { TacticBoardDto, TacticPassChain, TacticPlayer } from "@/lib/types";

const EMPTY_BOARD: TacticBoardDto = {
  key: "default",
  players: [],
  passChains: [],
  cones: defaultCones,
  updatedAt: new Date(0).toISOString(),
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function TacticsManager() {
  const [board, setBoard] = useState<TacticBoardDto>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showAreas, setShowAreas] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const selectedPlayer = useMemo(
    () => board.players.find((player) => player.id === selectedPlayerId) ?? null,
    [board.players, selectedPlayerId],
  );

  const burnerValidation = validateBurnerSelection(board.players);

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      setLoading(true);
      setMessage("");
      try {
        const response = await fetch("/api/tactics", { cache: "no-store" });
        const payload = (await response.json()) as { data?: TacticBoardDto; error?: { message?: string } };
        if (!response.ok || !payload.data) {
          if (!cancelled) {
            setMessage(payload.error?.message ?? "Kunde inte ladda spelplan.");
          }
          return;
        }

        if (!cancelled) {
          setBoard(payload.data);
          setSelectedPlayerId(payload.data.players[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setMessage("Kunde inte ladda spelplan.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBoard();
    return () => {
      cancelled = true;
    };
  }, []);

  function updatePlayers(players: TacticPlayer[]) {
    setBoard((current) => ({ ...current, players }));
  }

  function addPlayer() {
    setBoard((current) => {
      const index = current.players.length;
      const column = index % 4;
      const row = Math.floor(index / 4);
      const nextPlayer: TacticPlayer = {
        id: makeId("player"),
        name: `Spelare ${index + 1}`,
        x: clamp01(0.34 + column * 0.1),
        y: clamp01(0.34 + row * 0.1),
        radius: 0,
        isBurner: current.players.length === 0,
      };

      const players = [...current.players, nextPlayer];
      if (current.players.length === 0) {
        setSelectedPlayerId(nextPlayer.id);
      }

      return {
        ...current,
        players,
      };
    });
  }

  function removePlayer(playerId: string) {
    setBoard((current) => {
      const players = current.players.filter((player) => player.id !== playerId);
      const playerIds = new Set(players.map((player) => player.id));
      const passChains = current.passChains
        .map((chain) => ({
          ...chain,
          playerIds: chain.playerIds.filter((id) => playerIds.has(id)),
        }))
        .filter((chain) => chain.playerIds.length >= 2);

      if (selectedPlayerId === playerId) {
        setSelectedPlayerId(players[0]?.id ?? null);
      }

      return {
        ...current,
        players,
        passChains,
      };
    });
  }

  function renamePlayer(playerId: string, nextName: string) {
    setBoard((current) => ({
      ...current,
      players: current.players.map((player) => (player.id === playerId ? { ...player, name: nextName } : player)),
    }));
  }

  function setBurner(playerId: string) {
    setBoard((current) => ({
      ...current,
      players: current.players.map((player) => ({
        ...player,
        isBurner: player.id === playerId,
      })),
    }));
  }

  function setPlayerRadius(playerId: string, radius: number) {
    const clamped = Number.isFinite(radius) ? Math.max(0, Math.min(0.5, radius)) : 0;
    setBoard((current) => ({
      ...current,
      players: current.players.map((player) => (player.id === playerId ? { ...player, radius: clamped } : player)),
    }));
  }

  function addChain() {
    if (board.players.length < 2) {
      setMessage("Lagg till minst tva spelare for att skapa en passningskedja.");
      return;
    }

    const firstPlayer = board.players[0]!.id;
    const secondPlayer = board.players[1]!.id;
    const nextChain: TacticPassChain = {
      id: makeId("chain"),
      name: `Kedja ${board.passChains.length + 1}`,
      playerIds: [firstPlayer, secondPlayer],
    };

    setBoard((current) => ({
      ...current,
      passChains: [...current.passChains, nextChain],
    }));
  }

  function removeChain(chainId: string) {
    setBoard((current) => ({
      ...current,
      passChains: current.passChains.filter((chain) => chain.id !== chainId),
    }));
  }

  function updateChain(chainId: string, patch: Partial<TacticPassChain>) {
    setBoard((current) => ({
      ...current,
      passChains: current.passChains.map((chain) => (chain.id === chainId ? { ...chain, ...patch } : chain)),
    }));
  }

  function addChainStep(chainId: string) {
    if (board.players.length === 0) return;
    setBoard((current) => ({
      ...current,
      passChains: current.passChains.map((chain) =>
        chain.id === chainId ? { ...chain, playerIds: [...chain.playerIds, board.players[0]!.id] } : chain,
      ),
    }));
  }

  function removeChainStep(chainId: string, index: number) {
    setBoard((current) => ({
      ...current,
      passChains: current.passChains
        .map((chain) => {
          if (chain.id !== chainId) return chain;
          return {
            ...chain,
            playerIds: chain.playerIds.filter((_, stepIndex) => stepIndex !== index),
          };
        })
        .filter((chain) => chain.playerIds.length >= 2),
    }));
  }

  async function saveBoard() {
    const cleanedPlayers = board.players.map((player, index) => ({
      ...player,
      name: player.name.trim() || `Spelare ${index + 1}`,
      x: clamp01(player.x),
      y: clamp01(player.y),
      radius: Math.max(0, Math.min(0.5, player.radius ?? 0)),
    }));

    const playerIds = new Set(cleanedPlayers.map((player) => player.id));
    const cleanedChains = board.passChains
      .map((chain, index) => ({
        id: chain.id,
        name: (chain.name ?? "").trim() || `Kedja ${index + 1}`,
        playerIds: chain.playerIds.filter((playerId) => playerIds.has(playerId)),
      }))
      .filter((chain) => chain.playerIds.length >= 2);

    const payload = {
      players: cleanedPlayers,
      passChains: cleanedChains,
      cones: board.cones,
    };

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/tactics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { data?: TacticBoardDto; error?: { message?: string } };
      if (!response.ok || !result.data) {
        setMessage(result.error?.message ?? "Kunde inte spara spelplan.");
        return;
      }

      setBoard(result.data);
      setMessage("Spelplan sparad. Andringarna ar nu live i arkivet.");
    } catch {
      setMessage("Kunde inte spara spelplan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="view-stack">
        <div className="panel panel--elevated panel-row p-5">
          <h1 className="text-3xl font-bold">Spelplan</h1>
          <p className="mt-2 text-slate-300">Laddar spelplan...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="view-stack">
      <div className="panel panel--elevated panel-row p-5">
        <h1 className="text-3xl font-bold">Spelplan</h1>
        <p className="mt-2 text-slate-300">En live spelplan for medlemmar. Spara for att publicera andringar direkt.</p>
        {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.24fr)_minmax(0,0.76fr)]">
        <section className="space-y-4 min-w-0">
          {!burnerValidation.ok ? <p className="text-sm text-red-300">{burnerValidation.message}</p> : null}
          <div className="tactics-board-controls tactics-board-controls--inline">
            <button className="btn-secondary" type="button" onClick={() => setShowAreas((current) => !current)}>
              {showAreas ? "Dolj alla ytor" : "Visa alla ytor"}
            </button>
          </div>

          <TacticsBoard
            mode="edit"
            players={board.players}
            passChains={board.passChains}
            cones={board.cones}
            showAreas={showAreas}
            variant="admin"
            surface="bare"
            showPlayerLabels
            className="tactics-board tactics-board--admin"
            onPlayersChange={updatePlayers}
            onConesChange={(cones) => setBoard((current) => ({ ...current, cones }))}
          />
        </section>

        <aside className="panel panel-row p-4 space-y-4 tactics-admin-tools">
          <div className="tactics-admin-tools__actions">
            <button className="btn-primary" type="button" onClick={saveBoard} disabled={saving}>
              {saving ? "Sparar..." : "Spara"}
            </button>
          </div>

          <section className="tactics-admin-section space-y-2">
            <div className="inline-actions">
              <h2 className="text-lg font-semibold">Spelare</h2>
              <button className="btn-secondary" type="button" onClick={addPlayer}>
                Lagg till
              </button>
            </div>

            {board.players.length === 0 ? (
              <p className="text-slate-300">Inga spelare tillagda.</p>
            ) : (
              <ul className="space-y-2">
                {board.players.map((player) => (
                  <li key={player.id} className="rounded-sm border border-slate-700/80 p-3 space-y-2 admin-row">
                    <input
                      className="input input--compact"
                      value={player.name}
                      onChange={(event) => renamePlayer(player.id, event.target.value)}
                      onFocus={() => setSelectedPlayerId(player.id)}
                      placeholder="Spelarnamn"
                    />
                    <div className="inline-actions">
                      <label className="inline-actions text-sm text-slate-300">
                        <input
                          type="radio"
                          name="burner-single"
                          checked={player.isBurner === true}
                          onChange={() => setBurner(player.id)}
                        />
                        Brannare
                      </label>
                      <button className="btn-secondary" type="button" onClick={() => removePlayer(player.id)}>
                        Ta bort
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selectedPlayer ? (
            <section className="tactics-admin-section space-y-2">
              <h3 className="text-lg font-semibold">Radie: {selectedPlayer.name}</h3>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={selectedPlayer.radius ?? 0}
                onChange={(event) => setPlayerRadius(selectedPlayer.id, Number(event.target.value))}
                className="w-full"
              />
              <input
                className="input input--compact max-w-32"
                type="number"
                min={0}
                max={0.5}
                step={0.01}
                value={(selectedPlayer.radius ?? 0).toFixed(2)}
                onChange={(event) => setPlayerRadius(selectedPlayer.id, Number(event.target.value))}
              />
            </section>
          ) : null}

          <section className="tactics-admin-section space-y-2">
            <div className="inline-actions">
              <h2 className="text-lg font-semibold">Passningskedjor</h2>
              <button className="btn-secondary" type="button" onClick={addChain}>
                Lagg till
              </button>
            </div>

            <p className="text-xs text-slate-300">Fast stil: monoline premium med tunna rena linjer utan pilar.</p>

            {board.passChains.length === 0 ? (
              <p className="text-slate-300">Inga passningskedjor.</p>
            ) : (
              <ul className="space-y-2">
                {board.passChains.map((chain) => (
                  <li key={chain.id} className="rounded-sm border border-slate-700/80 p-3 space-y-2 admin-row">
                    <input
                      className="input input--compact"
                      value={chain.name}
                      onChange={(event) => updateChain(chain.id, { name: event.target.value })}
                      placeholder="Kedjenamn"
                    />

                    <div className="space-y-1">
                      {chain.playerIds.map((playerId, stepIndex) => (
                        <div key={`${chain.id}-${stepIndex}`} className="inline-actions">
                          <select
                            className="input input--compact"
                            value={playerId}
                            onChange={(event) => {
                              const nextIds = [...chain.playerIds];
                              nextIds[stepIndex] = event.target.value;
                              updateChain(chain.id, { playerIds: nextIds });
                            }}
                          >
                            {board.players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}
                              </option>
                            ))}
                          </select>
                          <button className="btn-secondary" type="button" onClick={() => removeChainStep(chain.id, stepIndex)}>
                            Ta bort steg
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="inline-actions">
                      <button className="btn-secondary" type="button" onClick={() => addChainStep(chain.id)}>
                        Lagg till steg
                      </button>
                      <button className="btn-secondary" type="button" onClick={() => removeChain(chain.id)}>
                        Ta bort kedja
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
