/**
 * Versão do app — fonte única de verdade para a UI.
 *
 * Injetada pelo Vite em build-time a partir do `version` do `package.json`
 * (ver `define.__APP_VERSION__` em `vite.config.ts`).
 *
 * Quando precisar mostrar a versão em qualquer tela, importe daqui:
 *   `import { APP_VERSION } from '../utils/appVersion';`
 *
 * Para bumpar a versão exibida no app: altere `package.json` e refaça o
 * build (ou reinicie o `npm run dev`). Nenhuma string hardcoded a corrigir
 * em telas espalhadas.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
