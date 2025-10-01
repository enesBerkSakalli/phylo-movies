// UIComponentFactory.js - Minimal WinBox window factory for Taxa Coloring (React-mounted)

export class UIComponentFactory {
  /**
   * Create the WinBox window and return its content mount node.
   * React UI will be mounted inside the returned element.
   */
  static async createColorAssignmentWindow(onClose) {
    const windowContent = document.createElement('div');
    windowContent.className = 'tc-container';

    // Resolve WinBox: prefer ESM, then package entry, then CDN fallback.
    let WinBox = window.WinBox;
    if (!WinBox) {
      let WinBoxCtor = null;
      try {
        const mod = await import('winbox/src/js/winbox.js');
        WinBoxCtor = mod?.default || mod?.WinBox || mod;
      } catch {}
      if (!WinBoxCtor) {
        try {
          const mod = await import('winbox');
          WinBoxCtor = mod?.default || mod?.WinBox || null;
        } catch {}
      }
      if (!WinBoxCtor) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/winbox@0.2.82/dist/winbox.bundle.min.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; });
        WinBoxCtor = window.WinBox;
      }
      WinBox = WinBoxCtor;
    }

    if (typeof WinBox !== 'function') {
      throw new Error(`WinBox is not available as a constructor. Type: ${typeof WinBox}`);
    }

    const colorWin = new WinBox({
      id: 'taxa-coloring-modal',
      title: 'Taxa Color Assignment',
      width: '800px',
      height: '85%',
      x: 'center',
      y: 'center',
      mount: windowContent,
      onclose: onClose,
      class: ['no-full', 'tc-winbox'],
    });

    return { windowContent, colorWin };
  }
}
