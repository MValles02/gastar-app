import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { SelectOption } from './Select.js';

interface Props {
  label?: string;
  options?: SelectOption[];
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function MultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Todos',
}: Props): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = (optValue: string | number) => {
    const strVal = String(optValue);
    if (value.includes(strVal)) {
      onChange(value.filter((v) => v !== strVal));
    } else {
      onChange([...value, strVal]);
    }
  };

  const openPanel = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const triggerLabel = (() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      return options.find((o) => String(o.value) === value[0])?.label ?? placeholder;
    }
    return `${value.length} seleccionados`;
  })();

  return (
    <div className="space-y-1">
      {label && <p className="field-label">{label}</p>}

      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        className={clsx(
          'field-base flex w-full cursor-pointer items-center justify-between gap-2 text-left',
          value.length > 0 ? 'text-app' : 'text-app-muted',
          isOpen ? 'border-accent-600 ring-2 ring-accent-400/30' : 'border-border-default'
        )}
      >
        <span className="truncate text-sm">{triggerLabel}</span>
        <ChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-app-muted transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="max-h-48 overflow-y-auto rounded-soft border border-border-default bg-surface shadow-panel"
          >
            {options.map((opt) => {
              const checked = value.includes(String(opt.value));
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 cursor-pointer rounded accent-accent-600"
                  />
                  <span className="text-sm text-app">{opt.label}</span>
                </label>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
