import type { UnravelSelectionMessage } from '@/utils/types';

// Injects a floating "✨ Unravel" button near any text selection.
// Lives in a Shadow DOM so page CSS can't restyle it and ours can't leak out.
//
// Positioning is VIEWPORT-FIXED and tracks the selection as you scroll — the
// old version removed the button on scroll, which made it nearly impossible to
// click (you'd scroll to reach it and it would vanish).

const MIN_SELECTION_CHARS = 30;
const BTN_W = 116;
const BTN_H = 40;

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    let host: HTMLElement | null = null;
    let btn: HTMLButtonElement | null = null;
    let currentText = '';

    function hide() {
      host?.remove();
      host = null;
      btn = null;
      currentText = '';
    }

    // Place the button relative to the current selection's viewport rect.
    // Returns false if there's no valid rect (selection gone / off-layout).
    function reposition(): boolean {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;

      // Prefer just below the selection; flip above if it would clip the bottom.
      let top = rect.bottom + 8;
      if (top + BTN_H > window.innerHeight - 8) top = rect.top - BTN_H - 8;
      top = Math.max(8, Math.min(top, window.innerHeight - BTN_H - 8));

      // Centre under the selection, clamped into the viewport.
      let left = rect.left + rect.width / 2 - BTN_W / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - BTN_W - 8));

      if (host) {
        host.style.top = `${top}px`;
        host.style.left = `${left}px`;
      }
      return true;
    }

    function show(text: string) {
      currentText = text;
      if (host) {
        reposition();
        return;
      }

      host = document.createElement('div');
      host.style.cssText = `position:fixed;z-index:2147483647;`;
      const shadow = host.attachShadow({ mode: 'closed' });

      btn = document.createElement('button');
      // The yarn-ball mark + wordmark (inline SVG so it stays crisp on the page).
      const YARN_SVG =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="10.5" cy="10.5" r="7.6"/>' +
        '<ellipse cx="10.5" cy="10.5" rx="7.6" ry="3" transform="rotate(32 10.5 10.5)"/>' +
        '<ellipse cx="10.5" cy="10.5" rx="7.6" ry="3" transform="rotate(-32 10.5 10.5)"/>' +
        '<ellipse cx="10.5" cy="10.5" rx="3" ry="7.6" transform="rotate(32 10.5 10.5)"/>' +
        '<path d="M15.8 15.8 q 2.6 2.4 5.4 1.1"/></svg>';
      btn.innerHTML = `${YARN_SVG}<span>Unravel</span>`;
      // Chunky 2.5D pill — mirrors the extension's tactile language (inline
      // styles, since Tailwind doesn't reach the host page).
      btn.style.cssText = [
        'all:initial',
        'box-sizing:border-box',
        `width:${BTN_W}px`,
        `height:${BTN_H}px`,
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'gap:7px',
        'cursor:pointer',
        'font-family:Nunito,system-ui,sans-serif',
        'font-size:14px',
        'font-weight:800',
        'color:#fff',
        'background:#0f6cbd',
        'border-radius:999px',
        'box-shadow:0 4px 0 0 #0a4a8f',
        'user-select:none',
        'transition:transform .12s ease, box-shadow .12s ease',
      ].join(';');

      btn.addEventListener('mousedown', (e) => {
        // mousedown (not click) + preventDefault so the selection survives.
        e.preventDefault();
        e.stopPropagation();
        btn!.style.transform = 'translateY(3px)';
        btn!.style.boxShadow = 'none';
        btn!.textContent = 'Unravelling…';
        const message: UnravelSelectionMessage = {
          type: 'UNRAVEL_SELECTION',
          text: currentText,
          pageTitle: document.title,
          url: location.href,
          // Whole visible page → chat context, so the student never has to
          // screenshot/paste the page into an AI app themselves.
          pageText: document.body.innerText.slice(0, 20000),
        };
        chrome.runtime.sendMessage(message).finally(hide);
      });

      shadow.appendChild(btn);
      document.documentElement.appendChild(host);
      reposition();
    }

    // Show on selection.
    document.addEventListener('mouseup', () => {
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? '';
        if (!selection || selection.isCollapsed || text.length < MIN_SELECTION_CHARS) {
          // Don't hide if the click landed on our own button (handled above).
          if (!host?.contains(document.activeElement)) hide();
          return;
        }
        show(text);
      }, 0);
    });

    // Track the selection on scroll/resize instead of vanishing.
    const onViewportChange = () => {
      if (!host) return;
      if (!reposition()) hide();
    };
    window.addEventListener('scroll', onViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', onViewportChange, { passive: true });

    // Dismiss on click-away or Escape.
    document.addEventListener(
      'mousedown',
      (e) => {
        if (host && !host.contains(e.target as Node)) {
          const selection = window.getSelection();
          // Give the mouseup handler a chance if they're re-selecting; only
          // hide when the click is truly outside and clears the selection.
          setTimeout(() => {
            if (!selection || selection.isCollapsed) hide();
          }, 0);
        }
      },
      { capture: true },
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });
  },
});
