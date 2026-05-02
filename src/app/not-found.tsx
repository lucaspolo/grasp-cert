import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
      <Image
        src="/404.png"
        alt="Radioamador chamando CQ sem resposta"
        width={600}
        height={600}
        className="max-w-full h-auto"
        priority
      />
      <h1 className="text-2xl font-bold text-center">
        Página não encontrada
      </h1>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Voltar para o início
      </Link>
    </div>
  );
}
