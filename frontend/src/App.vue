<script setup lang="ts">
import { closeDialog, dialog } from "./dialog";
</script>

<template>
  <RouterView />
  <div v-if="dialog" class="app-dialog-backdrop" role="presentation" @click.self="dialog.alert ? closeDialog(true) : closeDialog(false)">
    <section class="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-dialog-title">
      <span class="app-dialog-kicker">{{ dialog.danger ? '高风险操作' : '操作提示' }}</span>
      <h2 id="app-dialog-title">{{ dialog.title }}</h2>
      <p class="app-dialog-message">{{ dialog.message }}</p>
      <div class="app-dialog-actions">
        <button v-if="!dialog.alert" type="button" class="app-dialog-cancel" @click="closeDialog(false)">取消</button>
        <button type="button" :class="dialog.danger ? 'app-dialog-danger' : 'app-dialog-primary'" @click="closeDialog(true)">{{ dialog.confirmLabel }}</button>
      </div>
    </section>
  </div>
</template>
