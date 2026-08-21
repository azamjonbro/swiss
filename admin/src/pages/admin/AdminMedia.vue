<script setup lang="ts">
import { ref } from 'vue';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import type { MediaUploadResult } from '@/services/media';
import { resolveMediaUrl } from '@/utils/media';

const uploads = ref<MediaUploadResult[]>([]);
const copiedUrl = ref('');

function onUploaded(result: MediaUploadResult) {
  uploads.value.unshift(result);
}

async function copy(url: string) {
  await navigator.clipboard.writeText(resolveMediaUrl(url));
  copiedUrl.value = url;
  setTimeout(() => (copiedUrl.value = ''), 1500);
}
</script>

<template>
  <div class="sw-admin-media">
    <h1 class="sw-admin-page-title">Media Library</h1>
    <p class="sw-admin-media__hint">
      Upload images and videos here, then copy the URL into a watch, category, brand, or collection form.
    </p>

    <div class="sw-admin-card sw-admin-media__uploader">
      <MediaUploader label="Upload Media" @uploaded="onUploaded" />
    </div>

    <div v-if="uploads.length" class="sw-admin-media__grid">
      <div v-for="item in uploads" :key="item.filename" class="sw-admin-card sw-admin-media__item">
        <img v-if="item.kind === 'images'" :src="resolveMediaUrl(item.url)" alt="" />
        <video v-else :src="resolveMediaUrl(item.url)" muted controls />
        <button type="button" @click="copy(item.url)">
          {{ copiedUrl === item.url ? 'Copied!' : 'Copy URL' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-admin-media__hint {
  font-size: 0.85rem;
  color: var(--admin-text-muted);
  margin-bottom: 20px;
}

.sw-admin-media__uploader {
  margin-bottom: 24px;
}

.sw-admin-media__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.sw-admin-media__item {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sw-admin-media__item img,
.sw-admin-media__item video {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.sw-admin-media__item button {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
  text-decoration: underline;
}
</style>
