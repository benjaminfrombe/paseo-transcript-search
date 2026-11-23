/** Web-only document access; other clients have no document. */
type Document = { visibilityState?: string; addEventListener(name: string, listener: () => void): void; removeEventListener(name: string, listener: () => void): void };
const document = () => (globalThis as typeof globalThis & { document?: Document }).document;
export const documentVisible = () => document()?.visibilityState !== "hidden";
export function onDocumentVisibility(listener: () => void): () => void {
  const doc = document(); doc?.addEventListener("visibilitychange", listener);
  return () => doc?.removeEventListener("visibilitychange", listener);
}
