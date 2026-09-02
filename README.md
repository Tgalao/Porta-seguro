# PortãoSeguro

Sistema de registo de entradas e saídas escolares. Projeto da UFCD 10790 —
Projeto de Programação.

## Stack

- Next.js (App Router) + React + TypeScript
- MongoDB Atlas + Mongoose
- Auth.js (email/password e conta Google), com Argon2id (`@node-rs/argon2`)
- Tailwind CSS

## Como correr localmente

1. Copiar `.env.example` para `.env.local` e preencher as variáveis (ver
   instruções dentro do próprio ficheiro).
2. Instalar as dependências:

   ```bash
   npm install
   ```

3. Arrancar o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abrir [http://localhost:3000](http://localhost:3000).

## Scripts úteis

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run typecheck` — verificação de tipos TypeScript
