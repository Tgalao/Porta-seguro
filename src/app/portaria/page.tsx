import { redirect } from "next/navigation";

/**
 * A portaria passou a chamar-se "Portão Teste" e mudou de endereço.
 * Este redirecionamento fica para não partir nada que ainda aponte para
 * /portaria — favoritos do porteiro, o endereço decorado, links antigos.
 */
export default function PaginaPortariaAntiga() {
  redirect("/portao-teste");
}
