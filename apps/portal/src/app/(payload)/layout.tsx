import configPromise from "@payload-config";
import { RootLayout } from "@payloadcms/next/layouts";
import "@payloadcms/next/css";
import React from "react";
import { importMap } from "./cms/importMap.js";
import { serverFunction } from "./serverFunction";

type Props = {
  children: React.ReactNode;
};

// Use Payload's official admin theme (light, well-tested). The previous custom
// dark login CSS fought Payload's own styles and left a black screen when the
// admin failed to hydrate — removed for reliability.
export default function PayloadLayout({ children }: Props) {
  return (
    <RootLayout config={configPromise} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}
