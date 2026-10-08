import { onRequestGet as __api_data_js_onRequestGet } from "C:\\Users\\Dell\\Downloads\\cashflow-tracker-master\\functions\\api\\data.js"
import { onRequestPost as __api_data_js_onRequestPost } from "C:\\Users\\Dell\\Downloads\\cashflow-tracker-master\\functions\\api\\data.js"

export const routes = [
    {
      routePath: "/api/data",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_data_js_onRequestGet],
    },
  {
      routePath: "/api/data",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_data_js_onRequestPost],
    },
  ]