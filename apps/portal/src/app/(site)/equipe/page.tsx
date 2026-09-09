import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages.equipe.title,
  alternates: { canonical: absoluteUrl("/equipe") },
  description: institutionalPages.equipe.description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages.equipe} />;
}
