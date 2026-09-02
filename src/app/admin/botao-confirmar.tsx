"use client";

/**
 * Botão de submeter dentro de um <form action={acaoDeRemover}>, que pede
 * confirmação antes de deixar o formulário seguir — usado nos botões
 * "Remover" das listagens de administração (UC03: "Confirmar remoção?").
 */
export function BotaoConfirmar({
  mensagem,
  className,
  children,
}: {
  mensagem: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(evento) => {
        if (!confirm(mensagem)) {
          evento.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
