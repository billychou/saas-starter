'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { deleteModelAction, saveModelAction } from '../actions';

export interface AdminModelInfo {
  id: number;
  name: string;
  provider: string;
  modelId: string;
  hasCustomKey: boolean;
  apiBase: string | null;
  sizes: string[];
  maxImages: number;
  creditCost: number;
  enabled: boolean;
  isDefault: boolean;
  description: string | null;
  sortOrder: number;
}

function ModelFormDialog({
  open,
  onOpenChange,
  model
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: AdminModelInfo | null;
}) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(model);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await saveModelAction({}, formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editModel') : t('addModel')}</DialogTitle>
          <DialogDescription>{t('modelFormHint')}</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {model && <input type="hidden" name="id" value={model.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t('fieldName')}</Label>
              <Input id="name" name="name" required maxLength={100} defaultValue={model?.name} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider">{t('fieldProvider')}</Label>
              <Input
                id="provider"
                name="provider"
                required
                maxLength={50}
                defaultValue={model?.provider ?? 'bailian'}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="modelId">{t('fieldModelId')}</Label>
            <Input
              id="modelId"
              name="modelId"
              required
              maxLength={100}
              placeholder="wanx2.1-t2i-turbo"
              defaultValue={model?.modelId}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">{t('fieldApiKey')}</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              maxLength={500}
              autoComplete="new-password"
              placeholder={
                isEdit
                  ? model?.hasCustomKey
                    ? t('apiKeyStored')
                    : t('apiKeyEnvFallback')
                  : t('apiKeyEnvFallback')
              }
            />
            {isEdit && model?.hasCustomKey && (
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                <Checkbox name="clearApiKey" />
                {t('clearApiKey')}
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="apiBase">{t('fieldApiBase')}</Label>
            <Input
              id="apiBase"
              name="apiBase"
              maxLength={500}
              placeholder="https://dashscope.aliyuncs.com"
              defaultValue={model?.apiBase ?? ''}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sizes">{t('fieldSizes')}</Label>
            <Input
              id="sizes"
              name="sizes"
              required
              placeholder="1024*1024, 720*1280, 1280*720"
              defaultValue={model?.sizes.join(', ')}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="creditCost">{t('fieldCreditCost')}</Label>
              <Input
                id="creditCost"
                name="creditCost"
                type="number"
                min={0}
                max={10000}
                required
                defaultValue={model?.creditCost ?? 1}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxImages">{t('fieldMaxImages')}</Label>
              <Input
                id="maxImages"
                name="maxImages"
                type="number"
                min={1}
                max={4}
                required
                defaultValue={model?.maxImages ?? 4}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sortOrder">{t('fieldSortOrder')}</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                max={9999}
                required
                defaultValue={model?.sortOrder ?? 0}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">{t('fieldDescription')}</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              maxLength={2000}
              defaultValue={model?.description ?? ''}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="enabled" defaultChecked={model ? model.enabled : true} />
              {t('fieldEnabled')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isDefault" defaultChecked={model?.isDefault ?? false} />
              {t('fieldIsDefault')}
            </label>
          </div>

          {error && (
            <p className="text-destructive bg-destructive/5 rounded-lg p-2 text-xs">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-brand text-white hover:bg-brand/90"
            >
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminModelsClient({ models }: { models: AdminModelInfo[] }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminModelInfo | null>(null);
  const [deleting, setDeleting] = useState<AdminModelInfo | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    const formData = new FormData();
    formData.set('id', String(deleting.id));
    const result = await deleteModelAction({}, formData);
    if (result.error) {
      setDeleteError(result.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">
            {t('modelsTitle')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('modelsSubtitle')}</p>
        </div>
        <Button
          className="bg-brand text-white hover:bg-brand/90 ml-auto gap-1.5 rounded-full"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t('addModel')}
        </Button>
      </div>

      <div className="bg-card overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-3 font-medium">{t('fieldName')}</th>
              <th className="px-4 py-3 font-medium">{t('fieldProvider')}</th>
              <th className="px-4 py-3 font-medium">{t('fieldSizes')}</th>
              <th className="px-4 py-3 font-medium">{t('fieldCreditCost')}</th>
              <th className="px-4 py-3 font-medium">{t('status')}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="text-foreground flex items-center gap-1.5 font-medium">
                    {model.isDefault && (
                      <Star className="text-brand size-3.5 fill-current" />
                    )}
                    {model.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {model.modelId}
                    {model.hasCustomKey ? ` · ${t('customKey')}` : ''}
                  </div>
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {model.provider}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {model.sizes.join(', ')}
                  <div className="mt-0.5">
                    {t('maxImagesValue', { count: model.maxImages })} ·{' '}
                    {t('sortOrderValue', { order: model.sortOrder })}
                  </div>
                </td>
                <td className="text-brand px-4 py-3 font-medium">
                  {model.creditCost}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="secondary"
                    className={
                      model.enabled
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {model.enabled ? t('enabled') : t('disabled')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-8"
                      onClick={() => {
                        setEditing(model);
                        setFormOpen(true);
                      }}
                      aria-label={t('editModel')}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(model);
                      }}
                      aria-label={t('deleteModel')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-4 py-12 text-center"
                >
                  {t('noModelsYet')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ModelFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        model={editing}
      />

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteModelTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteModelConfirm', { name: deleting?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-destructive bg-destructive/5 rounded-lg p-2 text-xs">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
