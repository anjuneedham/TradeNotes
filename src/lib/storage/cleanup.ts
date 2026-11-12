import { getStore } from "./index";
import { report } from "../monitor";

/**
 * Best-effort removal of storage objects after their database rows are gone. NOT a server action (it must never be
 * callable from the browser): callers pass only paths they just read under row-level security.
 * Failures are reported (orphans cost storage) but never block the user's action.
 */
export async function removeObjects(paths: string[]) {
  if (!paths.length) return;
  const store = getStore();
  if (!store) return;
  try { await store.delete(paths); } catch (e) { report(e, "screenshots", { orphaned: paths.length }); console.error("screenshot cleanup failed", e instanceof Error ? e.message : e); }
}
