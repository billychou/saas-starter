/**
 * Alibaba Cloud Bailian (DashScope) async text-to-image client.
 *
 * Docs: https://help.aliyun.com/zh/model-studio/text-to-image
 * Flow: POST image-synthesis with X-DashScope-Async: enable -> task_id,
 * then poll GET /api/v1/tasks/{task_id} until SUCCEEDED/FAILED.
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

export async function createTextToImageTask(
  creds: BailianCredentials,
  input: CreateTaskInput
): Promise<string> {
  const base = resolveBase(creds.apiBase);
  const apiKey = resolveApiKey(creds.apiKey);

  const body: Record<string, unknown> = {
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

  const res = await fetch(`${base}/api/v1/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(body),
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
    const urls = ((output?.results ?? []) as { url?: string }[])
      .map((r) => r?.url)
      .filter((u): u is string => typeof u === 'string');
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
      error: output?.message || output?.code || partialError || 'Task failed',
    };
  }

  return { taskId, status, urls: [] };
}
