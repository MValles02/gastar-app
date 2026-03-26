# Onboarding

The onboarding wizard is a multi-step modal shown to new users on their first login. It guides them through creating initial accounts, reviewing their default categories, and learning how to record transactions.

---

## Files

- `client/src/context/OnboardingContext.jsx` — wizard state management
- `client/src/components/onboarding/OnboardingWizard.jsx` — modal shell and step router
- `client/src/components/onboarding/OnboardingProgressBar.jsx` — step indicator
- `client/src/components/onboarding/steps/WelcomeStep.jsx`
- `client/src/components/onboarding/steps/AccountsStep.jsx`
- `client/src/components/onboarding/steps/CategoriesStep.jsx`
- `client/src/components/onboarding/steps/TutorialStep.jsx`

---

## Wizard Steps

The wizard has 4 steps (0-indexed):

| Step | Component | Description |
|------|-----------|-------------|
| 0 | `WelcomeStep` | Welcome screen with Gastar logo and a list of what the wizard will cover. Two CTAs: "Empezar" (go to step 1) or "Saltar por ahora" (mark complete and close) |
| 1 | `AccountsStep` | Lets the user create one or more accounts. Uses the same `AccountModal` form as the Accounts page |
| 2 | `CategoriesStep` | Shows the user their default categories (seeded on registration) and allows editing |
| 3 | `TutorialStep` | Brief tutorial on how to record transactions using the FAB. Final CTA marks onboarding complete |

The `OnboardingWizard` renders as a portal (`createPortal` to `document.body`) so it appears above all other content including the sidebar and header. It is a plain `div` overlay — there is intentionally no click-outside or ESC dismiss behavior. The only way to close the wizard is through the explicit buttons in each step ("Saltar por ahora" on the welcome step, or the completion button on the final step). Do not add a backdrop click handler without also calling `markComplete()` — a silent close would leave the localStorage flag unset and cause the wizard to reappear on next login if the user still has no accounts.

---

## Auto-trigger Logic

`OnboardingContext` runs on mount (when `user` is set) and checks:

1. Is `localStorage.getItem('onboarding_complete_<userId>')` equal to `"true"`? If yes: do nothing.
2. Call `GET /api/accounts`. If the user has **zero accounts**: open the wizard.
3. If the user already has accounts (existing user, or user who skipped once and created an account): silently set the flag to `"true"` and do nothing.

If the accounts fetch fails, the wizard is suppressed (to avoid blocking the app on a network error).

---

## Completion & State Persistence

Completion is tracked in `localStorage` with the key `onboarding_complete_<userId>` (user ID is embedded to handle multiple accounts on the same device).

`markComplete()` does three things:
1. Sets the localStorage flag
2. Closes the wizard (`isOpen = false`)
3. Calls `triggerRefresh()` from `TransactionModalContext` — this causes the Dashboard and any other refresh-subscriber to reload, showing newly created accounts immediately

---

## Re-running the Wizard

The Profile page has a button that calls `openOnboarding()`. This:
- Resets `currentStep` to `0`
- Clears `createdAccounts` for the session
- Sets `isOpen = true`

It does NOT clear the localStorage flag. When the user completes or skips again, `markComplete()` will just overwrite the flag with `"true"` again.

---

## Adding a New Onboarding Step

1. Create `client/src/components/onboarding/steps/MyStep.jsx`
2. Use `useOnboarding()` to access `goToNextStep`, `goToPrevStep`, `markComplete`, etc.
3. Add a new `{currentStep === N && <MyStep />}` branch in `OnboardingWizard.jsx`
4. Update `OnboardingProgressBar` to reflect the new total step count

---

## Onboarding & Default Categories

New users who register via email/password get 13 default categories seeded in `POST /api/auth/register`. The `CategoriesStep` shows these to the user so they are aware of them and can rename or skip them.

Users who register via Google OAuth do **not** get default categories (known gap — see [Authentication](./authentication.md)). If they run the wizard, the categories step will show an empty list.
