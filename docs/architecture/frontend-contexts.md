# Frontend Contexts

The app uses five React contexts. They are the primary mechanism for sharing state across the component tree without prop drilling.

---

## Provider Nesting Order

From outermost to innermost (as defined in `client/src/main.jsx` and `client/src/App.jsx`):

```
ThemeProvider           (main.jsx)
  DialogProvider        (App.jsx)
    AuthProvider        (App.jsx)
      [BrowserRouter]
        ...
          AppLayout
            TransactionModalProvider  (AppLayout.jsx)
              OnboardingProvider      (AppLayout.jsx)
                LayoutInner
```

This order matters:
- `DialogProvider` is outside `AuthProvider` so dialogs work during auth errors
- `TransactionModalProvider` and `OnboardingProvider` are inside `AppLayout`, so they only exist for authenticated routes
- `OnboardingProvider` reads from `TransactionModalContext`, so it must be nested inside `TransactionModalProvider`

---

## ThemeContext

**File:** `client/src/context/ThemeContext.jsx`

Manages light/dark theme. Persists to `localStorage` under the key `gastar-theme`.

### Hook

```js
import { useTheme } from '../context/ThemeContext.jsx';
const { theme, toggleTheme } = useTheme();
```

### API

| Value | Type | Description |
|-------|------|-------------|
| `theme` | `"light" \| "dark"` | Current theme |
| `toggleTheme` | `() => void` | Toggle between light and dark |

### Implementation notes

- Applies the theme by adding/removing a `dark` class on `document.documentElement`
- Reads the stored preference on mount; defaults to `"light"` if none stored
- Used by `ThemeToggle` component in the sidebar/header

---

## AuthContext

**File:** `client/src/context/AuthContext.jsx`

Manages the current authenticated user. On mount, calls `GET /api/auth/me` to restore the session.

### Hook

```js
import { useAuth } from '../context/AuthContext.jsx';
const { user, loading, authError, login, register, logout, updateProfile, deleteAccount, loadSession } = useAuth();
```

### API

| Value | Type | Description |
|-------|------|-------------|
| `user` | `object \| null` | Current user `{ id, email, name, cotizacionPreference }` |
| `loading` | `boolean` | True while the initial `/auth/me` check is in flight |
| `authError` | `string` | Set if the session check fails with a non-401 error (e.g., network error) |
| `loadSession` | `() => void` | Re-trigger the `/auth/me` check (used by the error retry button) |
| `login` | `(email, password) => Promise` | POST `/api/auth/login`, updates `user` |
| `register` | `(name, email, password) => Promise` | POST `/api/auth/register`, updates `user` |
| `logout` | `() => Promise` | POST `/api/auth/logout`, clears `user` |
| `updateProfile` | `(data) => Promise<user>` | PATCH `/api/auth/me`, updates `user` in context |
| `deleteAccount` | `() => Promise` | DELETE `/api/auth/me`, clears `user` |

### Implementation notes

- A 401 response from `/auth/me` on mount means the user is not logged in — this is not an error, it sets `user = null` silently
- Any other error (network failure, 500) sets `authError` and shows a full-screen retry UI via `PrivateRoute`
- After `login` or `register`, the server sets an HTTP-only cookie; subsequent API calls include it automatically via `withCredentials: true`

---

## DialogContext

**File:** `client/src/context/DialogContext.jsx`

Global imperative confirmation and alert dialog. Renders a single modal instance at the `DialogProvider` level. All calls return a Promise — `true` if confirmed, `false` if cancelled/dismissed.

### Hook

```js
import { useDialog } from '../context/DialogContext.jsx';
const { showAlert, showConfirm } = useDialog();
```

### API

#### `showAlert(options) → Promise<true>`

Shows a modal with a single "Aceptar" button. Always resolves `true`.

```js
await showAlert({
  title: 'Aviso',           // optional, defaults to "Aviso"
  message: 'Descripción',
  confirmLabel: 'Aceptar',  // optional
});
```

#### `showConfirm(options) → Promise<boolean>`

Shows a modal with "Cancelar" and a confirm button. Resolves `true` on confirm, `false` on cancel or close.

```js
const confirmed = await showConfirm({
  title: 'Eliminar cuenta',
  message: 'Esta acción no se puede deshacer.',
  confirmLabel: 'Eliminar',   // optional
  cancelLabel: 'Cancelar',    // optional
  destructive: true,          // optional — makes confirm button red
});
if (!confirmed) return;
```

### Implementation notes

- Renders the modal inline inside `DialogProvider` — no portals needed
- Uses a `resolve` function stored in state; calling `closeDialog(result)` calls it
- `destructive: true` sets the confirm button variant to `"danger"` and the message banner variant to `"error"`

---

## TransactionModalContext

**File:** `client/src/context/TransactionModalContext.jsx`

Controls the global transaction composer modal and provides a `refreshKey` signal that other components can watch to reload data after a transaction mutation.

### Hook

```js
import { useTransactionModal } from '../context/TransactionModalContext.jsx';
const { isOpen, editData, refreshKey, openModal, closeModal, triggerRefresh } = useTransactionModal();
```

### API

| Value | Type | Description |
|-------|------|-------------|
| `isOpen` | `boolean` | Whether the modal is currently open |
| `editData` | `object \| null` | Transaction being edited, or `null` for a new transaction |
| `refreshKey` | `number` | Increments whenever `triggerRefresh()` is called |
| `openModal` | `(transaction?) => void` | Open modal; pass a transaction object to edit it, or nothing to create |
| `closeModal` | `() => void` | Close modal and clear `editData` |
| `triggerRefresh` | `() => void` | Increment `refreshKey` to signal consumers to reload data |

### Usage pattern

Components that display transaction-derived data (Dashboard, Transactions page) watch `refreshKey` in a `useEffect` dependency array:

```js
const { refreshKey } = useTransactionModal();

useEffect(() => {
  load();
}, [load, refreshKey]);
```

After a transaction is saved or deleted, the modal (or deletion handler) calls `triggerRefresh()`, causing all watching components to re-fetch.

The FAB (floating action button) in `AppLayout` calls `openModal()` with no argument to open the "new transaction" form.

---

## OnboardingContext

**File:** `client/src/context/OnboardingContext.jsx`

Manages the onboarding wizard shown to new users. Tracks wizard state (step, accounts created during onboarding) and controls when the wizard appears.

### Hook

```js
import { useOnboarding } from '../context/OnboardingContext.jsx';
const { isOpen, currentStep, createdAccounts, openOnboarding, goToNextStep, goToPrevStep, addCreatedAccount, markComplete } = useOnboarding();
```

### API

| Value | Type | Description |
|-------|------|-------------|
| `isOpen` | `boolean` | Whether the wizard is visible |
| `currentStep` | `number` | Current step index (0-based) |
| `createdAccounts` | `Account[]` | Accounts created during this onboarding session |
| `openOnboarding` | `() => void` | Manually open the wizard (used by the re-run button in Profile) |
| `goToNextStep` | `() => void` | Advance to next step |
| `goToPrevStep` | `() => void` | Go back one step |
| `addCreatedAccount` | `(account) => void` | Add an account to the session list |
| `markComplete` | `() => void` | Mark onboarding done in localStorage, close wizard, trigger refresh |

### Auto-trigger logic

On mount (when a user is logged in), the context calls `GET /api/accounts`. If the user has zero accounts AND the localStorage key `onboarding_complete_<userId>` is not `"true"`, the wizard opens automatically. If the user already has accounts, the key is silently set to `"true"` (handles existing users before onboarding was added).

### Re-run button

The Profile page has a button that calls `openOnboarding()`. This resets `currentStep` to 0 and clears `createdAccounts`, but does NOT clear the localStorage flag — `markComplete` will just overwrite it again when they finish.

### Completion

`markComplete()`:
1. Sets `localStorage.setItem('onboarding_complete_<userId>', 'true')`
2. Closes the wizard
3. Calls `triggerRefresh()` from `TransactionModalContext` so the Dashboard reloads and shows the newly created accounts

---

## Adding a New Context

When the app needs new shared state:

1. Create `client/src/context/MyContext.jsx` with a `MyProvider` and `useMyContext` hook
2. Follow the `useMemo` pattern for the context value to avoid unnecessary re-renders
3. Wrap it in the appropriate place in the provider tree — consider which other contexts it depends on and which components need access to it
4. Export both `MyProvider` and `useMyContext` from the file
