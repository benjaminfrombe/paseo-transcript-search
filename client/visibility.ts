import { documentVisible, onDocumentVisibility } from "./web";

/** Native clients have no document; mounted screens additionally observe AppState. */
export const appVisible = documentVisible;
export const onVisibility = onDocumentVisibility;
