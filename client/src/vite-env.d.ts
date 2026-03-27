/// <reference types="vite/client" />

import type React from 'react';

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementType = React.JSX.ElementType;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}
