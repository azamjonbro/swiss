<script setup lang="ts">
import { ref } from 'vue';
import { uploadMedia, type MediaUploadResult } from '@/services/media';
import { useLocaleStore } from '@/stores/locale';
import AdminIcon from '@/components/shared/AdminIcon.vue';

interface Props {
  label?: string;
  accept?: string;
  /** 'button' is a compact trigger; 'dropzone' is the large drag target. */
  variant?: 'button' | 'dropzone';
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  accept: 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm',
  variant: 'button',
});

const emit = defineEmits<{ uploaded: [MediaUploadResult] }>();

const locale = useLocaleStore();

const inputEl = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const isDragging = ref(false);
const progress = ref(0);
const errorMessage = ref('');

async function handleFiles(files: FileList | null) {
  const file = files?.[0];
  if (!file) return;

  isUploading.value = true;
  progress.value = 0;
  errorMessage.value = '';

  try {
    const result = await uploadMedia(file, (p) => (progress.value = p));
    emit('uploaded', result);
  } catch {
    errorMessage.value = 'Upload failed. Check file type and size, then try again.';
  } finally {
    isUploading.value = false;
    if (inputEl.value) inputEl.value.value = '';
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  handleFiles(event.dataTransfer?.files ?? null);
}
</script>

<template>
  <div
    class="sw-uploader"
    :class="[`is-${variant}`, { 'is-dragging': isDragging }]"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop="onDrop"
  >
    <input
      ref="inputEl"
      type="file"
      :accept="accept"
      class="sw-visually-hidden"
      @change="handleFiles(($event.target as HTMLInputElement).files)"
    />

    <button
      v-if="variant === 'button'"
      class="sw-admin-btn sw-admin-btn--ghost sw-admin-btn--sm"
      type="button"
      :disabled="isUploading"
      @click="inputEl?.click()"
    >
      <AdminIcon name="upload" :size="14" />
      {{ isUploading ? `${progress}%` : props.label || locale.t('admin.uploadMedia') }}
    </button>

    <button v-else class="sw-uploader__zone" type="button" :disabled="isUploading" @click="inputEl?.click()">
      <span class="sw-uploader__zone-icon"><AdminIcon name="upload" :size="20" /></span>
      <span class="sw-uploader__zone-label">{{ props.label || locale.t('admin.uploadMedia') }}</span>
      <span class="sw-uploader__zone-hint">{{ locale.t('admin.dropHint') }}</span>
    </button>

    <div v-if="isUploading" class="sw-uploader__bar" role="progressbar" :aria-valuenow="progress">
      <span :style="{ width: `${progress}%` }" />
    </div>
    <p v-if="errorMessage" class="sw-admin-error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.sw-uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-uploader.is-button {
  align-items: flex-start;
}

.sw-uploader__zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 30px 20px;
  border: 1.5px dashed var(--admin-border-strong);
  border-radius: var(--radius-lg);
  background: var(--admin-surface-2);
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.sw-uploader__zone:hover,
.sw-uploader.is-dragging .sw-uploader__zone {
  border-color: var(--admin-accent);
  background: var(--admin-accent-soft);
}

.sw-uploader__zone-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 6px;
  border-radius: var(--radius-full);
  background: var(--admin-surface-3);
  color: var(--admin-text-muted);
}

.sw-uploader__zone-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--admin-text);
}

.sw-uploader__zone-hint {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
}

.sw-uploader__bar {
  width: 100%;
  max-width: 220px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--admin-surface-3);
  overflow: hidden;
}

.sw-uploader__bar span {
  display: block;
  height: 100%;
  background: var(--admin-accent);
  transition: width var(--dur-fast) linear;
}
</style>
