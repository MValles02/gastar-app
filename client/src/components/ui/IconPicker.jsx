import {
  Banknote, Laptop, TrendingUp, PlusCircle, Utensils, Car, Home,
  Gamepad2, HeartPulse, GraduationCap, Shirt, Zap, MinusCircle,
  ShoppingCart, ShoppingBag, Coffee, Pizza, Bus, Bike, Plane,
  Train, Fuel, Wrench, Hammer, Wifi, Phone, Tv, Music, Film,
  Book, Dumbbell, Stethoscope, Pill, Baby, PawPrint, Gift,
  PartyPopper, Wallet, CreditCard, PiggyBank, BarChart2, Building2,
  Store, Scissors, Paintbrush, Camera, Globe, Landmark, Leaf,
  Sun, Umbrella, Star, Package,
} from 'lucide-react';
import PropTypes from 'prop-types';

const ICONS = [
  { name: 'banknote', Icon: Banknote },
  { name: 'wallet', Icon: Wallet },
  { name: 'credit-card', Icon: CreditCard },
  { name: 'piggy-bank', Icon: PiggyBank },
  { name: 'trending-up', Icon: TrendingUp },
  { name: 'bar-chart-2', Icon: BarChart2 },
  { name: 'landmark', Icon: Landmark },
  { name: 'building-2', Icon: Building2 },
  { name: 'laptop', Icon: Laptop },
  { name: 'phone', Icon: Phone },
  { name: 'wifi', Icon: Wifi },
  { name: 'tv', Icon: Tv },
  { name: 'utensils', Icon: Utensils },
  { name: 'pizza', Icon: Pizza },
  { name: 'coffee', Icon: Coffee },
  { name: 'shopping-cart', Icon: ShoppingCart },
  { name: 'shopping-bag', Icon: ShoppingBag },
  { name: 'store', Icon: Store },
  { name: 'car', Icon: Car },
  { name: 'bus', Icon: Bus },
  { name: 'bike', Icon: Bike },
  { name: 'train', Icon: Train },
  { name: 'plane', Icon: Plane },
  { name: 'fuel', Icon: Fuel },
  { name: 'home', Icon: Home },
  { name: 'wrench', Icon: Wrench },
  { name: 'hammer', Icon: Hammer },
  { name: 'zap', Icon: Zap },
  { name: 'heart-pulse', Icon: HeartPulse },
  { name: 'stethoscope', Icon: Stethoscope },
  { name: 'pill', Icon: Pill },
  { name: 'dumbbell', Icon: Dumbbell },
  { name: 'graduation-cap', Icon: GraduationCap },
  { name: 'book', Icon: Book },
  { name: 'music', Icon: Music },
  { name: 'film', Icon: Film },
  { name: 'gamepad-2', Icon: Gamepad2 },
  { name: 'camera', Icon: Camera },
  { name: 'shirt', Icon: Shirt },
  { name: 'scissors', Icon: Scissors },
  { name: 'paintbrush', Icon: Paintbrush },
  { name: 'baby', Icon: Baby },
  { name: 'paw-print', Icon: PawPrint },
  { name: 'gift', Icon: Gift },
  { name: 'party-popper', Icon: PartyPopper },
  { name: 'leaf', Icon: Leaf },
  { name: 'sun', Icon: Sun },
  { name: 'umbrella', Icon: Umbrella },
  { name: 'globe', Icon: Globe },
  { name: 'package', Icon: Package },
  { name: 'star', Icon: Star },
  { name: 'plus-circle', Icon: PlusCircle },
  { name: 'minus-circle', Icon: MinusCircle },
];

const ICON_MAP = new Map(ICONS.map(({ name, Icon }) => [name, Icon]));

export function getCategoryIcon(name) {
  return ICON_MAP.get(name) ?? null;
}

export default function IconPicker({ value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-app-muted">
        Icono <span className="font-normal text-app-soft">(opcional)</span>
      </p>
      <div className="panel-muted grid grid-cols-8 gap-1.5 p-2">
        {ICONS.map(({ name, Icon }) => {
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(isSelected ? '' : name)}
              aria-label={name}
              aria-pressed={isSelected}
              className={`rounded-soft flex items-center justify-center p-2 transition-colors ${
                isSelected
                  ? 'bg-accent-600 text-white'
                  : 'text-app-muted hover:bg-surface hover:text-app'
              }`}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
      {value && (
        <p className="mt-1.5 text-xs text-app-soft">
          Seleccionado: <span className="font-medium text-app-muted">{value}</span>
        </p>
      )}
    </div>
  );
}

IconPicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
