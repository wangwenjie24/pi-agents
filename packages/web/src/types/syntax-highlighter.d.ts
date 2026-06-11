declare module "react-syntax-highlighter/dist/esm/index.js" {
  export { Prism, PrismAsync } from "react-syntax-highlighter";
}

declare module "react-syntax-highlighter/dist/esm/styles/prism/one-light.js" {
  import type { SyntaxHighlighterTheme } from "react-syntax-highlighter";
  const oneLight: SyntaxHighlighterTheme;
  export { oneLight };
}
