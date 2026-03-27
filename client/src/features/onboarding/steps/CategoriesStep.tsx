import { useState } from 'react';
import Input from '../../../shared/components/ui/Input.js';
import Button from '../../../shared/components/ui/Button.js';
import IconPicker, { getCategoryIcon } from '../../../shared/components/ui/IconPicker.js';
import MessageBanner from '../../../shared/components/ui/MessageBanner.js';
import OptionTile from '../../../shared/components/ui/OptionTile.js';
import { useOnboarding } from '../OnboardingContext.js';
import { createCategory, getCategories } from '../../categories/services/categories.js';
import { getErrorMessage } from '../../../shared/utils/errors.js';

interface CategoryDraft {
  name: string;
  icon: string;
}

const DEFAULT_CATEGORIES: CategoryDraft[] = [
  { name: 'Salario', icon: 'banknote' },
  { name: 'Freelance', icon: 'laptop' },
  { name: 'Inversiones', icon: 'trending-up' },
  { name: 'Otros ingresos', icon: 'plus-circle' },
  { name: 'Comida', icon: 'utensils' },
  { name: 'Transporte', icon: 'car' },
  { name: 'Alquiler', icon: 'home' },
  { name: 'Entretenimiento', icon: 'gamepad-2' },
  { name: 'Salud', icon: 'heart-pulse' },
  { name: 'Educación', icon: 'graduation-cap' },
  { name: 'Ropa', icon: 'shirt' },
  { name: 'Servicios', icon: 'zap' },
  { name: 'Otros gastos', icon: 'minus-circle' },
];

export default function CategoriesStep(): JSX.Element {
  const { goToNextStep, goToPrevStep } = useOnboarding();
  const [choice, setChoice] = useState<'defaults' | 'custom'>('defaults');
  const [pendingCategories, setPendingCategories] = useState<CategoryDraft[]>([]);
  const [extraCategories, setExtraCategories] = useState<CategoryDraft[]>([]);
  const [miniName, setMiniName] = useState('');
  const [miniIcon, setMiniIcon] = useState('');
  const [miniError, setMiniError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addPending = (e: React.FormEvent) => {
    e.preventDefault();

    if (!miniName.trim()) {
      setMiniError('Ingresá un nombre para la categoría');
      return;
    }

    setMiniError('');
    const category: CategoryDraft = { name: miniName.trim(), icon: miniIcon };

    if (choice === 'defaults') {
      setExtraCategories((current) => [...current, category]);
    } else {
      setPendingCategories((current) => [...current, category]);
    }

    setMiniName('');
    setMiniIcon('');
  };

  const removeCategory = (index: number, fromExtra: boolean) => {
    if (fromExtra) {
      setExtraCategories((current) => current.filter((_, i) => i !== index));
    } else {
      setPendingCategories((current) => current.filter((_, i) => i !== index));
    }
  };

  const handleNext = async () => {
    setError('');
    setLoading(true);

    try {
      const existing = await getCategories();
      const existingNames = new Set(existing.map((category) => category.name));

      if (choice === 'defaults') {
        const newDefaults = DEFAULT_CATEGORIES.filter(
          (category) => !existingNames.has(category.name)
        );
        const newExtras = extraCategories.filter((category) => !existingNames.has(category.name));
        await Promise.all(
          [...newDefaults, ...newExtras].map((category) => createCategory(category))
        );
      } else {
        const newCustom = pendingCategories.filter((category) => !existingNames.has(category.name));
        await Promise.all(newCustom.map((category) => createCategory(category)));
      }

      goToNextStep();
    } catch (err) {
      setError(getErrorMessage(err, 'Hubo un error al guardar las categorías.'));
    } finally {
      setLoading(false);
    }
  };

  const canContinue = choice === 'defaults' || pendingCategories.length > 0;
  const listed = choice === 'custom' ? pendingCategories : extraCategories;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-semibold text-app">Tus categorías</h2>
      <p className="mt-1 text-sm text-app-muted">
        Las categorías sostienen todo el análisis del resto de la aplicación.
      </p>

      <div className="mt-5 space-y-3" role="radiogroup" aria-label="Tipo de categorías">
        <OptionTile
          selected={choice === 'defaults'}
          onClick={() => setChoice('defaults')}
          title="Usar las predeterminadas"
          description="13 categorías listas para usar en español."
        >
          {choice === 'defaults' && (
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                return (
                  <span
                    key={category.name}
                    className="inline-flex items-center gap-1 rounded-full border border-border-default bg-surface px-2.5 py-1 text-xs font-medium text-app-muted"
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {category.name}
                  </span>
                );
              })}
            </div>
          )}
        </OptionTile>

        <OptionTile
          selected={choice === 'custom'}
          onClick={() => setChoice('custom')}
          title="Empezar desde cero"
          description="Creá tu propia estructura personalizada."
        />
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-medium text-app-muted">
          {choice === 'defaults' ? 'Agregar categoría adicional (opcional)' : 'Agregar categorías'}
        </p>

        {listed.map((category, index) => {
          const Icon = getCategoryIcon(category.icon);
          const fromExtra = choice === 'defaults';

          return (
            <div
              key={`${category.name}-${index}`}
              className="panel-muted mb-2 flex items-center justify-between px-3 py-2"
            >
              <span className="inline-flex items-center gap-1.5 text-sm text-app">
                {Icon && <Icon className="h-4 w-4 text-app-soft" />}
                {category.name}
              </span>
              <button
                type="button"
                onClick={() => removeCategory(index, fromExtra)}
                className="text-xs text-app-soft transition-colors hover:text-danger"
              >
                Quitar
              </button>
            </div>
          );
        })}

        <form onSubmit={addPending} className="space-y-3">
          <Input
            label="Nombre"
            value={miniName}
            onChange={(e) => setMiniName(e.target.value)}
            placeholder="Ej: Mascotas, Viajes..."
            error={miniError}
          />
          <IconPicker value={miniIcon} onChange={setMiniIcon} />
          <Button type="submit" variant="secondary" size="sm">
            + Agregar
          </Button>
        </form>
      </div>

      <MessageBanner message={error} className="mt-4" />

      <div className="mt-8 flex justify-between gap-3">
        <Button variant="secondary" onClick={goToPrevStep} disabled={loading}>
          Atrás
        </Button>
        <Button onClick={() => void handleNext()} disabled={!canContinue} loading={loading}>
          Siguiente
        </Button>
      </div>
      {choice === 'custom' && pendingCategories.length === 0 && (
        <p className="mt-2 text-center text-xs text-app-soft">
          Agregá al menos una categoría para continuar
        </p>
      )}
    </div>
  );
}
