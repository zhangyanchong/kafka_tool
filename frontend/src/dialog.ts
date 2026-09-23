import { ref } from "vue";

export const dialog = ref<{ title: string; message: string; confirmLabel: string; danger: boolean; alert: boolean } | null>(null);
let resolveDialog: ((value: boolean) => void) | null = null;

export function confirmDialog(title: string, message: string, confirmLabel = "确认", danger = false) {
  return new Promise<boolean>((resolve) => {
    resolveDialog = resolve;
    dialog.value = { title, message, confirmLabel, danger, alert: false };
  });
}

export function alertDialog(title: string, message: string) {
  return new Promise<void>((resolve) => {
    resolveDialog = () => resolve();
    dialog.value = { title, message, confirmLabel: "知道了", danger: false, alert: true };
  });
}

export function closeDialog(confirmed: boolean) {
  const resolve = resolveDialog;
  resolveDialog = null;
  dialog.value = null;
  resolve?.(confirmed);
}
