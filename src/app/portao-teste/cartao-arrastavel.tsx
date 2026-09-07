"use client";

import { useRef, useState } from "react";

export interface CartaoParaSimular {
  id: string;
  nome: string;
  numeroCartao: string;
  turma?: string;
  numeroAluno?: number;
  fotoUrl?: string;
}

/** A partir de que fração da pista é que largar o cartão conta como passagem. */
const LIMIAR = 0.7;

/**
 * Simulação de passar um cartão físico num leitor.
 *
 * O cartão arrasta-se ao longo de uma calha até à ranhura do leitor, à
 * direita. Se for largado antes do limiar, volta ao princípio; se passar,
 * completa a animação e avisa o componente-pai.
 *
 * Usa Pointer Events (e não eventos de rato) porque são os mesmos para
 * rato, dedo e caneta — a portaria pode muito bem estar num tablet.
 *
 * O cartão é também um botão para o teclado: arrastar é impossível para
 * quem navega por teclado, e deixar a única forma de usar a página
 * dependente do gesto excluía essas pessoas. Enter, espaço ou seta direita
 * fazem a mesma coisa.
 */
export function CartaoArrastavel({
  cartao,
  aoPassar,
  desativado = false,
}: {
  cartao: CartaoParaSimular;
  aoPassar: (numeroCartao: string) => void;
  desativado?: boolean;
}) {
  const calhaRef = useRef<HTMLDivElement>(null);
  const cartaoRef = useRef<HTMLDivElement>(null);
  const inicioRef = useRef(0);

  const [deslocamento, setDeslocamento] = useState(0);
  const [aArrastar, setAArrastar] = useState(false);
  const [passou, setPassou] = useState(false);
  // A distância percorrível depende da largura da calha, que só se conhece
  // depois de o elemento existir. Fica em estado (e não lida do ref durante
  // o render) porque o React não permite ler refs nessa altura — o valor
  // podia estar desatualizado sem provocar novo render.
  const [maximo, setMaximo] = useState(0);

  /** Mede a calha e o cartão. Só pode ser chamada fora do render. */
  function medirDistanciaMaxima(): number {
    const calha = calhaRef.current;
    const elemento = cartaoRef.current;
    if (!calha || !elemento) return 0;

    const medida = Math.max(0, calha.clientWidth - elemento.offsetWidth - 8);
    setMaximo(medida);
    return medida;
  }

  function concluir() {
    if (passou || desativado) return;
    setPassou(true);
    setAArrastar(false);
    setDeslocamento(medirDistanciaMaxima());

    // Deixa a animação de entrada na ranhura acontecer antes de avisar o
    // pai — senão o resultado aparecia com o cartão ainda a meio caminho.
    window.setTimeout(() => {
      aoPassar(cartao.numeroCartao);
      // Repõe o cartão no início, pronto para a próxima simulação.
      setPassou(false);
      setDeslocamento(0);
    }, 260);
  }

  function aoPressionar(evento: React.PointerEvent<HTMLDivElement>) {
    if (desativado || passou) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    inicioRef.current = evento.clientX - deslocamento;
    medirDistanciaMaxima();
    setAArrastar(true);
  }

  function aoMover(evento: React.PointerEvent<HTMLDivElement>) {
    if (!aArrastar) return;
    const bruto = evento.clientX - inicioRef.current;
    setDeslocamento(Math.min(Math.max(0, bruto), medirDistanciaMaxima()));
  }

  function aoLargar() {
    if (!aArrastar) return;
    setAArrastar(false);

    const limite = medirDistanciaMaxima();
    if (limite > 0 && deslocamento >= limite * LIMIAR) {
      concluir();
    } else {
      setDeslocamento(0);
    }
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Enter" || evento.key === " " || evento.key === "ArrowRight") {
      evento.preventDefault();
      concluir();
    }
  }

  const progresso = maximo > 0 ? deslocamento / maximo : 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={calhaRef}
        className="relative h-48 w-full overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-b from-slate-200 to-slate-300 p-1 shadow-inner select-none dark:border-slate-700 dark:from-slate-800 dark:to-slate-900"
      >
        {/* Ranhura do leitor, encostada à direita. */}
        <div className="absolute inset-y-3 right-3 flex w-16 flex-col items-center justify-center gap-2 rounded-xl bg-slate-800 shadow-lg dark:bg-black">
          <div
            className={`h-24 w-1.5 rounded-full transition-colors ${
              progresso > LIMIAR ? "bg-emerald-400" : "bg-slate-600"
            }`}
          />
          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
            Leitor
          </span>
        </div>

        {/* Guia visual: mostra até onde é preciso arrastar. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-40">
          <span
            className={`text-xs font-medium tracking-wide transition-opacity ${
              deslocamento > 8 ? "opacity-0" : "opacity-60"
            }`}
          >
            Arrasta o cartão até ao leitor →
          </span>
        </div>

        <div
          ref={cartaoRef}
          role="button"
          tabIndex={desativado ? -1 : 0}
          aria-label={`Passar o cartão de ${cartao.nome} no leitor`}
          aria-disabled={desativado}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoLargar}
          onPointerCancel={aoLargar}
          onKeyDown={aoTeclar}
          style={{ transform: `translateX(${deslocamento}px)` }}
          className={`absolute inset-y-4 left-4 w-56 touch-none rounded-xl shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
            aArrastar ? "cursor-grabbing" : "cursor-grab"
          } ${
            aArrastar || passou ? "" : "transition-transform duration-200"
          } ${desativado ? "opacity-50" : ""}`}
        >
          <FaceDoCartao cartao={cartao} />
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Arrasta com o rato ou o dedo. Com teclado: seleciona o cartão e carrega
        em Enter.
      </p>
    </div>
  );
}

/** O aspeto do cartão de estudante — só visual, sem lógica. */
function FaceDoCartao({ cartao }: { cartao: CartaoParaSimular }) {
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 p-3 text-white">
      <div className="flex items-start justify-between gap-2">
        <div
          aria-hidden
          className="flex h-5 w-7 items-center justify-center rounded-sm bg-amber-300/90"
        >
          <div className="h-2.5 w-4 rounded-[1px] border border-amber-700/40" />
        </div>
        <span className="text-[8px] font-medium uppercase tracking-widest text-teal-200">
          Cartão de estudante
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {cartao.fotoUrl ? (
          // <img> em vez de next/image: o endereço vem da base de dados e
          // pode apontar para qualquer domínio.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cartao.fotoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-md border border-white/30 object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/30 bg-white/15 text-xs font-semibold"
          >
            {iniciais(cartao.nome)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{cartao.nome}</p>
          {cartao.turma && <p className="text-[11px] text-teal-200">{cartao.turma}</p>}
        </div>
      </div>

      <p className="font-mono text-sm tracking-[0.2em] tabular-nums text-teal-100">
        {cartao.numeroCartao}
      </p>
    </div>
  );
}

/** "Beatriz Almeida" -> "BA". */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}
