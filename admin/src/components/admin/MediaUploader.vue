<script setup lang="ts">
import { ref } from 'vue';
import { uploadMedia, type MediaUploadResult } from '@/services/media';

interface Props {
  label?: string;
  accept?: string;
}

withDefaults(defineProps<Props>(), {
  label: 'Upload File',
  accept: 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm',
});

const emit = defineEmits<{ uploaded: [MediaUploadResult] }>();

const inputEl = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
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
  handleFiles(event.dataTransfer?.files ?? null);
}
</script>

<template>
  <div class="sw-media-uploader" @dragover.prevent @drop="onDrop">
    <input ref="inputEl" type="file" :accept="accept" class="sw-visually-hidden" @change="handleFiles(($event.target as HTMLInputElement).files)" />
    <button
      class="sw-admin-btn sw-admin-btn--ghost"
      type="button"
      :disabled="isUploading"
      @click="inputEl?.click()"
    >
      {{ isUploading ? `Uploading… ${progress}%` : label }}
    </button>
    <p v-if="errorMessage" class="sw-media-uploader__error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.sw-media-uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-media-uploader__error {
  font-size: 0.8rem;
  color: #a3313f;
}
</style>
