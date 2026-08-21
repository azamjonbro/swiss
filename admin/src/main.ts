import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useThemeStore } from '@/stores/theme';
import { useLocaleStore } from '@/stores/locale';
import '@/assets/scss/global.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Instantiate before mount so the <html> theme/lang attributes are set
// before first paint, avoiding a flash of the wrong theme or language.
useThemeStore();
useLocaleStore();

app.mount('#app');
