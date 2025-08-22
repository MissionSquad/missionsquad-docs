/// <reference types="vite/client" />

declare module '*.vue' {
  const component: import('vue').DefineComponent<{}, {}, unknown>;
  export default component;
}
