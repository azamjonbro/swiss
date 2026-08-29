<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const toasts = useToastStore();

const ICONS = { success: 'check', error: 'alert', info: 'info' } as const;
</script>

<template>
  <Teleport to="body">
    <div class="sw-toasts" role="status" aria-live="polite">
      <TransitionGroup name="sw-toast">
        <div v-for="toast in toasts.items" :key="toast.id" class="sw-toast" :class="`is-${toast.kind}`">
          <span class="sw-toast__icon"><AdminIcon :name="ICONS[toast.kind]" :size="14" /></span>
          <span class="sw-toast__text">{{ toast.message }}</span>
          <button class="sw-toast__close" type="button" aria-label="Dismiss" @click="toasts.dismiss(toast.id)">
            <AdminIcon name="close" :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.sw-toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.sw-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 380px;
  padding: 11px 12px 11px 13px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: var(--shadow-lg);
  font-size: 0.85rem;
}

.sw-toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: var(--radius-full);
}

.sw-toast.is-success .sw-toast__icon {
  background: var(--admin-success-soft);
  color: var(--admin-success);
}

.sw-toast.is-error .sw-toast__icon {
  background: var(--admin-danger-soft);
  color: var(--admin-danger);
}

.sw-toast.is-info .sw-toast__icon {
  background: var(--admin-info-soft);
  color: var(--admin-info);
}

.sw-toast__text {
  flex: 1;
  line-height: 1.45;
}

.sw-toast__close {
  flex: none;
  display: flex;
  align-items: center;
  color: var(--admin-text-subtle);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-toast__close:hover {
  color: var(--admin-text);
}

.sw-toast-enter-active,
.sw-toast-leave-active {
  transition: opacity var(--dur-mid) var(--ease-out), transform var(--dur-mid) var(--ease-out);
}

.sw-toast-enter-from,
.sw-toast-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

@media (max-width: 560px) {
  .sw-toasts {
    left: 16px;
    right: 16px;
    bottom: 16px;
  }

  .sw-toast {
    min-width: 0;
    max-width: none;
  }
}
</style>
