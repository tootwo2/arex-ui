/// <reference types="vite/client" />
import React, { FC, PropsWithChildren } from 'react';

export type ReactFCWithChildren = React.FC<PropsWithChildren>;

// Custom Type for a React functional component with props AND CHILDREN
export type FCC<P> = FC<PropsWithChildren<P>>;

declare global {
  interface Window {
    __AREX_EXTENSION_INSTALLED__: boolean; // 是否安装了arex-chrome-extension
    __AREX_EXTENSION_VERSION__: string; // arex-chrome-extension 最新版本号
  }
}

declare module '@zougt/vite-plugin-theme-preprocessor/dist/browser-utils' {
  export function toggleTheme(options: {
    scopeName?: string;
    customLinkHref?: (href: string) => string;
  });

  export function addClassNameToHtmlTag(options: {
    scopeName?: string;
    multipleScopeVars: { scopeName: string; path?: string }[];
  });
}
