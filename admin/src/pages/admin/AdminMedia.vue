<script setup lang="ts">
import { ref } from 'vue';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import type { MediaUploadResult } from '@/services/media';
import { resolveMediaUrl } from '@/utils/media';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';

const locale = useLocaleStore();
const toasts = useToastStore();

const uploads = ref<MediaUploadResult[]>([]);
const copiedUrl = ref('');

function onUploaded(result: MediaUploadResult) {
  uploads.value.unshift(result);
}

async function copy(url: string) {
  await navigator.clipboard.writeText(resolveMediaUrl(url));
  copiedUrl.value = url;
  toasts.success(locale.t('admin.copied'));
  setTimeout(() => (copiedUrl.value = ''), 1500);
}
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.media') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.mediaSub') }}</p>
      </div>
    </div>

    <div class="sw-media__uploader">
      <MediaUploader variant="dropzone" :label="locale.t('admin.uploadMedia')" @uploaded="onUploaded" />
    </div>

    <AdminEmpty
      v-if="!uploads.length"
      icon="media"
      :title="locale.t('admin.emptyMedia')"
      :body="locale.t('admin.emptyMediaBody')"
    />

    <div v-else class="sw-media__grid">
      <figure v-for="item in uploads" :key="item.filename" class="sw-media__item">
        <img v-if="item.kind === 'images'" :src="resolveMediaUrl(item.url)" alt="" />
        <video v-else :src="resolveMediaUrl(item.url)" muted controls />
        <figcaption class="sw-media__caption">
          <span class="sw-media__name" :title="item.filename">{{ item.filename }}</span>
          <button class="sw-admin-btn sw-admin-btn--quiet sw-admin-btn--sm" type="button" @click="copy(item.url)">
            <AdminIcon :name="copiedUrl === item.url ? 'check' : 'copy'" :size="13" />
            {{ copiedUrl === item.url ? locale.t('admin.copied') : locale.t('admin.copyUrl') }}
          </button>
        </figcaption>
      </figure>
    </div>
  </div>
</template>

<style scoped>
.sw-media__uploader {
  margin-bottom: 24px;
  max-width: 640px;
}

.sw-media__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
  gap: 16px;
}

.sw-media__item {
  display: flex;
  flex-direction: column;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.sw-media__item img,
.sw-media__item video {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  background: var(--admin-surface-3);
}

.sw-media__caption {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px 11px;
  border-top: 1px solid var(--admin-border);
}

.sw-media__name {
  max-width: 100%;
  font-size: 0.75rem;
  color: var(--admin-text-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
