import { createHmac } from "crypto";
import type { CertificateKind } from "@/lib/certificate-kind";

/**
 * Salt fixo do número de série. Não é segredo: o número identifica o
 * certificado, quem confere a autenticidade é a página de verificação, que
 * consulta os QSOs no banco. Alterar este valor renumera todos os
 * certificados já emitidos — não mude sem necessidade.
 */
const SERIAL_SALT = "grasp-cert/serial/v1";

/** Base32 de Crockford: sem I, L, O e U, que se confundem com 1, 0 e V ao ler. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Número de série determinístico do certificado: o mesmo par evento +
 * indicativo (e o mesmo tipo) sempre produz o mesmo número, sem tabela nova.
 * O indicativo é normalizado, então py2abc e PY2ABC dão o mesmo resultado.
 */
export function certificateSerial(
  kind: CertificateKind,
  eventId: string,
  callsign: string
): string {
  const payload = `${kind}:${eventId}:${callsign.trim().toUpperCase()}`;
  const digest = createHmac("sha256", SERIAL_SALT).update(payload).digest();

  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[digest[i] % ALPHABET.length];
  }

  return `GC-${out.slice(0, 4)}-${out.slice(4)}`;
}
