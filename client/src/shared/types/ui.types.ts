import type React from 'react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'multiselect';
  options?: Array<{ value: string; label: string }>;
}

export interface ResourceListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  keyExtractor: (item: T) => string;
}

export interface ResourceModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}
