/** `id` of the one form on a sheet screen: the header's Guardar submits it through its `form` attribute. */
export const SHEET_FORM = 'sheet-form';

/**
 * State of the open sheet, shared by `Sheet` (draws it), `SheetHeader` (drags it, shows Guardar busy)
 * and the form (reports `submitting`). Only written in the browser: effects and handlers never run in SSR.
 */
export const sheet = $state({ offset: 0, dragging: false, submitting: false });
