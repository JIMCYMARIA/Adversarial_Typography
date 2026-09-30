import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Iridescence from './Iridescence.jsx';

export function mountIridescence(container) {
  if (!container) return;
  createRoot(container).render(createElement(Iridescence, {
    color: [1, 1, 1],
    mouseReact: false,
    amplitude: 0.1,
    speed: 0.2
  }));
}
