/**
 * Client-safe business and timing numbers, one named place. Relative imports only (schema.ts and
 * the e2e specs import this file without the `#lib` alias). Server-only numbers live in
 * `server/constants.ts`.
 */
import { PASSWORD_MIN_LENGTH } from './shared/runtime.js';

/** Text-field limits, shared by server validation and the forms' maxlength/minlength attributes. */
export const NAME_MAX_LENGTH = 40;
export const DESCRIPTION_MAX_LENGTH = 60;
export const USER_NAME_MAX_LENGTH = 80;
export { PASSWORD_MIN_LENGTH };
export const PASSWORD_MAX_LENGTH = 128;

/** Savings percent is stored as percent x 100 (1000 = 10 %), at most 100 %. */
export const SAVINGS_PERCENT_MAX = 10000;
export const MAX_DAY_OF_MONTH = 31;

/** Seconds before the verification email can be sent again. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Larger alert counts show as "9+". */
export const MAX_BADGE_COUNT = 9;

/** Mirror `--dur-fast`, `--dur-base`, `--dur-slow` and the reduced-motion `--dur-reduced` in app.css. */
export const DUR_FAST = 120;
export const DUR_BASE = 200;
export const DUR_SLOW = 280;
export const DUR_REDUCED = 100;

/** The spring back to place after a page drag (`--dur-slow`); the page resets RESET_SLACK_MS after it ends. */
export const SPRING_MS = DUR_SLOW;
export const RESET_SLACK_MS = 20;
/** The slide off-screen after a committed swipe (`--dur-base`); the navigation starts when it ends. */
export const SLIDE_OUT_MS = DUR_BASE;
/** Wait this long for the new page to land, then re-check every POLL_MS while a navigation is pending. */
export const SETTLE_MS = 1500;
export const POLL_MS = 300;

/** vaul's close animation (TRANSITIONS.DURATION = 0.5s, not exported); bits-ui returns focus to the trigger as the content unmounts, before this ends. */
export const DRAWER_CLOSE_MS = 500;
/** The sheet's lift above the iOS keyboard (WAAPI duration). */
export const SHEET_KEYBOARD_MS = 250;
/** A navigation shows the progress bar only after this long. */
export const NAV_PROGRESS_DELAY_MS = 150;
/** A resting finger presses a row after PRESS_DELAY_MS; a quick tap flashes it for TAP_FLASH_MS. */
export const PRESS_DELAY_MS = 120;
export const TAP_FLASH_MS = 100;
/** The pull-to-refresh spinner shows at least this long. */
export const MIN_SPIN_MS = 400;
/** A pop that never lands stops skipping the page transition after this long. */
export const POP_TIMEOUT_MS = 1000;
