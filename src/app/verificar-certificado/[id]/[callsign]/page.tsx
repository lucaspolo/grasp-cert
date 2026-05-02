import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function VerificarCertificadoPage({
  params,
}: {
  params: Promise<{ id: string; callsign: string }>;
}) {
  const { id: eventId, callsign } = await params;
  const participantCallsign = decodeURIComponent(callsign);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    notFound();
  }

  const qsos = await prisma.qSO.findMany({
    where: {
      eventId,
      participantCallsign: { equals: participantCallsign, mode: "insensitive" },
    },
    include: {
      band: true,
      modeRef: true,
    },
    orderBy: { dateTime: "asc" },
  });

  if (qsos.length === 0) {
    notFound();
  }

  const participant = await prisma.user.findFirst({
    where: {
      callsign: { equals: participantCallsign, mode: "insensitive" },
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
            src={`/api/verificar-certificado/${eventId}/${encodeURIComponent(participantCallsign)}`}
            alt="Certificado de Participação"
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
              <dt className="text-gray-500">Indicativo</dt>
              <dd className="font-medium text-gray-900">
                {participantCallsign.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">
                {participant?.name ?? participantCallsign}
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

          {/* QSO detail table */}
          <h3 className="text-md font-semibold text-gray-800 mt-6 mb-2">
            Detalhes dos QSOs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Operador</th>
                  <th className="py-2 pr-4">Data/Hora</th>
                  <th className="py-2 pr-4">Banda</th>
                  <th className="py-2 pr-4">Modo</th>
                  <th className="py-2 pr-4">RST Enviado</th>
                  <th className="py-2">RST Recebido</th>
                </tr>
              </thead>
              <tbody>
                {qsos.map((qso) => (
                  <tr key={qso.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {qso.operatorCallsign?.toUpperCase() ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-gray-900">
                      {qso.dateTime.toLocaleDateString("pt-BR")}{" "}
                      {qso.dateTime.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </td>
                    <td className="py-2 pr-4 text-gray-900">{qso.band.label}</td>
                    <td className="py-2 pr-4 text-gray-900">{qso.modeRef.label}</td>
                    <td className="py-2 pr-4 text-gray-900">{qso.rstSent}</td>
                    <td className="py-2 text-gray-900">{qso.rstReceived}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Gerado por GRASP-CERT
      </p>
    </div>
  );
}
