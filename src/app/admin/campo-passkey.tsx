/**
 * Campo da palavra-chave de confirmação, mostrado só nos formulários de
 * EDIÇÃO (nunca ao criar) — ver a explicação completa em `passkey.ts`.
 */
export function CampoPasskey() {
  return (
    <label className="flex flex-col gap-1 text-sm">
      Palavra-chave de confirmação
      <input
        name="passkey"
        type="password"
        required
        autoComplete="off"
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-transparent"
      />
    </label>
  );
}
