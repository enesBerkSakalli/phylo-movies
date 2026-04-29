const EMPTY_CONTEXT_MENU_POSITION = { x: 0, y: 0 };

export const selectContextMenuPosition = (state = {}) => state?.contextMenuPosition ?? EMPTY_CONTEXT_MENU_POSITION;
