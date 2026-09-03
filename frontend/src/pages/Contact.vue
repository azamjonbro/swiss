<script setup lang="ts">
import { ref, computed } from 'vue';
import { createInquiry } from '@/services/inquiries';
import { useLocaleStore } from '@/stores/locale';
import { site } from '@/utils/seo';
import { telHref } from '@/seo/schema.mjs';
import { trackGoal } from '@/utils/analytics';
import TurnstileWidget from '@/components/shared/TurnstileWidget.vue';

const locale = useLocaleStore();

// Empty is a legitimate state: the business has not published these yet. The
// block disappears rather than showing a placeholder — and the Organization
// JSON-LD omits the same fields, so the page and the markup agree.
const contactEmail = site.contactEmail ?? '';
const contactPhone = site.contactPhone ?? '';

const name = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const errorMessage = ref('');
const captchaToken = ref('');
const captcha = ref<InstanceType<typeof TurnstileWidget> | null>(null);

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
const needsCaptcha = computed(() => Boolean(SITE_KEY) && !captchaToken.value);

async function submit() {
  if (!name.value || !phone.value || !email.value) {
    errorMessage.value = locale.t('contact.errorRequired');
    return;
  }
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    await createInquiry({
      name: name.value,
      phone: phone.value,
      email: email.value,
      message: message.value,
      captchaToken: captchaToken.value,
    });
    isSubmitted.value = true;
  } catch (err: unknown) {
    // Single-use token: a failed submission has to get a new one.
    captcha.value?.reset();
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    errorMessage.value =
      code === 'CAPTCHA_REQUIRED' || code === 'CAPTCHA_FAILED'
        ? locale.t('account.captchaFailed')
        : locale.t('contact.errorGeneric');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="sw-contact">
    <header class="sw-contact__header">
      <span class="sw-eyebrow">{{ locale.t('contact.eyebrow') }}</span>
      <h1 class="sw-h1">{{ locale.t('contact.title') }}</h1>
      <p class="sw-body-lg">{{ locale.t('contact.intro') }}</p>
    </header>

    <div class="sw-contact__grid">
      <div class="sw-contact__details">
        <div class="sw-contact__block">
          <span class="sw-eyebrow">{{ locale.t('contact.showroom') }}</span>
          <p class="sw-body">{{ locale.t('contact.showroomValue') }}</p>
        </div>
        <div v-if="contactPhone" class="sw-contact__block">
          <span class="sw-eyebrow">{{ locale.t('contact.phone') }}</span>
          <a class="sw-body" :href="telHref(contactPhone)" @click="trackGoal('phone_click')">{{ contactPhone }}</a>
        </div>
        <div v-if="contactEmail" class="sw-contact__block">
          <span class="sw-eyebrow">{{ locale.t('contact.email') }}</span>
          <a class="sw-body" :href="`mailto:${contactEmail}`" @click="trackGoal('email_click')">{{ contactEmail }}</a>
        </div>
        <div class="sw-contact__block">
          <span class="sw-eyebrow">{{ locale.t('contact.instagram') }}</span>
          <a class="sw-body" href="https://instagram.com/swisswatch_premium" target="_blank" rel="noopener" @click="trackGoal('instagram_click')">
            @swisswatch_premium
          </a>
        </div>
      </div>

      <div class="sw-contact__form-wrap">
        <template v-if="!isSubmitted">
          <form class="sw-contact__form" @submit.prevent="submit">
            <label class="sw-contact__field">
              <span class="sw-label">{{ locale.t('contact.fullName') }}</span>
              <input v-model="name" type="text" required />
            </label>
            <label class="sw-contact__field">
              <span class="sw-label">{{ locale.t('contact.phoneLabel') }}</span>
              <input v-model="phone" type="tel" required />
            </label>
            <label class="sw-contact__field">
              <span class="sw-label">{{ locale.t('contact.emailLabel') }}</span>
              <input v-model="email" type="email" required />
            </label>
            <label class="sw-contact__field">
              <span class="sw-label">{{ locale.t('contact.messageLabel') }}</span>
              <textarea v-model="message" rows="5" />
            </label>

            <TurnstileWidget ref="captcha" v-model="captchaToken" />

            <p v-if="errorMessage" class="sw-contact__error">{{ errorMessage }}</p>

            <button class="sw-btn sw-btn--solid" type="submit" :disabled="isSubmitting || needsCaptcha">
              {{ isSubmitting ? locale.t('contact.sending') : locale.t('contact.send') }}
            </button>
          </form>
        </template>
        <template v-else>
          <span class="sw-eyebrow">{{ locale.t('contact.thankYouEyebrow') }}</span>
          <h2 class="sw-h2">{{ locale.t('contact.thankYouTitle') }}</h2>
          <p class="sw-body">{{ locale.t('contact.thankYouBody') }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-contact {
  padding: calc(var(--header-height) + 48px) var(--container-pad) 140px;
}

.sw-contact__header {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 80px;
}

.sw-contact__grid {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: clamp(48px, 6vw, 96px);
}

.sw-contact__details {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sw-contact__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-contact__form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 480px;
}

.sw-contact__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-contact__field input,
.sw-contact__field textarea {
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 10px 0;
  font-size: 1rem;
  resize: vertical;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.sw-contact__field input:focus,
.sw-contact__field textarea:focus {
  border-color: var(--accent);
}

.sw-contact__error {
  color: var(--sw-burgundy);
  font-size: 0.85rem;
}

.sw-contact__form button {
  align-self: flex-start;
  margin-top: 8px;
}

@media (max-width: 860px) {
  .sw-contact__grid {
    grid-template-columns: 1fr;
  }
}
</style>
