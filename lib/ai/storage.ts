import 'server-only';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import OSS from 'ali-oss';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated');
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

interface OssConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  publicBaseUrl: string;
}

function normalizeRegion(region: string): string {
  return region.startsWith('oss-') ? region : `oss-${region}`;
}

/**
 * Resolve OSS credentials from the environment:
 * - all four OSS_* vars set → OSS mode
 * - none set → null (fall back to local public/generated storage)
 * - partially set → throw, so a misconfigured production deploy fails loudly
 *   instead of silently reintroducing the 24h provider-URL expiry problem.
 */
function resolveOssConfig(): OssConfig | null {
  const region = process.env.OSS_REGION?.trim();
  const bucket = process.env.OSS_BUCKET?.trim();
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET?.trim();

  if (region && bucket && accessKeyId && accessKeySecret) {
    const normalizedRegion = normalizeRegion(region);
    const baseOverride = process.env.OSS_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
    return {
      region: normalizedRegion,
      bucket,
      accessKeyId,
      accessKeySecret,
      publicBaseUrl: baseOverride || `https://${bucket}.${normalizedRegion}.aliyuncs.com`,
    };
  }

  if (!region && !bucket && !accessKeyId && !accessKeySecret) {
    return null;
  }

  const missing = [
    ['OSS_REGION', region],
    ['OSS_BUCKET', bucket],
    ['OSS_ACCESS_KEY_ID', accessKeyId],
    ['OSS_ACCESS_KEY_SECRET', accessKeySecret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  throw new Error(
    `Incomplete Alibaba Cloud OSS configuration. Missing env vars: ${missing.join(', ')}. ` +
      'Set all of OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET to enable OSS storage, ' +
      'or leave them all unset to use local public/generated storage.'
  );
}

// Lazily-initialized singleton; never construct at import time (dev hot reload, serverless cold starts).
let ossClient: OSS | null = null;

function getOssClient(config: OssConfig): OSS {
  if (!ossClient) {
    ossClient = new OSS({
      region: config.region,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      secure: true,
    });
  }
  return ossClient;
}

export function isOssConfigured(): boolean {
  return resolveOssConfig() !== null;
}

function sniffExtension(url: string): string {
  const match = url.split('?')[0].match(/\.(\w+)$/);
  if (match && ALLOWED_EXTENSIONS.includes(match[1].toLowerCase())) {
    return match[1].toLowerCase();
  }
  return 'png';
}

async function fetchImageBuffer(providerUrl: string): Promise<Buffer> {
  const res = await fetch(providerUrl);
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Download a generated image from the (soon-expiring) provider URL and persist it:
 * uploads to Alibaba Cloud OSS when the OSS_* env vars are configured, otherwise
 * writes to local public/generated/ (dev fallback).
 *
 * Returns the value to store in generation_images.localPath — a full public OSS
 * URL, or a root-relative /generated/... path.
 */
export async function storeImage(
  generationId: number,
  index: number,
  providerUrl: string
): Promise<string> {
  const config = resolveOssConfig();
  const buffer = await fetchImageBuffer(providerUrl);
  const ext = sniffExtension(providerUrl);

  if (config) {
    // UUID filename is the security boundary for the public-read bucket;
    // generationId alone would be sequential/enumerable.
    const key = `ai-studio/generated/${generationId}/${randomUUID()}.${ext}`;
    await getOssClient(config).put(key, buffer);
    return `${config.publicBaseUrl}/${key}`;
  }

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const fileName = `gen-${generationId}-${index}.${ext}`;
  await fs.writeFile(path.join(GENERATED_DIR, fileName), buffer);
  return `/generated/${fileName}`;
}

/**
 * Delete a stored image by its generation_images.localPath value. Best-effort:
 * failures are logged, never thrown, so DB cleanup always proceeds.
 * Handles both full OSS URLs and legacy/local /generated/... paths.
 */
export async function deleteStoredImage(storedPath: string): Promise<void> {
  if (storedPath.startsWith('http')) {
    let config: OssConfig | null;
    try {
      config = resolveOssConfig();
    } catch (error) {
      console.error('Failed to resolve OSS config while deleting stored image:', error);
      return;
    }
    if (!config) {
      console.error(`OSS is not configured; skipping object deletion for: ${storedPath}`);
      return;
    }
    let url: URL;
    try {
      url = new URL(storedPath);
    } catch {
      console.error(`Invalid stored image URL; skipping deletion: ${storedPath}`);
      return;
    }
    // Safety: only ever issue deletes against the configured public base host.
    if (url.origin !== new URL(config.publicBaseUrl).origin) {
      console.error(`Stored image URL is not on the configured OSS host; skipping deletion: ${storedPath}`);
      return;
    }
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    await getOssClient(config)
      .delete(key)
      .catch((error) => {
        console.error(`Failed to delete OSS object ${key}:`, error);
      });
    return;
  }

  const filePath = path.join(process.cwd(), 'public', storedPath);
  await fs.unlink(filePath).catch(() => {});
}
