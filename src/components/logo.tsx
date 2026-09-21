import Image from "next/image";

/**
 * Marca do PortãoSeguro (só o escudo/cadeado, recortado do logótipo
 * completo) para os cabeçalhos — o mesmo recorte usado no favicon
 * (`src/app/icon.png`), guardado à parte em `public/logo-marca.png` porque
 * o logótipo completo (`public/logo.png`) inclui o nome por baixo, que não
 * cabe no espaço reservado nos cabeçalhos.
 */
export function Logo({
  className = "h-9 w-9",
  decorativa = false,
}: {
  className?: string;
  /** `true` quando este ícone aparece logo ao lado do `<LogoTexto>` (que já
   * tem o "PortãoSeguro" como texto alternativo) — um leitor de ecrã não
   * precisa de ouvir o mesmo nome duas vezes seguidas. Sem isto, todo
   * cabeçalho com os dois lado a lado anunciava "PortãoSeguro, PortãoSeguro". */
  decorativa?: boolean;
}) {
  return (
    <Image
      src="/logo-marca.png"
      alt={decorativa ? "" : "PortãoSeguro"}
      width={40}
      height={40}
      priority
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
