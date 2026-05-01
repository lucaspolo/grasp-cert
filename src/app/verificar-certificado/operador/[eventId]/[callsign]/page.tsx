import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function VerificarCertificadoOperadorPage({
  params,
}: {
  params: Promise<{ eventId: string; callsign: string }>;
}) {
  const { eventId, callsign } = await params;
  const operatorCallsign = decodeURIComponent(callsign);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    notFound();
  }

  const qsos = await prisma.qSO.findMany({
    where: {
      eventId,
      operatorCallsign: { equals: operatorCallsign, mode: "insensitive" },
    },
    include: {
      band: true,
      modeRef: true,
    },
  });

  if (qsos.length === 0) {
    notFound();
  }

  const operator = await prisma.user.findFirst({
    where: {
      callsign: { equals: operatorCallsign, mode: "insensitive" },
    },
    select: { name: true },
  });

  // Collect unique modes and bands
  const modesSet = new Set<string>();
  const bandsSet = new Set<string>();
  for (const qso of qsos) {
    modesSet.add(qso.modeRef.label);
    bandsSet.add(qso.band.label);
  }
  const modes = Array.from(modesSet).sort();
  const bands = Array.from(bandsSet).sort();

  const eventStartStr = event.startDate.toLocaleDateString("pt-BR");
  const eventEndStr = event.endDate.toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 flex items-center gap-3">
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-lg font-semibold">
            Certificado Autêntico
          </h1>
        </div>

        {/* Certificate image */}
        <div className="p-4">
          <img
            src={`/api/verificar-certificado/operador/${eventId}/${encodeURIComponent(operatorCallsign)}`}
            alt="Certificado de Operador"
            className="w-full rounded border"
          />
        </div>

        {/* Details */}
        <div className="px-6 pb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Detalhes da Verificação
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Evento</dt>
              <dd className="font-medium text-gray-900">{event.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Período do Evento</dt>
              <dd className="font-medium text-gray-900">
                {eventStartStr} — {eventEndStr}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Indicativo do Operador</dt>
              <dd className="font-medium text-gray-900">
                {operatorCallsign.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">
                {operator?.name ?? operatorCallsign}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">QSOs Realizados</dt>
              <dd className="font-medium text-gray-900">{qsos.length}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Modos</dt>
              <dd className="font-medium text-gray-900">
                {modes.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Faixas</dt>
              <dd className="font-medium text-gray-900">
                {bands.join(", ")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Gerado por GRASP-CERT
      </p>
    </div>
  );
}
