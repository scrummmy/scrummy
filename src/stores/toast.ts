import { defineStore } from "pinia";

export interface Toast {
  id: number;
  message: string;
}

const DEFAULT_DURATION_MS = 3000;
let nextId = 0;

export const useToastStore = defineStore("toast", {
  state: () => ({
    toasts: [] as Toast[],
  }),
  actions: {
    push(message: string, durationMs = DEFAULT_DURATION_MS): void {
      const id = nextId++;
      this.toasts.push({ id, message });
      setTimeout(() => this.dismiss(id), durationMs);
    },
    dismiss(id: number): void {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    },
  },
});
