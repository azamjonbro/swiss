<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useCartStore } from '@/stores/cart';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';
import { useLockBodyScroll } from '@/composables/useLockBodyScroll';
import SmartImage from '@/components/shared/SmartImage.vue';

const ui = useUiStore();
const cart = useCartStore();
const locale = useLocaleStore();
const currency = useCurrencyStore();
useLockBodyScroll(computed(() => ui.isCartOpen));

function close() {
  ui.closeCart();
}

function checkout() {
  if (!cart.items.length) return;
  const first = cart.items[0];
  ui.openInquiry({ id: first.watchId, name: locale.t('cart.title') }, cart.buildInquiryMessage());
}
</script>

<template>
  <transition name="sw-fade">
    <div v-if="ui.isCartOpen" class="sw-cart-backdrop" @click.self="close">
      <aside class="sw-cart" data-lenis-prevent role="dialog" aria-modal="true" :aria-label="locale.t('cart.title')">
        <div class="sw-cart__head">
          <span class="sw-eyebrow">{{ locale.t('cart.title') }}</span>
          <button class="sw-cart__close" type="button" :aria-label="locale.t('cart.close')" @click="close">
            {{ locale.t('cart.close') }}
          </button>
        </div>

        <div v-if="!cart.items.length" class="sw-cart__empty">
          <p class="sw-body">{{ locale.t('cart.empty') }}</p>
          <button class="sw-btn" type="button" @click="close">{{ locale.t('cart.continueBrowsing') }}</button>
        </div>

        <template v-else>
          <ul class="sw-cart__list">
            <li v-for="item in cart.items" :key="item.key" class="sw-cart__item">
              <div class="sw-cart__item-media">
                <SmartImage :src="item.image" :alt="item.name" aspect-ratio="1 / 1" object-fit="contain" />
              </div>
              <div class="sw-cart__item-body">
                <span class="sw-cart__item-brand">{{ item.brandName }}</span>
                <span class="sw-cart__item-name">{{ item.name }}</span>
                <span v-if="item.colorLabel" class="sw-cart__item-color">{{ item.colorLabel }}</span>
                <div class="sw-cart__item-row">
                  <div class="sw-cart__stepper">
                    <button type="button" :aria-label="'-'" @click="cart.setQuantity(item.key, item.quantity - 1)">&minus;</button>
                    <span>{{ item.quantity }}</span>
                    <button type="button" :aria-label="'+'" @click="cart.setQuantity(item.key, item.quantity + 1)">&plus;</button>
                  </div>
                  <span class="sw-cart__item-price">{{ currency.format(item.price * item.quantity) }}</span>
                </div>
                <button class="sw-cart__remove" type="button" @click="cart.remove(item.key)">
                  {{ locale.t('cart.remove') }}
                </button>
              </div>
            </li>
          </ul>

          <div class="sw-cart__foot">
            <div class="sw-cart__subtotal">
              <span class="sw-label">{{ locale.t('cart.subtotal') }}</span>
              <span class="sw-cart__subtotal-value">{{ currency.format(cart.subtotal) }}</span>
            </div>
            <p class="sw-cart__note">{{ locale.t('cart.checkoutNote') }}</p>
            <button class="sw-btn sw-btn--solid sw-cart__checkout" type="button" @click="checkout">
              {{ locale.t('cart.submitOrder') }}
            </button>
          </div>
        </template>
      </aside>
    </div>
  </transition>
</template>

<style scoped>
.sw-cart-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(10, 10, 10, 0.5);
  display: flex;
  justify-content: flex-end;
}

.sw-cart {
  width: min(440px, 100vw);
  height: 100%;
  background: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  padding: 32px clamp(20px, 3vw, 36px) 28px;
  overflow-y: auto;
}

.sw-cart__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.sw-cart__close {
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sw-cart__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding-top: 48px;
}

.sw-cart__list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 0;
  flex: 1;
}

.sw-cart__item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 16px;
}

.sw-cart__item-media {
  background: var(--surface-media);
}

.sw-cart__item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sw-cart__item-brand {
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-cart__item-name {
  font-family: var(--font-serif);
  font-size: 1.05rem;
}

.sw-cart__item-color {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.sw-cart__item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.sw-cart__stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  padding: 4px 10px;
  font-size: 0.8rem;
}

.sw-cart__item-price {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.sw-cart__remove {
  margin-top: 8px;
  align-self: flex-start;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-decoration: underline;
}

.sw-cart__foot {
  border-top: 1px solid var(--border);
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-cart__subtotal {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.sw-cart__subtotal-value {
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}

.sw-cart__note {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.sw-cart__checkout {
  width: 100%;
  justify-content: center;
}
</style>
