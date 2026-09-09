import { InstitutionalPage } from "@/components/site/institutional-page";
import { institutionalPages } from "@/lib/institutional";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: institutionalPages["quem-somos"].title,
  alternates: { canonical: absoluteUrl("/quem-somos") },
  description: institutionalPages["quem-somos"].description,
};

export default function Page() {
  return <InstitutionalPage {...institutionalPages["quem-somos"]} />;
}
