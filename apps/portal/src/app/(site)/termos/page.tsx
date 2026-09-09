import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages.termos.title,
  alternates: { canonical: absoluteUrl("/termos") },
  description: institutionalPages.termos.description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages.termos} />;
}
