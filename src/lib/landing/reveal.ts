/**
 * Svelte action that adds the class `in` the first time an element scrolls into view, then calls
 * the optional callback. Content stays visible without JavaScript-driven motion where the browser
 * lacks IntersectionObserver.
 */
export function reveal(node: HTMLElement, onshow?: () => void): { destroy: () => void } {
  if (typeof IntersectionObserver === 'undefined') {
    node.classList.add('in');
    onshow?.();
    return { destroy: () => {} };
  }
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      node.classList.add('in');
      onshow?.();
      io.disconnect();
    }
  }, { threshold: 0.2 });
  io.observe(node);
  return { destroy: () => io.disconnect() };
}
