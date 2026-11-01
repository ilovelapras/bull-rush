# Bull Rush

A 3D endless runner you control with your body. Jog on the spot to run from a charging bull,
step left or right to change lane, jump to jump, squat to roll. The device camera tracks you;
nothing leaves the device.

The full design, architecture and rules are in [CLAUDE.md](./CLAUDE.md).

## Run it

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev        # HTTPS dev server on your network; open the printed Network URL on your phone
```

The camera needs HTTPS, so the dev server uses a self-signed certificate. Accept the browser
warning once on your phone.

## Other commands

| Command           | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `pnpm test`       | Vitest in every package                                 |
| `pnpm typecheck`  | Strict TypeScript in every package                      |
| `pnpm lint`       | ESLint, including the package import boundaries         |
| `pnpm format`     | Prettier                                                |
| `pnpm check:tree` | Checks the file tree in CLAUDE.md matches the real repo |
| `pnpm build`      | Static build of `apps/web` into `apps/web/dist`         |
