import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages["politica-de-correcoes"].title,
  alternates: { canonical: absoluteUrl("/politica-de-correcoes") },
  description: institutionalPages["politica-de-correcoes"].description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages["politica-de-correcoes"]} />;
}
