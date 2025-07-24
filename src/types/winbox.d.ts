declare module 'winbox' {
  interface WinBoxOptions {
    title?: string;
    width?: string | number;
    height?: string | number;
    x?: string | number;
    y?: string | number;
    mount?: HTMLElement;
    class?: string | string[];
    border?: number;
    background?: string;
    onclose?: () => void;
    onresize?: () => void;
    [key: string]: any;
  }

  class WinBox {
    constructor(title: string | WinBoxOptions, options?: WinBoxOptions);
    focus(): void;
    close(): void;
    minimize(): void;
    maximize(): void;
    body: HTMLElement;
    width: number;
    height: number;
    onresize: ((width?: number, height?: number) => void) | null;
  }

  export = WinBox;
  export default WinBox;
}