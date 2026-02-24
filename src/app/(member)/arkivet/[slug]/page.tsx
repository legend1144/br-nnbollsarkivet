import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ArkivLegacySlugPage({ params }: Props) {
  await params;
  permanentRedirect("/arkivet");
}
