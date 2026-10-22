// src/types/assets.d.ts
//
// TypeScript 5.6+ (bundled with Next.js 14.2) requires side-effect imports
// like `import "./globals.css"` to be declared as modules. Next.js handles
// the runtime transform; these declarations just teach TypeScript that the
// files exist.

// Global CSS — imported for side effects only.
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
declare module "*.less";

// CSS Modules — imported as objects with class-name maps.
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Image assets — Next.js resolves these to URL strings.
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.gif" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}