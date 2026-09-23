import { ref } from "vue";
export const dialog = ref(null);
let resolveDialog = null;
export function confirmDialog(title, message, confirmLabel = "确认", danger = false) {
    return new Promise((resolve) => {
        resolveDialog = resolve;
        dialog.value = { title, message, confirmLabel, danger, alert: false };
    });
}
export function alertDialog(title, message) {
    return new Promise((resolve) => {
        resolveDialog = () => resolve();
        dialog.value = { title, message, confirmLabel: "知道了", danger: false, alert: true };
    });
}
export function closeDialog(confirmed) {
    const resolve = resolveDialog;
    resolveDialog = null;
    dialog.value = null;
    resolve?.(confirmed);
}
