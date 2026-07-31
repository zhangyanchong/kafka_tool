import { createRouter, createWebHashHistory } from "vue-router";
import ConnectView from "@/views/ConnectView.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/connect" },
    { path: "/connect", name: "connect", component: ConnectView },
    {
      path: "/dashboard",
      component: () => import("@/views/DashboardView.vue"),
      redirect: "/dashboard/topics",
      children: [
        {
          path: "topics",
          name: "topics",
          component: () => import("@/views/TopicListView.vue"),
        },
        {
          path: "topics/:topic",
          name: "topic-detail",
          component: () => import("@/views/TopicDetailView.vue"),
        },
        {
          path: "consumers",
          name: "consumers",
          component: () => import("@/views/ConsumerListView.vue"),
        },
        {
          path: "consumers/:groupId",
          name: "consumer-detail",
          component: () => import("@/views/ConsumerDetailView.vue"),
        },
        {
          path: "view",
          name: "metrics-view",
          component: () => import("@/views/MetricsView.vue"),
        },
      ],
    },
  ],
});
