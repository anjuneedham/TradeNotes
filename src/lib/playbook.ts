/** Playbook limits (the database enforces 80 items per strategy and 200 characters as a backstop). */
export const MAX_ACTIVE_ITEMS = 20;
export const MAX_STRATEGIES = 200;
/** Active + retired rules per strategy (matches the database trigger). */
export const MAX_ITEMS_TOTAL = 80;
