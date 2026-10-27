export interface AiModelInfo {
  id: number;
  name: string;
  provider: string;
  modelId: string;
  sizes: string[];
  maxImages: number;
  creditCost: number;
  isDefault: boolean;
  description: string | null;
}

export interface GenerationImageInfo {
  id: number;
  url: string;
  localPath: string | null;
  width: number | null;
  height: number | null;
}

export interface GenerationInfo {
  id: number;
  teamId: number;
  userId: number;
  aiModelId: number | null;
  modelName: string;
  modelId: string;
  prompt: string;
  negativePrompt: string | null;
  size: string;
  imageCount: number;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  taskRef: string | null;
  creditsUsed: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  images: GenerationImageInfo[];
  user?: { id: number; name: string | null; email: string };
}

export interface CreditPackInfo {
  id: string;
  credits: number;
  amountUsd: number;
}
