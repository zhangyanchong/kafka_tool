import { createRouter, createWebHashHistory } from "vue-router";
import ConnectView from "@/views/ConnectView.vue";
import ClusterHomeView from "@/views/ClusterHomeView.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "clusters", component: ClusterHomeView },
    { path: "/connect", name: "connect", component: ConnectView },
    {
      path: "/tools",
      name: "tools",
      component: () => import("@/views/ToolsView.vue"),
    },
    {
      path: "/dashboard",
      component: () => import("@/views/DashboardView.vue"),
      redirect: "/dashboard/topics",
      children: [
        {
          path: "topics",
          name: "topics",
          component: () => import("@/views/TopicListView.vue"),
          meta: { keepAlive: true },
        },
        {
          path: "topics/:topic",
          name: "topic-detail",
          component: () => import("@/views/TopicDetailView.vue"),
          meta: { keepAlive: true },
        },
        {
          path: "consumers",
          name: "consumers",
          component: () => import("@/views/ConsumerListView.vue"),
          meta: { keepAlive: true },
        },
        {
          path: "consumers/:groupId",
          name: "consumer-detail",
          component: () => import("@/views/ConsumerDetailView.vue"),
          meta: { keepAlive: true },
        },
        {
          path: "view",
          name: "metrics-view",
          component: () => import("@/views/MetricsView.vue"),
          meta: { keepAlive: true },
        },
        {
          path: "tools",
          name: "dashboard-tools",
          component: () => import("@/views/ToolsView.vue"),
          props: { embedded: true },
          meta: { keepAlive: true },
        },
      ],
    },
  ],
});
