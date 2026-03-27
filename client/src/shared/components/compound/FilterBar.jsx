import PropTypes from 'prop-types';
import Select from '../ui/Select.jsx';
import Input from '../ui/Input.jsx';
import MultiSelect from '../ui/MultiSelect.jsx';
import Button from '../ui/Button.jsx';

export default function FilterBar({ filters, values, onChange, onReset }) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      {filters.map((filter) => {
        if (filter.type === 'select') {
          return (
            <Select
              key={filter.key}
              label={filter.label}
              value={values[filter.key] ?? ''}
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
              value={values[filter.key] ?? ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
            />
          );
        }
        if (filter.type === 'multiselect') {
          return (
            <MultiSelect
              key={filter.key}
              label={filter.label}
              value={values[filter.key] ?? []}
              onChange={(v) => onChange(filter.key, v)}
              options={filter.options}
            />
          );
        }
        return null;
      })}
      <Button type="button" variant="ghost" onClick={onReset}>
        Limpiar
      </Button>
    </div>
  );
}

FilterBar.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['select', 'date', 'multiselect']).isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
      ),
    })
  ).isRequired,
  values: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
