"use client";

import { useEffect, useRef } from "react";

const ID_ELEMENTO = "leitor-qr-portaria";

/**
 * Câmara de leitura do código QR (RF15). Isolado num componente próprio
 * porque a câmara só deve estar ligada enquanto este componente estiver
 * montado — o pai monta-o só quando o porteiro escolhe "Ler código QR" e
 * desmonta-o logo a seguir a uma leitura, o que já liberta a câmara.
 */
export function LeitorQR({ onLido }: { onLido: (token: string) => void }) {
  // Guardado em ref (em vez de estar nas dependências do efeito) para o
  // efeito só correr uma vez por montagem, sem reiniciar a câmara sempre
  // que o componente-pai gera uma nova função `onLido`.
  const onLidoRef = useRef(onLido);
  useEffect(() => {
    onLidoRef.current = onLido;
  });

  useEffect(() => {
    let cancelado = false;
    let leitorAtual: import("html5-qrcode").Html5Qrcode | null = null;
    // Só pode existir UMA chamada a `.stop()` em curso: tanto o callback de
    // sucesso como a limpeza do useEffect (ao desmontar) precisam de parar
    // a câmara, e chamá-la das duas vezes ao mesmo tempo é exatamente o que
    // causava o ecrã a ficar preso a preto no Safari do iPhone — o Chrome
    // tolera duas paragens simultâneas, o WebKit não. Guardando a promessa
    // aqui, quem chegar primeiro faz a paragem a sério; o outro só espera
    // por essa mesma promessa em vez de chamar `.stop()` outra vez.
    let promessaParagem: Promise<void> | null = null;
    function pararUmaVez(): Promise<void> {
      promessaParagem ??= leitorAtual ? leitorAtual.stop().catch(() => {}) : Promise.resolve();
      return promessaParagem;
    }

    async function iniciar() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelado) return;

      const leitor = new Html5Qrcode(ID_ELEMENTO);
      leitorAtual = leitor;

      try {
        await leitor.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (textoDecodificado) => {
            // Espera a câmara estar mesmo parada antes de avisar o pai —
            // só aí é que o pai desmonta este componente. Avisar primeiro e
            // parar depois é o que dava a corrida: o React começava a
            // desmontar (chamando `.clear()`) enquanto o `.stop()` do
            // sucesso ainda estava a meio.
            pararUmaVez().then(() => onLidoRef.current(textoDecodificado));
          },
          () => {
            // Chamado em cada frame sem código encontrado — não é um erro.
          },
        );
      } catch {
        // Sem câmara ou sem permissão: o porteiro continua a poder usar o
        // cartão, por isso não há aqui nenhum ecrã de erro bloqueante.
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      pararUmaVez()
        .then(() => leitorAtual?.clear())
        .catch(() => {});
    };
  }, []);

  return <div id={ID_ELEMENTO} className="mx-auto w-full max-w-xs" />;
}
