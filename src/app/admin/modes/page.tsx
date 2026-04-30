import { listModes } from "@/app/actions/mode";
import { ModeTable } from "@/components/mode-table";

export default async function ModesPage() {
  const modes = await listModes();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Modos</h1>
      </div>
      <ModeTable modes={modes} />
    </div>
  );
}
