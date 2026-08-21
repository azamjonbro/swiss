<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Inquiry, InquiryStatus } from '@/types/models';
import { adminFetchInquiries, adminUpdateInquiry, adminDeleteInquiry } from '@/services/inquiries';

const inquiries = ref<Inquiry[]>([]);
const statusFilter = ref<InquiryStatus | ''>('');

async function load() {
  const data = await adminFetchInquiries({ status: statusFilter.value || undefined });
  inquiries.value = data.items;
}

async function updateStatus(inquiry: Inquiry, status: InquiryStatus) {
  const updated = await adminUpdateInquiry(inquiry._id, status);
  inquiry.status = updated.status;
}

async function remove(inquiry: Inquiry) {
  if (!confirm(`Delete inquiry from "${inquiry.name}"?`)) return;
  await adminDeleteInquiry(inquiry._id);
  await load();
}

function watchName(watch: Inquiry['watch']): string {
  if (!watch) return '—';
  return typeof watch === 'string' ? watch : watch.name;
}

onMounted(load);
</script>

<template>
  <div class="sw-admin-inquiries">
    <div class="sw-admin-inquiries__header">
      <h1 class="sw-admin-page-title">Inquiries</h1>
      <select v-model="statusFilter" @change="load">
        <option value="">All Statuses</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="sw-admin-card sw-admin-inquiries__table-wrap">
      <table class="sw-admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Watch</th>
            <th>Message</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inquiry in inquiries" :key="inquiry._id">
            <td>{{ inquiry.name }}</td>
            <td>
              <div>{{ inquiry.email }}</div>
              <div>{{ inquiry.phone }}</div>
            </td>
            <td>{{ watchName(inquiry.watch) }}</td>
            <td class="sw-admin-inquiries__message">{{ inquiry.message }}</td>
            <td>
              <select :value="inquiry.status" @change="updateStatus(inquiry, ($event.target as HTMLSelectElement).value as InquiryStatus)">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </td>
            <td>
              <button class="sw-admin-inquiries__delete" type="button" @click="remove(inquiry)">Delete</button>
            </td>
          </tr>
          <tr v-if="!inquiries.length">
            <td colspan="6">No inquiries found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sw-admin-inquiries__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.sw-admin-inquiries__table-wrap {
  padding: 0;
  overflow-x: auto;
}

.sw-admin-inquiries__message {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sw-admin-inquiries__delete {
  font-size: 0.8rem;
  color: #a3313f;
  text-decoration: underline;
}
</style>
