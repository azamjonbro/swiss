<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    subtitle?: string;
    /** Panel width. 'wide' suits two-column forms. */
    size?: 'md' | 'wide';
  }>(),
  { size: 'md' },
);

const emit = defineEmits<{ close: []; submit: [] }>();

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close');
}

// The panel scrolls internally, so the page behind it must not scroll with it.
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
  },
  { immediate: true },
);

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sw-modal">
      <div v-if="open" class="sw-modal-backdrop" @click.self="emit('close')">
        <div class="sw-modal" :class="`is-${size}`" role="dialog" aria-modal="true" :aria-label="title">
          <header class="sw-modal__head">
            <div class="sw-modal__heading">
              <h2 class="sw-modal__title">{{ title }}</h2>
              <p v-if="subtitle" class="sw-modal__sub">{{ subtitle }}</p>
            </div>
            <button class="sw-admin-icon-btn" type="button" aria-label="Close" @click="emit('close')">
              <AdminIcon name="close" :size="16" />
            </button>
          </header>

          <form class="sw-modal__form" @submit.prevent="emit('submit')">
            <div class="sw-modal__body">
              <slot />
            </div>
            <footer class="sw-modal__foot">
              <slot name="footer" />
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sw-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(16, 15, 14, 0.6);
  backdrop-filter: blur(6px);
}

.sw-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 580px;
  max-height: min(88vh, 860px);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.sw-modal.is-wide {
  max-width: 820px;
}

.sw-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 26px 32px 20px;
  border-bottom: 1px solid var(--admin-border);
}

.sw-modal__title {
  font-size: 1.15rem;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.sw-modal__sub {
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--admin-text-muted);
}

.sw-modal__form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.sw-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 30px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.sw-modal__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid var(--admin-border);
  background: var(--admin-surface-2);
}

.sw-modal-enter-active,
.sw-modal-leave-active {
  transition: opacity var(--dur-mid) var(--ease-out);
}

.sw-modal-enter-active .sw-modal,
.sw-modal-leave-active .sw-modal {
  transition: transform var(--dur-mid) var(--ease-luxury), opacity var(--dur-mid) var(--ease-out);
}

.sw-modal-enter-from,
.sw-modal-leave-to {
  opacity: 0;
}

.sw-modal-enter-from .sw-modal,
.sw-modal-leave-to .sw-modal {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 640px) {
  .sw-modal-backdrop {
    padding: 0;
    align-items: flex-end;
  }

  .sw-modal,
  .sw-modal.is-wide {
    max-width: none;
    max-height: 92vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .sw-modal__body {
    padding: 24px 20px 28px;
  }

  .sw-modal__head {
    padding: 22px 20px 18px;
  }

  .sw-modal__foot {
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
  }

  .sw-modal__foot .sw-admin-btn {
    flex: 1;
  }
}
</style>
