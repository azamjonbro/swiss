<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="sw-admin-settings">
    <h1 class="sw-admin-page-title">Settings</h1>

    <div class="sw-admin-card sw-admin-settings__card">
      <span class="sw-eyebrow">Account</span>
      <dl class="sw-admin-settings__list">
        <div>
          <dt>Name</dt>
          <dd>{{ auth.admin?.name }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{{ auth.admin?.email }}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{{ auth.admin?.role }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.sw-admin-settings__card {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sw-admin-settings__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-admin-settings__list div {
  display: flex;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--admin-border);
}

.sw-admin-settings__list dt {
  color: var(--admin-text-muted);
  font-size: 0.85rem;
}
</style>
