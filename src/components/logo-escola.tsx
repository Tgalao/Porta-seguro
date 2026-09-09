import Image from "next/image";

/**
 * Marca da escola (só a grelha de pontos, quadrada) para os cabeçalhos —
 * o mesmo recorte usado no favicon (`src/app/icon.png`), guardado à parte
 * em `public/logo-escola-marca.png` porque o logótipo completo
 * (`public/logo-escola.png`) é um lockup largo, não quadrado, e não cabe
 * no espaço que os cabeçalhos já reservavam para o placeholder "Logo".
 */
export function LogoEscola({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <Image
      src="/logo-escola-marca.png"
      alt="Escola Comércio Lisboa"
      width={40}
      height={40}
      priority
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
