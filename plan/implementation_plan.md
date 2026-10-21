# Implementation Plan

## Target File: `src/gas/CSS.html`

### Target Symbol / Lines
- Selector: `.link-toggle`
- Lines: 306 - 326

### Diff Snippet
```css
<<<<
    /* --- 固有部品:双方向連動インラインボタン (.link-toggle) --- */
    .link-toggle {
      flex: none;
      display: inline-flex;
      align-items: center;
      height: fit-content;
      padding: 2px 8px;
      background: var(--grey50);
      border: 1px solid var(--grey300);
      border-radius: 20px;
      color: var(--grey400);
      cursor: pointer;
      transition: 0.2s;
      &:hover { border-color: var(--grey400); color: var(--text-main); }
      &[aria-selected="true"] {
        color: #fff;
        background: color-mix(in srgb, var(--theme-color) 70%, transparent);
        border-color: transparent;
      }
      .material-symbols-outlined { font-size: 14px; }
    }
====
    /* --- 固有部品:双方向連動インラインボタン (.link-toggle) --- */
    .link-toggle {
      flex: none;
      display: inline-flex;
      align-items: center;
      height: fit-content;
      padding: 1px 5px;
      background: var(--grey50);
      border: 1px solid var(--grey300);
      border-radius: 20px;
      color: var(--grey400);
      cursor: pointer;
      transition: 0.2s;
      &:hover { border-color: var(--grey400); color: var(--text-main); }
      &[aria-selected="true"] {
        color: #fff;
        background: color-mix(in srgb, var(--theme-color) 70%, transparent);
        border-color: transparent;
      }
      .material-symbols-outlined { font-size: 12px; }
    }
>>>>
```
