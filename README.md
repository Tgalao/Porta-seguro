# PortaoSeguro (Secure Gate)

School entry/exit logging system. Project for UFCD 10790 - Programming Project.

## Stack

- Next.js (App Router) + React + TypeScript
- MongoDB Atlas + Mongoose
- Auth.js (email/password and Google account), with Argon2id (@node-rs/argon2)
- Tailwind CSS

## Running locally

Copy `.env.example` to `.env.local` and fill in the variables (see instructions inside the file itself).

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Useful scripts

- `npm run dev` - dev server
- `npm run build` - production build
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript type checking
