import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages.contato.title,
  alternates: { canonical: absoluteUrl("/contato") },
  description: institutionalPages.contato.description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages.contato} />;
}
