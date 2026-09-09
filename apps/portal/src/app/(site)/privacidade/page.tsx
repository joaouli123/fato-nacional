import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages.privacidade.title,
  alternates: { canonical: absoluteUrl("/privacidade") },
  description: institutionalPages.privacidade.description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages.privacidade} />;
}
