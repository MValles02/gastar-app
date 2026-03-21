import { useState } from 'react';
import {
  Banknote, Laptop, TrendingUp, PlusCircle, Utensils, Car, Home,
  Gamepad2, HeartPulse, GraduationCap, Shirt, Zap, MinusCircle,
} from 'lucide-react';
import Input from '../../ui/Input.jsx';
import Button from '../../ui/Button.jsx';
import IconPicker from '../../ui/IconPicker.jsx';
import { useOnboarding } from '../../../context/OnboardingContext.jsx';
import { createCategory, getCategories } from '../../../services/categories.js';

const DEFAULT_CATEGORIES = [
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

const ICON_COMPONENTS = {
  banknote: Banknote, laptop: Laptop, 'trending-up': TrendingUp, 'plus-circle': PlusCircle,
  utensils: Utensils, car: Car, home: Home, 'gamepad-2': Gamepad2,
  'heart-pulse': HeartPulse, 'graduation-cap': GraduationCap, shirt: Shirt,
  zap: Zap, 'minus-circle': MinusCircle,
};

export default function CategoriesStep() {
  const { goToNextStep, goToPrevStep } = useOnboarding();

  const [choice, setChoice] = useState('defaults'); // 'defaults' | 'custom'
  const [pendingCategories, setPendingCategories] = useState([]);
  const [extraCategories, setExtraCategories] = useState([]); // custom additions on top of defaults
  const [miniName, setMiniName] = useState('');
  const [miniIcon, setMiniIcon] = useState('');
  const [miniError, setMiniError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addPending = (e) => {
    e.preventDefault();
    if (!miniName.trim()) {
      setMiniError('Ingresá un nombre para la categoría');
      return;
    }
    setMiniError('');
    const cat = { name: miniName.trim(), icon: miniIcon };
    if (choice === 'defaults') {
      setExtraCategories(prev => [...prev, cat]);
    } else {
      setPendingCategories(prev => [...prev, cat]);
    }
    setMiniName('');
    setMiniIcon('');
  };

  const removeCategory = (index, fromExtra) => {
    if (fromExtra) {
      setExtraCategories(prev => prev.filter((_, i) => i !== index));
    } else {
      setPendingCategories(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleNext = async () => {
    setError('');
    setLoading(true);
    try {
      const existing = await getCategories();
      const existingNames = new Set(existing.map(c => c.name));

      if (choice === 'defaults') {
        const newDefaults = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name));
        const newExtras = extraCategories.filter(c => !existingNames.has(c.name));
        await Promise.all([...newDefaults, ...newExtras].map(c => createCategory(c)));
      } else {
        const newCustom = pendingCategories.filter(c => !existingNames.has(c.name));
        await Promise.all(newCustom.map(c => createCategory(c)));
      }
      goToNextStep();
    } catch {
      setError('Hubo un error al guardar las categorías. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const canContinue = choice === 'defaults' || pendingCategories.length > 0;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tus categorías</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Las categorías te ayudan a organizar tus gastos e ingresos.
      </p>

      {/* Choice cards */}
      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={() => setChoice('defaults')}
          className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
            choice === 'defaults'
              ? 'border-accent-600 bg-accent-50 dark:bg-gray-800'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              choice === 'defaults' ? 'border-accent-600' : 'border-gray-400'
            }`}>
              {choice === 'defaults' && <div className="h-2 w-2 rounded-full bg-accent-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Usar las predeterminadas
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                13 categorías listas para usar en español
              </p>
            </div>
          </div>

          {choice === 'defaults' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map(cat => {
                const Icon = ICON_COMPONENTS[cat.icon];
                return (
                  <span
                    key={cat.name}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {cat.name}
                  </span>
                );
              })}
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setChoice('custom')}
          className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
            choice === 'custom'
              ? 'border-accent-600 bg-accent-50 dark:bg-gray-800'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              choice === 'custom' ? 'border-accent-600' : 'border-gray-400'
            }`}>
              {choice === 'custom' && <div className="h-2 w-2 rounded-full bg-accent-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Empezar desde cero
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Creá tus propias categorías personalizadas
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Mini form to add categories */}
      <div className="mt-5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {choice === 'defaults' ? 'Agregar categoría adicional (opcional)' : 'Agregar categorías'}
        </p>

        {/* Pending list */}
        {(choice === 'custom' ? pendingCategories : extraCategories).map((cat, i) => {
          const Icon = ICON_COMPONENTS[cat.icon];
          const fromExtra = choice === 'defaults';
          return (
            <div
              key={`${cat.name}-${i}`}
              className="mb-2 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                {Icon && <Icon className="h-4 w-4 text-gray-500" />}
                {cat.name}
              </span>
              <button
                type="button"
                onClick={() => removeCategory(i, fromExtra)}
                className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400"
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

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <Button variant="secondary" onClick={goToPrevStep} disabled={loading}>
          Atrás
        </Button>
        <Button onClick={handleNext} disabled={!canContinue} loading={loading}>
          Siguiente
        </Button>
      </div>
      {choice === 'custom' && pendingCategories.length === 0 && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Agregá al menos una categoría para continuar
        </p>
      )}
    </div>
  );
}
