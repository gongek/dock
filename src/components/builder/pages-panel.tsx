"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmMenu } from "@/components/ui/confirm-menu";
import { userFacingError } from "@/lib/user-facing-error";
import { isProtectedPageAccess, resolvePageAccessSettings } from "@/lib/page-access";

export type BuilderPage = {
  _id: Id<"sitePages">;
  slug: string;
  title: string;
  kind: string;
  pageAccessSettings?: ReturnType<typeof resolvePageAccessSettings>;
};

function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "page";
}

const RESERVED_PAGE_SLUGS = new Set(["home", "edit", "protected-page"]);

function uniqueSlug(title: string, existing: string[]): string {
  const taken = new Set(existing);
  const base = slugify(title);
  if (!taken.has(base) && !RESERVED_PAGE_SLUGS.has(base)) return base;
  let n = 2;
  while (true) {
    const suffix = `-${n}`;
    const slug = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    if (!taken.has(slug) && !RESERVED_PAGE_SLUGS.has(slug)) return slug;
    n += 1;
  }
}

function pageIcon(kind: string): string {
  if (kind === "case_detail") return "bx-briefcase";
  if (kind === "protected") return "bx-lock-alt";
  return "bx-file";
}

export function PagesPanel({
  siteId,
  pages,
  pageId,
  onSelectPage,
}: {
  siteId: Id<"sites">;
  pages: BuilderPage[];
  pageId: Id<"sitePages">;
  onSelectPage: (pageId: Id<"sitePages">) => void;
}) {
  const createPage = useMutation(api.sitePages.createPage);
  const deletePage = useMutation(api.sitePages.deletePage);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: Id<"sitePages">;
    title: string;
    anchor: HTMLElement;
  } | null>(null);

  async function handleCreate() {
    const nextTitle = title.trim();
    if (!nextTitle || busy) return;
    setBusy(true);
    setError(null);
    try {
      const slug = uniqueSlug(
        nextTitle,
        pages.map((page) => page.slug),
      );
      const id = await createPage({ siteId, slug, title: nextTitle });
      setTitle("");
      setCreating(false);
      onSelectPage(id);
    } catch (err) {
      setError(userFacingError(err, "Could not create page."));
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(id: Id<"sitePages">, anchor: HTMLElement) {
    const page = pages.find((item) => item._id === id);
    if (!page || page.slug === "home" || page.kind === "protected" || busy) return;
    setPendingDelete({ id, title: page.title, anchor });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setBusy(true);
    setError(null);
    try {
      await deletePage({ pageId: id });
      setPendingDelete(null);
      if (pageId === id) {
        const fallback = pages.find((item) => item._id !== id);
        if (fallback) onSelectPage(fallback._id);
      }
    } catch (err) {
      setError(userFacingError(err, "Could not delete page."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {pages.map((page) => {
        const selected = page._id === pageId;
        const canDelete = page.slug !== "home" && page.kind !== "protected";
        const showSlug = page.kind !== "protected";
        return (
          <div
            key={page._id}
            data-page-row
            className={`group flex items-center gap-0.5 rounded-lg ${
              selected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectPage(page._id)}
              className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left ${
                selected ? "text-zinc-100" : "text-zinc-300"
              }`}
            >
              <i
                className={`bx ${pageIcon(page.kind)} shrink-0 text-sm ${
                  selected ? "text-zinc-300" : "text-zinc-500"
                }`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-[13px]">
                  {page.kind !== "protected" &&
                  isProtectedPageAccess(resolvePageAccessSettings(page.pageAccessSettings)) ? (
                    <i className="bx bx-lock-alt shrink-0 text-[11px] text-zinc-500" aria-hidden />
                  ) : null}
                  <span className="truncate">{page.title}</span>
                </span>
                {showSlug ? (
                  <span className="block truncate text-[11px] text-zinc-500">/{page.slug}</span>
                ) : null}
              </span>
            </button>
            {canDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={(event) => {
                  const row = event.currentTarget.closest("[data-page-row]");
                  if (row instanceof HTMLElement) requestDelete(page._id, row);
                }}
                className={`mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-opacity hover:text-red-300 disabled:opacity-40 ${
                  pendingDelete?.id === page._id
                    ? "opacity-100 text-red-300"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                aria-label={`Delete ${page.title}`}
              >
                <i className="bx bx-trash text-sm" aria-hidden />
              </button>
            ) : null}
          </div>
        );
      })}

      {creating ? (
        <form
          className="mt-1 flex flex-col gap-1.5 px-1 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setCreating(false);
                setTitle("");
                setError(null);
              }
            }}
            placeholder="Page title"
            className="site-builder-field"
          />
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-zinc-200 hover:border-white/20 disabled:opacity-40"
            >
              {busy ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setTitle("");
                setError(null);
              }}
              className="rounded-lg px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
        >
          <i className="bx bx-plus shrink-0 text-sm" aria-hidden />
          New page
        </button>
      )}

      {error ? <p className="px-2 pt-1 text-[11px] text-red-400">{error}</p> : null}

      <ConfirmMenu
        open={pendingDelete !== null}
        anchor={pendingDelete?.anchor ?? null}
        matchAnchorWidth
        title={`Delete “${pendingDelete?.title ?? ""}”?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
