import Select from '../ui/Select.js';
import Input from '../ui/Input.js';
import MultiSelect from '../ui/MultiSelect.js';
import Button from '../ui/Button.js';
import type { SelectOption } from '../ui/Select.js';

type FilterType = 'select' | 'date' | 'multiselect';

export interface FilterConfig {
  key: string;
  label: string;
  type: FilterType;
  options?: SelectOption[];
}

interface Props {
  filters: FilterConfig[];
  values: Record<string, string | string[] | number | undefined>;
  onChange: (key: string, value: string | string[]) => void;
  onReset?: () => void;
}

export default function FilterBar({ filters, values, onChange, onReset }: Props): JSX.Element {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      {filters.map((filter) => {
        if (filter.type === 'select') {
          return (
            <Select
              key={filter.key}
              label={filter.label}
              value={String(values[filter.key] ?? '')}
              onChange={(e) => onChange(filter.key, e.target.value)}
              options={filter.options}
            />
          );
        }
        if (filter.type === 'date') {
          return (
            <Input
              key={filter.key}
              type="date"
              label={filter.label}
              value={String(values[filter.key] ?? '')}
              onChange={(e) => onChange(filter.key, e.target.value)}
            />
          );
        }
        if (filter.type === 'multiselect') {
          const val = values[filter.key];
          return (
            <MultiSelect
              key={filter.key}
              label={filter.label}
              value={Array.isArray(val) ? val : []}
              onChange={(v) => onChange(filter.key, v)}
              options={filter.options}
            />
          );
        }
        return null;
      })}
      {onReset && (
        <Button type="button" variant="ghost" onClick={onReset}>
          Limpiar
        </Button>
      )}
    </div>
  );
}
