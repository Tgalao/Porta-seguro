"use client";

/**
 * Botão de submeter dentro de um <form action={acaoDeRemover}>, que pede
 * confirmação antes de deixar o formulário seguir — usado nos botões
 * "Remover" das listagens de administração (UC03: "Confirmar remoção?").
 *
 * Além da confirmação, pede a palavra-chave de administração (ver
 * `passkey.ts`) através de um `prompt()` nativo e injeta-a num campo
 * escondido do próprio <form> antes de o deixar submeter — a Server Action
 * é que confirma se está certa; este botão só a recolhe.
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
        const digitada = window.prompt(
          `${mensagem}\n\nEscreve a palavra-chave de confirmação:`,
        );
        if (digitada === null) {
          evento.preventDefault();
          return;
        }

        const form = evento.currentTarget.form;
        if (!form) return;

        let campoPasskey = form.elements.namedItem("passkey") as HTMLInputElement | null;
        if (!campoPasskey) {
          campoPasskey = document.createElement("input");
          campoPasskey.type = "hidden";
          campoPasskey.name = "passkey";
          form.appendChild(campoPasskey);
        }
        campoPasskey.value = digitada;
      }}
    >
      {children}
    </button>
  );
}
