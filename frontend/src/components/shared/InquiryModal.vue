<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import { useLockBodyScroll } from '@/composables/useLockBodyScroll';
import { createInquiry } from '@/services/inquiries';

const ui = useUiStore();
const locale = useLocaleStore();
const account = useAccountStore();
useLockBodyScroll(computed(() => ui.isInquiryOpen));

const name = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref('');

watch(
  () => ui.isInquiryOpen,
  (open) => {
    if (open) {
      isSubmitted.value = false;
      errorMessage.value = '';
      message.value =
        ui.inquiryMessage ?? (ui.inquiryWatch ? `${locale.t('inquiry.prefilledMessage')} ${ui.inquiryWatch.name}.` : '');
      // A signed-in customer shouldn't retype what the account already knows.
      if (account.user) {
        name.value = account.user.name;
        phone.value = account.user.phone;
        email.value = account.user.email;
      }
    }
  },
);

async function submit() {
  if (!name.value || !phone.value || !email.value) {
    errorMessage.value = locale.t('inquiry.errorRequired');
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    await createInquiry({
      name: name.value,
      phone: phone.value,
      email: email.value,
      watch: ui.inquiryWatch?.id,
      message: message.value,
    });
    isSubmitted.value = true;
    if (!account.user) {
      name.value = '';
      phone.value = '';
      email.value = '';
    }
    message.value = '';
  } catch {
    errorMessage.value = locale.t('inquiry.errorGeneric');
  } finally {
    isSubmitting.value = false;
  }
}

function close() {
  ui.closeInquiry();
}
</script>

<template>
  <transition name="sw-fade">
    <div v-if="ui.isInquiryOpen" class="sw-inquiry-backdrop" @click.self="close">
      <div class="sw-inquiry" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Request information">
        <button class="sw-inquiry__close" type="button" :aria-label="locale.t('inquiry.close')" @click="close">{{ locale.t('inquiry.close') }}</button>

        <template v-if="!isSubmitted">
          <span class="sw-eyebrow">{{ locale.t('inquiry.eyebrow') }}</span>
          <h2 class="sw-h2">{{ ui.inquiryWatch ? ui.inquiryWatch.name : locale.t('inquiry.defaultTitle') }}</h2>
          <p class="sw-body">{{ locale.t('inquiry.body') }}</p>

          <form class="sw-inquiry__form" @submit.prevent="submit">
            <label class="sw-inquiry__field">
              <span class="sw-label">{{ locale.t('inquiry.fullName') }}</span>
              <input v-model="name" type="text" required />
            </label>
            <label class="sw-inquiry__field">
              <span class="sw-label">{{ locale.t('inquiry.phone') }}</span>
              <input v-model="phone" type="tel" required />
            </label>
            <label class="sw-inquiry__field">
              <span class="sw-label">{{ locale.t('inquiry.email') }}</span>
              <input v-model="email" type="email" required />
            </label>
            <label class="sw-inquiry__field">
              <span class="sw-label">{{ locale.t('inquiry.message') }}</span>
              <textarea v-model="message" rows="4" />
            </label>

            <p v-if="errorMessage" class="sw-inquiry__error">{{ errorMessage }}</p>

            <button class="sw-btn sw-btn--solid" type="submit" :disabled="isSubmitting">
              {{ isSubmitting ? locale.t('inquiry.sending') : locale.t('inquiry.send') }}
            </button>
          </form>
        </template>

        <template v-else>
          <span class="sw-eyebrow">{{ locale.t('inquiry.thankYouEyebrow') }}</span>
          <h2 class="sw-h2">{{ locale.t('inquiry.thankYouTitle') }}</h2>
          <p class="sw-body">{{ locale.t('inquiry.thankYouBody') }}</p>
          <button class="sw-btn sw-btn--ghost" type="button" @click="close">{{ locale.t('inquiry.close') }}</button>
        </template>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.sw-inquiry-backdrop {
  position: fixed;
  inset: 0;
  z-index: 98;
  background: rgba(10, 10, 10, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.sw-inquiry {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg);
  color: var(--text);
  padding: 56px 44px;
}

.sw-inquiry__close {
  position: absolute;
  top: 24px;
  right: 24px;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sw-inquiry h2 {
  margin-top: 12px;
}

.sw-inquiry .sw-body {
  margin-top: 14px;
}

.sw-inquiry__form {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sw-inquiry__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-inquiry__field input,
.sw-inquiry__field textarea {
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 8px 0;
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color var(--dur-fast) var(--ease-out);
}

/* Touch devices get 16px: below that, iOS Safari zooms the page on focus and
   leaves it zoomed — and this modal opens over the product, so the visitor
   loses the piece they were looking at. */
@media (pointer: coarse) {
  .sw-inquiry__field input,
  .sw-inquiry__field textarea {
    font-size: 1rem;
  }
}

.sw-inquiry__field input:focus,
.sw-inquiry__field textarea:focus {
  border-color: var(--accent);
}

.sw-inquiry__error {
  color: var(--sw-burgundy);
  font-size: 0.85rem;
}

.sw-inquiry__form button {
  margin-top: 8px;
  align-self: flex-start;
}
</style>
