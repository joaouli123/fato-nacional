import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages["politica-editorial"].title,
  alternates: { canonical: absoluteUrl("/politica-editorial") },
  description: institutionalPages["politica-editorial"].description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages["politica-editorial"]} />;
}
