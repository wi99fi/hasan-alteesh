import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
  head: () => ({ meta: [
    { title: "عيادة التيش — نظام إدارة العيادة" },
    { name: "description", content: "نظام عربي متكامل لإدارة المرضى والمواعيد والعلاجات والفواتير." },
    { property: "og:title", content: "عيادة التيش — نظام إدارة العيادة" },
    { property: "og:description", content: "نظام عربي متكامل لإدارة المرضى والمواعيد والعلاجات والفواتير." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});
