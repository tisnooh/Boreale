import { SourcingForm } from '@/components/admin/Sourcing';

export default async function SourcingDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <SourcingForm candidateKey={key} />;
}
