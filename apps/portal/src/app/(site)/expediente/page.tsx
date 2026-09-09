import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages["expediente"].title,
  description: institutionalPages["expediente"].description,
  alternates: { canonical: absoluteUrl("/expediente") },
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages["expediente"]} />;
}
