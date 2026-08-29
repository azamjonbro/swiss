<script setup lang="ts">
import { useConfirmStore } from '@/stores/confirm';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const confirm = useConfirmStore();
</script>

<template>
  <Teleport to="body">
    <Transition name="sw-confirm">
      <div v-if="confirm.request" class="sw-confirm-backdrop" @click.self="confirm.answer(false)">
        <div class="sw-confirm" role="alertdialog" aria-modal="true">
          <span class="sw-confirm__icon" :class="{ 'is-danger': confirm.request.danger }">
            <AdminIcon name="alert" :size="18" />
          </span>
          <h2 class="sw-confirm__title">{{ confirm.request.title }}</h2>
          <p v-if="confirm.request.body" class="sw-confirm__body">{{ confirm.request.body }}</p>
          <div class="sw-confirm__actions">
            <button class="sw-admin-btn sw-admin-btn--ghost" type="button" @click="confirm.answer(false)">Cancel</button>
            <button
              class="sw-admin-btn"
              :class="{ 'sw-admin-btn--danger': confirm.request.danger }"
              type="button"
              @click="confirm.answer(true)"
            >
              {{ confirm.request.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sw-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(16, 15, 14, 0.5);
  backdrop-filter: blur(3px);
}

.sw-confirm {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  border-radius: var(--radius-lg);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.sw-confirm__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 14px;
  border-radius: var(--radius-full);
  background: var(--admin-surface-3);
  color: var(--admin-text-muted);
}

.sw-confirm__icon.is-danger {
  background: var(--admin-danger-soft);
  color: var(--admin-danger);
}

.sw-confirm__title {
  font-size: 1rem;
  font-weight: 620;
  letter-spacing: -0.01em;
}

.sw-confirm__body {
  margin-top: 7px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--admin-text-muted);
}

.sw-confirm__actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.sw-confirm__actions .sw-admin-btn {
  flex: 1;
}

.sw-confirm-enter-active,
.sw-confirm-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out);
}

.sw-confirm-enter-from,
.sw-confirm-leave-to {
  opacity: 0;
}
</style>
