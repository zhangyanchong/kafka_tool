import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { initializeTheme } from "./theme";
import "./styles.css";
initializeTheme();
createApp(App).use(createPinia()).use(router).mount("#app");
