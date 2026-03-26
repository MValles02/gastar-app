# Categories

Categories are user-defined labels that classify transactions. Every transaction must belong to exactly one category. Categories have an optional icon, which maps to a Lucide React icon name.

There is no distinction between "income categories" and "expense categories" — any category can be used with any transaction type. This keeps the model simple and flexible.

---

## Files

- `server/src/routes/categories.routes.js`
- `server/src/validators/category.validators.js`
- `client/src/pages/Categories.jsx`
- `client/src/components/categories/CategoryList.jsx`
- `client/src/components/categories/CategoryModal.jsx`
- `client/src/services/categories.js`

---

## API Endpoints

All require authentication.

### `GET /api/categories`

Returns all categories belonging to the authenticated user, ordered by name.

**Response:**
```json
{
  "data": [
    { "id": "uuid", "userId": "uuid", "name": "Comida", "icon": "utensils" }
  ]
}
```

### `POST /api/categories`

**Request:**
```json
{
  "name": "string (min 1, max 50)",
  "icon": "string (max 50)"   // optional — Lucide icon name
}
```

**Response:** 201 with `{ data: category }`

### `PUT /api/categories/:id`

Partial update — all fields optional.

**Request:**
```json
{
  "name": "string",   // optional
  "icon": "string"    // optional
}
```

**Response:** `{ data: category }`

### `DELETE /api/categories/:id`

Categories with associated transactions **cannot be deleted** — returns 400. This is intentional and permanent: deleting a category would orphan its transactions. The user must reassign or delete the transactions first.

**Response:**
- 400 if category has transactions: `"No se puede eliminar una categoría con transacciones asociadas"`
- 200 if no transactions: `{ data: { message: "Categoría eliminada" } }`

---

## Default Categories

When a user registers via email/password, 13 default categories are seeded automatically in `POST /api/auth/register`:

| Name | Icon |
|------|------|
| Salario | `banknote` |
| Freelance | `laptop` |
| Inversiones | `trending-up` |
| Otros ingresos | `plus-circle` |
| Comida | `utensils` |
| Transporte | `car` |
| Alquiler | `home` |
| Entretenimiento | `gamepad-2` |
| Salud | `heart-pulse` |
| Educación | `graduation-cap` |
| Ropa | `shirt` |
| Servicios | `zap` |
| Otros gastos | `minus-circle` |

These are created with `prisma.category.createMany()` in the same request that creates the user.

**Known gap:** Users who register via **Google OAuth** do NOT get these default categories. They start with zero categories and must create them manually. This should be fixed to match the email registration behavior.

---

## Icons

Icons are stored as Lucide icon name strings (e.g., `"utensils"`, `"car"`). The frontend renders them using the `IconPicker` component (`client/src/components/ui/IconPicker.jsx`). There is no server-side validation of whether the icon name is a valid Lucide icon — invalid names will simply render nothing on the frontend.

---

## Frontend

The `Categories` page (`/categories`) shows a list of categories with edit/delete actions. The `CategoryModal` handles both create and edit with the same form.

When deleting, the page shows a confirmation dialog. If the API returns 400 (category has transactions), the error message is shown via `showAlert`.

---

## How to Extend

### Add more default categories

Update the `DEFAULT_CATEGORIES` array in `server/src/routes/auth.routes.js`. Existing users won't get new defaults — only new registrations will.

### Seed defaults for OAuth users

Add a `createDefaultCategories(userId)` helper and call it in the Google OAuth callback handler, matching the logic already in the register route.

### Add category metadata

If you need to add fields to categories (e.g., color, sort order):
1. Add the field to `Category` in `server/prisma/schema.prisma`
2. Run `npm run db:migrate` and `npm run db:generate`
3. Update `createCategorySchema` and `updateCategorySchema` in the validators
4. Update the `CategoryModal` and `CategoryList` components
