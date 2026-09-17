"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { putFileToR2PresignedUrl } from "@/lib/r2DirectUpload";

export function MediaLibrary({
  siteId,
  onSelect,
  selectedStorageId,
}: {
  siteId: Id<"sites">;
  onSelect?: (storageId: string, url: string) => void;
  selectedStorageId?: string;
}) {
  const media = useQuery(api.siteMedia.listMedia, { siteId });
  const prepareMediaUpload = useAction(api.siteMediaActions.prepareMediaUpload);
  const saveMedia = useMutation(api.siteMedia.saveMedia);
  const deleteMedia = useAction(api.siteMediaActions.deleteMedia);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const contentType = file.type || "application/octet-stream";
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
    } finally {
      setUploading(false);
    }
  }

  const filtered = (media ?? []).filter((item) =>
    item.filename.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search media..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="site-builder-field min-w-0 flex-1"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-sm border border-white/[0.08] bg-transparent px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:text-zinc-100 disabled:opacity-50"
        >
          {uploading ? "..." : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {media === undefined ? (
        <p className="text-xs text-zinc-500">Loading media...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-500">No images yet. Upload one to get started.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((item) => (
            <div
              key={item._id}
              className={`group relative overflow-hidden border ${
                selectedStorageId === item.r2Key
                  ? "border-sky-400"
                  : "border-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => item.url && onSelect?.(item.r2Key, item.url)}
                className="block w-full"
              >
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="aspect-square bg-zinc-900" />
                )}
                <p className="truncate px-2 py-1 text-[10px] text-zinc-500">{item.filename}</p>
              </button>
              <button
                type="button"
                onClick={() => void deleteMedia({ siteId, mediaId: item._id })}
                className="absolute right-1 top-1 flex size-6 items-center justify-center bg-zinc-950 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-300"
                aria-label="Delete"
              >
                <i className="bx bx-trash text-xs" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
