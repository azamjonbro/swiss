<script setup lang="ts">
import AdminSidebar from '@/components/admin/AdminSidebar.vue';
import AdminHeader from '@/components/admin/AdminHeader.vue';
</script>

<template>
  <div class="sw-admin">
    <AdminSidebar />
    <div class="sw-admin__content">
      <AdminHeader />
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.sw-admin__content {
  margin-left: var(--admin-sidebar-w);
  padding: 32px 40px 80px;
}

@media (max-width: 900px) {
  .sw-admin__content {
    margin-left: 0;
    padding: 24px;
  }
}
</style>
