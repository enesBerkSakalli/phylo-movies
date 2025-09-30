import { notifications } from "./eventHandlers/notificationSystem.js";

// Legacy file retained as a compatibility shim. All imperative event handling was migrated
// to React components, so we simply re-export the notification system for existing imports.

export { notifications };
