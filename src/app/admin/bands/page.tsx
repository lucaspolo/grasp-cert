import { listBands } from "@/app/actions/band";
import { BandTable } from "@/components/band-table";

export default async function BandsPage() {
  const bands = await listBands();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bandas</h1>
      </div>
      <BandTable bands={bands} />
    </div>
  );
}
