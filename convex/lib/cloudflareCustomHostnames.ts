"use node";

import {
  CUSTOM_DOMAINS_NOT_CONFIGURED_MESSAGE,
  isCustomDomainsConfigured,
} from "./customDomainsConfig";

export type CloudflareVerificationRecord = {
  type: string;
  name: string;
  value: string;
};

export type CloudflareCustomHostnameResult = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string | null;
  verificationRecords: CloudflareVerificationRecord[];
};

type CloudflareCustomHostnameResponse = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: {
    id: string;
    hostname: string;
    status?: string;
    ssl?: {
      status?: string;
      validation_records?: Array<{
        txt_name?: string;
        txt_value?: string;
        http_url?: string;
        http_body?: string;
        cname?: string;
        cname_target?: string;
      }>;
    };
    ownership_verification?: {
      type?: string;
      name?: string;
      value?: string;
    };
    ownership_verification_http?: {
      http_url?: string;
      http_body?: string;
    };
  };
};

function getCloudflareConfig() {
  if (!isCustomDomainsConfigured()) {
    throw new Error(CUSTOM_DOMAINS_NOT_CONFIGURED_MESSAGE);
  }
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!.trim();
  return { apiToken, zoneId };
}

function cloudflareErrorMessage(body: CloudflareCustomHostnameResponse): string {
  return body.errors?.[0]?.message?.trim() || "Cloudflare request failed.";
}

function collectVerificationRecords(
  result: NonNullable<CloudflareCustomHostnameResponse["result"]>,
): CloudflareVerificationRecord[] {
  const records: CloudflareVerificationRecord[] = [];

  const ownership = result.ownership_verification;
  if (ownership?.type && ownership.name && ownership.value) {
    records.push({
      type: ownership.type,
      name: ownership.name,
      value: ownership.value,
    });
  }

  for (const record of result.ssl?.validation_records ?? []) {
    if (record.txt_name && record.txt_value) {
      records.push({
        type: "TXT",
        name: record.txt_name,
        value: record.txt_value,
      });
    }
    if (record.cname && record.cname_target) {
      records.push({
        type: "CNAME",
        name: record.cname,
        value: record.cname_target,
      });
    }
  }

  return records;
}

async function cloudflareRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { apiToken } = getCloudflareConfig();
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as T & CloudflareCustomHostnameResponse;
  if (!response.ok || (body as CloudflareCustomHostnameResponse).success === false) {
    throw new Error(cloudflareErrorMessage(body as CloudflareCustomHostnameResponse));
  }
  return body;
}

function mapHostnameResult(
  result: NonNullable<CloudflareCustomHostnameResponse["result"]>,
): CloudflareCustomHostnameResult {
  return {
    id: result.id,
    hostname: result.hostname,
    status: result.status ?? "pending",
    sslStatus: result.ssl?.status ?? null,
    verificationRecords: collectVerificationRecords(result),
  };
}

export async function createCloudflareCustomHostname(
  hostname: string,
): Promise<CloudflareCustomHostnameResult> {
  const { zoneId } = getCloudflareConfig();
  const body = await cloudflareRequest<CloudflareCustomHostnameResponse>(
    `/zones/${zoneId}/custom_hostnames`,
    {
      method: "POST",
      body: JSON.stringify({
        hostname,
        ssl: {
          method: "txt",
          type: "dv",
          settings: {
            min_tls_version: "1.2",
          },
        },
      }),
    },
  );
  if (!body.result) {
    throw new Error("Cloudflare did not return a custom hostname.");
  }
  return mapHostnameResult(body.result);
}

export async function getCloudflareCustomHostname(
  hostnameId: string,
): Promise<CloudflareCustomHostnameResult> {
  const { zoneId } = getCloudflareConfig();
  const body = await cloudflareRequest<CloudflareCustomHostnameResponse>(
    `/zones/${zoneId}/custom_hostnames/${encodeURIComponent(hostnameId)}`,
  );
  if (!body.result) {
    throw new Error("Custom hostname not found in Cloudflare.");
  }
  return mapHostnameResult(body.result);
}

export async function deleteCloudflareCustomHostname(hostnameId: string): Promise<void> {
  const { zoneId } = getCloudflareConfig();
  await cloudflareRequest<CloudflareCustomHostnameResponse>(
    `/zones/${zoneId}/custom_hostnames/${encodeURIComponent(hostnameId)}`,
    { method: "DELETE" },
  );
}

export function resolveCustomDomainStatus(input: {
  cloudflareStatus: string;
  sslStatus: string | null;
}): "pending" | "active" | "failed" {
  const cloudflareStatus = input.cloudflareStatus.toLowerCase();
  const sslStatus = input.sslStatus?.toLowerCase() ?? "";

  if (cloudflareStatus === "active" && sslStatus === "active") {
    return "active";
  }
  if (cloudflareStatus === "blocked" || cloudflareStatus === "deleted") {
    return "failed";
  }
  if (sslStatus === "deleted" || sslStatus === "validation_timed_out") {
    return "failed";
  }
  return "pending";
}
