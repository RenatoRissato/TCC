/// <reference types="vite/client" />

/**
 * Versão do app injetada pelo Vite a partir do `version` do package.json
 * (ver `define.__APP_VERSION__` em `vite.config.ts`). Substituída em
 * build-time — não existe em runtime como uma variável real.
 */
declare const __APP_VERSION__: string;
