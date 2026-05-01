import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function VerificarCertificadoPage({
  params,
}: {
  params: Promise<{ qsoId: string }>;
}) {
  const { qsoId } = await params;

  const qso = await prisma.qSO.findUnique({
    where: { id: qsoId },
    include: {
      event: true,
      band: true,
      modeRef: true,
    },
  });

  if (!qso) {
    notFound();
  }

  const participant = await prisma.user.findFirst({
    where: {
      callsign: { equals: qso.participantCallsign, mode: "insensitive" },
    },
    select: { name: true },
  });

  const eventStartStr = qso.event.startDate.toLocaleDateString("pt-BR");
  const eventEndStr = qso.event.endDate.toLocaleDateString("pt-BR");
  const qsoDateStr = qso.dateTime.toLocaleDateString("pt-BR");
  const qsoTimeStr = qso.dateTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

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
            src={`/api/verificar-certificado/${qsoId}`}
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
              <dd className="font-medium text-gray-900">{qso.event.name}</dd>
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
                {qso.participantCallsign.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">
                {participant?.name ?? qso.participantCallsign}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Data/Hora do QSO</dt>
              <dd className="font-medium text-gray-900">
                {qsoDateStr} às {qsoTimeStr} UTC
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Banda / Modo</dt>
              <dd className="font-medium text-gray-900">
                {qso.band.label} · {qso.modeRef.label}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">RST Enviado / Recebido</dt>
              <dd className="font-medium text-gray-900">
                {qso.rstSent} / {qso.rstReceived}
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
