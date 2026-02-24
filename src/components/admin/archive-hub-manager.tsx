"use client";

import { useMemo, useRef, useState } from "react";
import type { ArchiveTabDto } from "@/lib/ui-types";
import { MarkdownContent } from "@/components/ui/markdown-content";

type Props = {
  runtimeReady: boolean;
  initialTabs: ArchiveTabDto[];
};

type TabDraft = {
  title: string;
  introMarkdown: string;
};

const BOARD_MARKER = "[[spelplan]]";

function toTabDraft(tab: ArchiveTabDto): TabDraft {
  return {
    title: tab.title,
    introMarkdown: tab.introMarkdown ?? "",
  };
}

function stripBoardMarker(markdown: string) {
  return markdown.split(BOARD_MARKER).join("").trim();
}

export function ArchiveHubManager({ runtimeReady, initialTabs }: Props) {
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [creatingTab, setCreatingTab] = useState(false);
  const [savingTab, setSavingTab] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState("");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [tabDrafts, setTabDrafts] = useState<Record<string, TabDraft>>(() => {
    const entries = initialTabs.map((tab) => [tab.id, toTabDraft(tab)] as const);
    return Object.fromEntries(entries);
  });

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null, [tabs, activeTabId]);
  const activeDraft = activeTab ? (tabDrafts[activeTab.id] ?? toTabDraft(activeTab)) : null;
  const previewTabs = useMemo(
    () =>
      tabs.map((tab) =>
        tab.id === activeTab?.id && activeDraft ? { ...tab, title: activeDraft.title || tab.title } : tab,
      ),
    [tabs, activeTab, activeDraft],
  );
  const hasBoardMarker = activeDraft?.introMarkdown.includes(BOARD_MARKER) ?? false;
  const previewMarkdown = activeDraft ? stripBoardMarker(activeDraft.introMarkdown) : "";

  function setActiveDraft(patch: Partial<TabDraft>) {
    if (!activeTab) return;
    setTabDrafts((current) => ({
      ...current,
      [activeTab.id]: {
        ...(current[activeTab.id] ?? toTabDraft(activeTab)),
        ...patch,
      },
    }));
  }

  function insertHeading(level: 2 | 3) {
    if (!activeDraft) return;

    const marker = level === 2 ? "## " : "### ";
    const fallbackTitle = level === 2 ? "Rubrik" : "Underrubrik";
    const textarea = editorRef.current;
    const current = activeDraft.introMarkdown;

    if (!textarea) {
      const separator = current.trim().length === 0 ? "" : "\n\n";
      setActiveDraft({ introMarkdown: `${current}${separator}${marker}${fallbackTitle}\n` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = current.slice(start, end).trim();
    const headingText = selected || fallbackTitle;
    const before = current.slice(0, start);
    const after = current.slice(end);

    const beforeSeparator =
      before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const afterSeparator = after.length === 0 ? "\n" : after.startsWith("\n") ? "" : "\n";
    const insertion = `${marker}${headingText}`;
    const next = `${before}${beforeSeparator}${insertion}${afterSeparator}${after}`;
    const nextCaret = `${before}${beforeSeparator}${insertion}${afterSeparator}`.length;

    setActiveDraft({ introMarkdown: next });

    requestAnimationFrame(() => {
      const element = editorRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function insertBoardMarker() {
    if (!activeDraft) return;
    if (activeDraft.introMarkdown.includes(BOARD_MARKER)) {
      setMessage("Spelplansmarkor finns redan i texten.");
      return;
    }

    const textarea = editorRef.current;
    const current = activeDraft.introMarkdown;

    if (!textarea) {
      const separator = current.trim().length === 0 ? "" : "\n\n";
      setActiveDraft({ introMarkdown: `${current}${separator}${BOARD_MARKER}\n` });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = current.slice(0, start);
    const after = current.slice(end);

    const beforeSeparator =
      before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const afterSeparator = after.length === 0 ? "\n" : after.startsWith("\n") ? "" : "\n";
    const next = `${before}${beforeSeparator}${BOARD_MARKER}${afterSeparator}${after}`;
    const nextCaret = `${before}${beforeSeparator}${BOARD_MARKER}${afterSeparator}`.length;

    setActiveDraft({ introMarkdown: next });

    requestAnimationFrame(() => {
      const element = editorRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(nextCaret, nextCaret);
    });
  }

  async function createTab() {
    const title = newTabTitle.trim();
    if (title.length < 2) return;
    setCreatingTab(true);
    setMessage("");
    try {
      const response = await fetch("/api/archive-tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          introMarkdown: "",
        }),
      });
      const payload = (await response.json()) as { data?: ArchiveTabDto; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Kunde inte skapa flik.");
        return;
      }
      const created = payload.data;
      setTabs((current) => [...current, created]);
      setActiveTabId(created.id);
      setTabDrafts((current) => ({ ...current, [created.id]: toTabDraft(created) }));
      setNewTabTitle("");
      setMessage("Flik skapad.");
    } catch {
      setMessage("Kunde inte skapa flik.");
    } finally {
      setCreatingTab(false);
    }
  }

  async function updateActiveTab() {
    if (!activeTab || !activeDraft) return;
    const title = activeDraft.title.trim();
    if (title.length < 2) {
      setMessage("Titel maste vara minst 2 tecken.");
      return;
    }

    setSavingTab(true);
    setMessage("");
    try {
      const response = await fetch(`/api/archive-tabs/${activeTab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          introMarkdown: activeDraft.introMarkdown.trim() ? activeDraft.introMarkdown : null,
        }),
      });
      const payload = (await response.json()) as { data?: ArchiveTabDto; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Kunde inte spara flik.");
        return;
      }
      setTabs((current) => current.map((tab) => (tab.id === payload.data!.id ? payload.data! : tab)));
      setTabDrafts((current) => ({ ...current, [payload.data!.id]: toTabDraft(payload.data!) }));
      setMessage("Flik sparad.");
    } catch {
      setMessage("Kunde inte spara flik.");
    } finally {
      setSavingTab(false);
    }
  }

  return (
    <section className="view-stack">
      <div className="panel panel--elevated panel-row p-5">
        <h1 className="text-3xl font-bold">Arkivflikar</h1>
        <p className="mt-2 text-slate-300">Valj en flik, redigera texten och spara. Skapa nya flikar vid behov.</p>
        {message && <p className="mt-3 text-sm text-cyan-200">{message}</p>}
      </div>

      {!runtimeReady ? (
        <section className="panel panel-row p-5">
          <h2 className="text-xl font-semibold">Arkivruntime saknas</h2>
          <p className="mt-2 text-slate-300">Kor setup i denna ordning for att aktivera arkivflikar:</p>
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            <p>1. `npm run prisma:generate`</p>
            <p>2. `npm run prisma:migrate`</p>
            <p>3. `npm run archive:backfill-tabs`</p>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)]">
          <section className="panel panel-row p-5">
            <h2 className="text-xl font-bold">Flikar</h2>
            {tabs.length === 0 ? (
              <p className="mt-3 text-slate-300 text-body">Inga flikar an. Skapa din forsta flik nedan.</p>
            ) : (
              <nav className="tab-bar archive-tab-bar mt-3" aria-label="Arkivflikar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`tab-chip ${activeTab?.id === tab.id ? "tab-chip--active" : ""}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    {tab.title}
                  </button>
                ))}
              </nav>
            )}

            <div className="mt-5 grid gap-2">
              <p className="text-sm text-slate-300">Skapa ny flik</p>
              <input
                className="input"
                placeholder="Titel"
                value={newTabTitle}
                onChange={(event) => setNewTabTitle(event.target.value)}
              />
              <button className="btn-primary w-fit" type="button" onClick={createTab} disabled={creatingTab || newTabTitle.trim().length < 2}>
                {creatingTab ? "Skapar..." : "Skapa flik"}
              </button>
            </div>
          </section>

          <section className="panel panel-row p-5">
            {!activeTab || !activeDraft ? (
              <p className="text-slate-300">Valj eller skapa en flik for att borja skriva.</p>
            ) : (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Redigera flik</h2>
                <label className="grid gap-1 text-sm text-slate-300">
                  Fliknamn
                  <input
                    className="input"
                    value={activeDraft.title}
                    onChange={(event) => setActiveDraft({ title: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-300">
                  Fliktext (markdown)
                  <div className="inline-actions">
                    <button className="btn-secondary input--compact" type="button" onClick={() => insertHeading(2)}>
                      Infoga rubrik (H2)
                    </button>
                    <button className="btn-secondary input--compact" type="button" onClick={() => insertHeading(3)}>
                      Infoga underrubrik (H3)
                    </button>
                    <button className="btn-secondary input--compact" type="button" onClick={insertBoardMarker}>
                      Infoga spelplan
                    </button>
                  </div>
                  <textarea
                    ref={editorRef}
                    className="input min-h-72"
                    value={activeDraft.introMarkdown}
                    onChange={(event) => setActiveDraft({ introMarkdown: event.target.value })}
                  />
                </label>
                <button
                  className="btn-primary w-fit"
                  type="button"
                  onClick={updateActiveTab}
                  disabled={savingTab || activeDraft.title.trim().length < 2}
                >
                  {savingTab ? "Sparar..." : "Spara fliktext"}
                </button>

                <div className="pt-2">
                  <p className="mb-2 text-sm font-semibold text-slate-300">Forhandsvisning (sa har sidan visas i Arkivet)</p>
                  <p className="mb-2 text-xs text-slate-300 text-body">
                    {hasBoardMarker
                      ? "Spelplansmarkor hittad: spelplanen renderas inline vid [[spelplan]]."
                      : "Ingen spelplansmarkor hittad: spelplanen renderas efter texten i fallback-lage."}
                  </p>
                  <article className="panel panel--elevated panel-row overflow-hidden">
                    <div className="archive-tabs-shell">
                      <nav className="tab-bar archive-tab-bar" aria-label="Forhandsvisning av flikar">
                        {previewTabs.map((tab) => {
                          const active = tab.id === activeTab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              className={`tab-chip ${active ? "tab-chip--active" : ""}`.trim()}
                              onClick={() => setActiveTabId(tab.id)}
                            >
                              {tab.title}
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                    {hasBoardMarker ? (
                      <div className="archive-editor-board-indicator">
                        Spelplan renderas inline vid markoren [[spelplan]].
                      </div>
                    ) : null}
                    {previewMarkdown ? (
                      <div className="archive-tabs-content">
                        <MarkdownContent markdown={previewMarkdown} />
                      </div>
                    ) : (
                      <div className="archive-tabs-content">
                        <p className="text-slate-300">Ingen text an.</p>
                      </div>
                    )}
                  </article>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
