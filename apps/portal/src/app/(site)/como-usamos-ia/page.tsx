import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages["como-usamos-ia"].title,
  alternates: { canonical: absoluteUrl("/como-usamos-ia") },
  description: institutionalPages["como-usamos-ia"].description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages["como-usamos-ia"]} />;
}
