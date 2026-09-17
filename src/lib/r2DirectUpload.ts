/**
 * Browser PUT to a `dock-cdn.mrdn.online/upload/...` URL (HMAC from Convex, Worker writes R2).
 */
export async function putFileToR2PresignedUrl(args: {
  uploadUrl: string;
  file: Blob;
  contentType: string;
  signal?: AbortSignal;
}): Promise<void> {
  let res: Response;
  try {
    res = await fetch(args.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": args.contentType,
      },
      body: args.file,
      signal: args.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Could not upload the image. Try again.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (/access\s*denied/i.test(body) || res.status === 403) {
      throw new Error(
        "Image storage denied the upload. R2 credentials for meridian-cdn need Object Read & Write.",
      );
    }
    throw new Error("Could not upload the image. Try again.");
  }
}
