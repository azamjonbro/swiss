<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import { useSavedStore } from '@/stores/saved';
import AuthField from '@/components/account/AuthField.vue';

const router = useRouter();
const locale = useLocaleStore();
const account = useAccountStore();
const saved = useSavedStore();

/* ---- Profile ---- */
const firstName = ref('');
const lastName = ref('');
const phone = ref('');
const isSavingProfile = ref(false);
const profileMessage = ref('');
const profileError = ref('');

watch(
  () => account.user,
  (user) => {
    firstName.value = user?.firstName ?? '';
    lastName.value = user?.lastName ?? '';
    phone.value = user?.phone ?? '';
  },
  { immediate: true },
);

async function saveProfile() {
  profileMessage.value = '';
  profileError.value = '';

  if (!firstName.value.trim() || !lastName.value.trim() || !phone.value.trim()) {
    profileError.value = locale.t('account.errorRequired');
    return;
  }

  isSavingProfile.value = true;
  try {
    profileMessage.value = await account.updateProfile({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      phone: phone.value.trim(),
    });
  } catch (err: unknown) {
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    if (code === 'PHONE_TAKEN') profileError.value = locale.t('account.errorPhoneTaken');
    else if (code === 'PHONE_INVALID') profileError.value = locale.t('account.errorPhoneInvalid');
    else profileError.value = locale.t('account.errorGeneric');
  } finally {
    isSavingProfile.value = false;
  }
}

/* ---- Password ---- */
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isSavingPassword = ref(false);
const passwordMessage = ref('');
const passwordError = ref('');

async function savePassword() {
  passwordMessage.value = '';
  passwordError.value = '';

  if (!currentPassword.value || !newPassword.value) {
    passwordError.value = locale.t('account.errorRequired');
    return;
  }
  if (newPassword.value.length < 8) {
    passwordError.value = locale.t('account.errorPasswordShort');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = locale.t('account.errorPasswordMismatch');
    return;
  }

  isSavingPassword.value = true;
  try {
    passwordMessage.value = await account.changePassword(currentPassword.value, newPassword.value);
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: unknown) {
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    passwordError.value =
      code === 'CURRENT_PASSWORD_INVALID'
        ? locale.t('account.errorCurrentPassword')
        : locale.t('account.errorGeneric');
  } finally {
    isSavingPassword.value = false;
  }
}

async function signOut() {
  await account.logout();
  saved.reset();
  router.replace('/account/login');
}
</script>

<template>
  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.settingsProfileTitle') }}</h2>
    <p class="sw-body sw-account__section-lede">{{ locale.t('account.settingsProfileLede') }}</p>

    <form class="sw-account__form" novalidate @submit.prevent="saveProfile">
      <div class="sw-auth-form__row">
        <AuthField v-model="firstName" :label="locale.t('account.firstName')" autocomplete="given-name" />
        <AuthField v-model="lastName" :label="locale.t('account.lastName')" autocomplete="family-name" />
      </div>
      <AuthField
        v-model="phone"
        :label="locale.t('account.phoneLabel')"
        type="tel"
        autocomplete="tel"
        inputmode="tel"
      />
      <!-- The email address is the account's identity and the target of its
           verification link, so it is shown read-only rather than edited here.
           Styled to match the fields above so the column keeps one rhythm. -->
      <div class="sw-account__readonly">
        <span class="sw-account__readonly-label">{{ locale.t('account.emailLabel') }}</span>
        <span class="sw-account__readonly-value">{{ account.user?.email }}</span>
      </div>

      <div class="sw-account__form-actions">
        <button class="sw-btn sw-btn--solid" type="submit" :disabled="isSavingProfile">
          {{ isSavingProfile ? locale.t('account.savingButton') : locale.t('account.saveChanges') }}
        </button>
        <p v-if="profileMessage" class="sw-account__form-message">{{ profileMessage }}</p>
        <p v-if="profileError" class="sw-account__form-message sw-account__form-message--error">{{ profileError }}</p>
      </div>
    </form>
  </section>

  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.settingsPasswordTitle') }}</h2>
    <p class="sw-body sw-account__section-lede">{{ locale.t('account.settingsPasswordLede') }}</p>

    <form class="sw-account__form" novalidate @submit.prevent="savePassword">
      <AuthField
        v-model="currentPassword"
        :label="locale.t('account.currentPasswordLabel')"
        type="password"
        autocomplete="current-password"
      />
      <AuthField
        v-model="newPassword"
        :label="locale.t('account.newPasswordLabel')"
        type="password"
        autocomplete="new-password"
        :hint="locale.t('account.passwordHint')"
      />
      <AuthField
        v-model="confirmPassword"
        :label="locale.t('account.confirmPasswordLabel')"
        type="password"
        autocomplete="new-password"
      />

      <div class="sw-account__form-actions">
        <button class="sw-btn sw-btn--solid" type="submit" :disabled="isSavingPassword">
          {{ isSavingPassword ? locale.t('account.savingButton') : locale.t('account.updatePassword') }}
        </button>
        <p v-if="passwordMessage" class="sw-account__form-message">{{ passwordMessage }}</p>
        <p v-if="passwordError" class="sw-account__form-message sw-account__form-message--error">{{ passwordError }}</p>
      </div>
    </form>
  </section>

  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.settingsSessionTitle') }}</h2>
    <p class="sw-body sw-account__section-lede">{{ locale.t('account.settingsSessionLede') }}</p>

    <div class="sw-account__form-actions">
      <button class="sw-btn" type="button" @click="signOut">
        {{ locale.t('account.logOut') }} <span class="sw-btn__arrow">&rarr;</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.sw-account__readonly {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0 11px;
  border-bottom: 1px solid var(--hairline);
}

.sw-account__readonly-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-account__readonly-value {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 400;
  color: var(--text-muted);
}
</style>
