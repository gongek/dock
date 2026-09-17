"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { userFacingError } from "@/lib/user-facing-error";
import { putFileToR2PresignedUrl } from "@/lib/r2DirectUpload";

const FAVICON_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico";

export function FaviconPicker({
  siteId,
  faviconUrl,
}: {
  siteId: Id<"sites">;
  faviconUrl: string | null;
}) {
  const media = useQuery(api.siteMedia.listMedia, { siteId });
  const prepareMediaUpload = useAction(api.siteMediaActions.prepareMediaUpload);
  const saveMedia = useMutation(api.siteMedia.saveMedia);
  const updateSiteMeta = useMutation(api.sites.updateSiteMeta);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyFaviconKey(r2Key: string) {
    await updateSiteMeta({ siteId, faviconKey: r2Key });
  }

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const contentType = file.type || "image/png";
      const prepared = await prepareMediaUpload({
        siteId,
        filename: file.name,
        contentType,
        contentLength: file.size,
      });
      await putFileToR2PresignedUrl({
        uploadUrl: prepared.uploadUrl,
        file,
        contentType: prepared.contentType,
      });
      await saveMedia({
        siteId,
        r2Key: prepared.r2Key,
        filename: file.name,
        mimeType: prepared.contentType,
      });
      await applyFaviconKey(prepared.r2Key);
      setPicking(false);
    } catch (cause) {
      setError(userFacingError(cause, "Could not update favicon."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await updateSiteMeta({ siteId, faviconKey: null });
    } catch (cause) {
      setError(userFacingError(cause, "Could not remove favicon."));
    } finally {
      setBusy(false);
    }
  }

  const images = media ?? [];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] text-zinc-400">Favicon</span>
      <div className="flex items-center gap-2">
        {faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faviconUrl}
            alt=""
            className="size-8 rounded-md border border-white/[0.08] object-cover"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-md border border-dashed border-white/[0.08] text-zinc-600">
            <i className="bx bx-image text-sm" aria-hidden />
          </span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-zinc-300 hover:border-white/[0.16] hover:text-zinc-100 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Upload"}
        </button>
        <button
          type="button"
          disabled={busy || images.length === 0}
          onClick={() => setPicking((open) => !open)}
          className="rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-zinc-300 hover:border-white/[0.16] hover:text-zinc-100 disabled:opacity-40"
        >
          Library
        </button>
        {faviconUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRemove()}
            className="text-[11px] text-red-300 hover:text-red-200 disabled:opacity-40"
          >
            Remove
          </button>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept={FAVICON_ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
            event.target.value = "";
          }}
        />
      </div>
      {picking ? (
        <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border border-white/[0.07] p-1.5">
          {images.map((item) => (
            <button
              key={item._id}
              type="button"
              disabled={busy || !item.url}
              onClick={() => {
                setBusy(true);
                setError(null);
                void applyFaviconKey(item.r2Key)
                  .then(() => setPicking(false))
                  .catch((cause) => {
                    setError(userFacingError(cause, "Could not update favicon."));
                  })
                  .finally(() => setBusy(false));
              }}
              className="overflow-hidden rounded-md border border-white/[0.08] hover:border-white/20 disabled:opacity-40"
            >
              {item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.filename} className="aspect-square w-full object-cover" />
              ) : (
                <span className="block aspect-square bg-zinc-900" />
              )}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
    </div>
  );
}
