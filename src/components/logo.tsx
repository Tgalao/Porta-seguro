import Image from "next/image";

/**
 * Marca do PortãoSeguro (só o escudo/cadeado, recortado do logótipo
 * completo) para os cabeçalhos — o mesmo recorte usado no favicon
 * (`src/app/icon.png`), guardado à parte em `public/logo-marca.png` porque
 * o logótipo completo (`public/logo.png`) inclui o nome por baixo, que não
 * cabe no espaço reservado nos cabeçalhos.
 */
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <Image
      src="/logo-marca.png"
      alt="PortãoSeguro"
      width={40}
      height={40}
      priority
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
