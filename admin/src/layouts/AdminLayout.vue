<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AdminSidebar from '@/components/admin/AdminSidebar.vue';
import AdminHeader from '@/components/admin/AdminHeader.vue';
import AdminToasts from '@/components/admin/AdminToasts.vue';
import AdminConfirm from '@/components/admin/AdminConfirm.vue';

const route = useRoute();
const isNavOpen = ref(false);

// Navigating on a phone should leave the drawer behind.
watch(() => route.fullPath, () => (isNavOpen.value = false));
</script>

<template>
  <div class="sw-admin">
    <AdminSidebar :open="isNavOpen" @close="isNavOpen = false" />
    <div class="sw-admin__main">
      <AdminHeader @toggle-nav="isNavOpen = !isNavOpen" />
      <main class="sw-admin__content">
        <router-view v-slot="{ Component }">
          <transition name="sw-page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    <AdminToasts />
    <AdminConfirm />
  </div>
</template>

<style scoped>
.sw-admin__main {
  margin-left: var(--admin-sidebar-w);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.sw-admin__content {
  flex: 1;
  padding: clamp(20px, 3vw, 34px) clamp(16px, 3vw, 34px) 80px;
  max-width: 1440px;
  width: 100%;
}

.sw-page-enter-active,
.sw-page-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.sw-page-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.sw-page-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .sw-admin__main {
    margin-left: 0;
  }
}
</style>
