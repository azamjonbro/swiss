/**
 * Whether the storefront publishes prices at all.
 *
 * The boutique has taken them down while it settles on how it wants to present
 * them. This is one switch rather than a commented-out line in each of the six
 * places a price is drawn, because those places have to agree: a card with no
 * price next to a "price: low to high" sort control, or a catalogue that hides
 * the figure while the JSON-LD keeps publishing it to Google, reads as a bug
 * rather than as a decision.
 *
 * Off by default, so a build that has never heard of the flag is the quiet one.
 * Set `VITE_SHOW_PRICES=1` to put them back — nothing else has to change.
 *
 * What it deliberately does *not* cover: a customer's own order history
 * (`pages/account/AccountOrders.vue`). Those are amounts the customer has
 * already paid, and blanking them would be hiding a record from the person it
 * belongs to.
 */
export const SHOW_PRICES = import.meta.env.VITE_SHOW_PRICES === '1';
