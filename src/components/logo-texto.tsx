import Image from "next/image";

/**
 * A palavra "PortãoSeguro" tal como está desenhada no logótipo (tipografia
 * própria), em vez de escrita na fonte do site — recortada do logótipo
 * completo com o fundo tornado transparente, para se sobrepor à cor de
 * fundo de cada cabeçalho. Ficheiro em `public/logo-texto.png`.
 */
export function LogoTexto({ className = "h-5" }: { className?: string }) {
  return (
    <Image
      src="/logo-texto.png"
      alt="PortãoSeguro"
      width={934}
      height={275}
      className={`w-auto object-contain ${className}`}
    />
  );
}
