/**
 * Alibaba Cloud Bailian (DashScope) async text-to-image client.
 *
 * Two protocols are supported, selected by model id:
 *
 * 1. Legacy text-to-image V2 (wanx2.1, wan2.5 and below):
 *    POST /api/v1/services/aigc/text2image/image-synthesis with input.prompt
 *    Docs: https://help.aliyun.com/zh/model-studio/text-to-image-v2-api-reference
 *
 * 2. Wan 2.7 image generation & editing (wan2.7-image, wan2.7-image-pro):
 *    POST /api/v1/services/aigc/image-generation/generation with
 *    input.messages[].content[] structure; results come back in
 *    output.choices[].message.content[].image
 *    Docs: https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference
 *
 * Both use X-DashScope-Async: enable -> task_id, then poll
 * GET /api/v1/tasks/{task_id} until SUCCEEDED/FAILED.
 * Result URLs expire after ~24h, so callers must download images promptly.
 */

export const DEFAULT_DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com';

export type BailianTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'UNKNOWN';

export interface BailianTaskResult {
  taskId: string;
  status: BailianTaskStatus;
  urls: string[];
  error?: string;
}

export interface BailianCredentials {
  apiKey: string;
  apiBase?: string | null;
}

export interface CreateTaskInput {
  modelId: string;
  prompt: string;
  negativePrompt?: string | null;
  size?: string | null;
  n?: number;
}

function resolveBase(apiBase?: string | null): string {
  return (
    apiBase || process.env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE
  ).replace(/\/$/, '');
}

function resolveApiKey(apiKey?: string | null): string {
  const key = apiKey || process.env.DASHSCOPE_API_KEY;
  if (!key) {
    throw new Error(
      'DashScope API key is not configured. Set DASHSCOPE_API_KEY or configure a per-model key.'
    );
  }
  return key;
}

async function readErrorResponse(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.message || data?.code || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Wan 2.7 image models use a different endpoint and request/response schema.
 * Docs: https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference
 */
function isWan27Model(modelId: string): boolean {
  return /^wan2\.7\b/i.test(modelId);
}

const LEGACY_T2I_PATH = '/api/v1/services/aigc/text2image/image-synthesis';
const WAN27_T2I_PATH = '/api/v1/services/aigc/image-generation/generation';

function buildRequestBody(input: CreateTaskInput): Record<string, unknown> {
  if (isWan27Model(input.modelId)) {
    // wan2.7 protocol: messages structure, no negative_prompt support.
    // size accepts "1K"/"2K"/"4K" or pixel values like "1024*1024".
    return {
      model: input.modelId,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: input.prompt }],
          },
        ],
      },
      parameters: {
        ...(input.size ? { size: input.size } : {}),
        ...(input.n ? { n: input.n } : {}),
        watermark: false,
      },
    };
  }

  return {
    model: input.modelId,
    input: {
      prompt: input.prompt,
      ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
    },
    parameters: {
      ...(input.size ? { size: input.size } : {}),
      ...(input.n ? { n: input.n } : {}),
    },
  };
}

export async function createTextToImageTask(
  creds: BailianCredentials,
  input: CreateTaskInput
): Promise<string> {
  const base = resolveBase(creds.apiBase);
  const apiKey = resolveApiKey(creds.apiKey);

  const path = isWan27Model(input.modelId) ? WAN27_T2I_PATH : LEGACY_T2I_PATH;

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(buildRequestBody(input)),
  });

  if (!res.ok) {
    throw new Error(await readErrorResponse(res));
  }

  const data = await res.json();
  const taskId: string | undefined = data?.output?.task_id;
  if (!taskId) {
    throw new Error('DashScope did not return a task_id');
  }
  return taskId;
}

export async function fetchTaskResult(
  creds: BailianCredentials,
  taskId: string
): Promise<BailianTaskResult> {
  const base = resolveBase(creds.apiBase);
  const apiKey = resolveApiKey(creds.apiKey);

  const res = await fetch(`${base}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(await readErrorResponse(res));
  }

  const data = await res.json();
  const output = data?.output;
  const status: BailianTaskStatus = output?.task_status ?? 'UNKNOWN';

  if (status === 'SUCCEEDED') {
    const urls = extractImageUrls(output);
    if (urls.length === 0) {
      return { taskId, status: 'FAILED', urls: [], error: 'Task succeeded but returned no images' };
    }
    return { taskId, status, urls };
  }

  if (status === 'FAILED' || status === 'CANCELED') {
    const partialError = (output?.results ?? [])
      .map((r: { message?: string }) => r?.message)
      .filter(Boolean)
      .join('; ');
    return {
      taskId,
      status: 'FAILED',
      urls: [],
      error:
        output?.message ||
        output?.code ||
        data?.message ||
        data?.code ||
        partialError ||
        'Task failed',
    };
  }

  return { taskId, status, urls: [] };
}

/**
 * Extract image URLs from a SUCCEEDED task output. Handles both shapes:
 * - legacy V2: output.results[].url
 * - wan2.7:    output.choices[].message.content[].image
 */
function extractImageUrls(output: any): string[] {
  const legacyUrls = ((output?.results ?? []) as { url?: string }[])
    .map((r) => r?.url)
    .filter((u): u is string => typeof u === 'string');

  if (legacyUrls.length > 0) {
    return legacyUrls;
  }

  const choices = (output?.choices ?? []) as {
    message?: { content?: { image?: string; type?: string }[] };
  }[];
  return choices
    .flatMap((c) => c?.message?.content ?? [])
    .map((part) => part?.image)
    .filter((u): u is string => typeof u === 'string');
}
