import { handlers } from "@/auth";

// Obrigatório: o fornecedor Credentials usa o Argon2id (módulo nativo) e o
// Mongoose (ligação TCP) — nenhum dos dois funciona no runtime Edge.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
