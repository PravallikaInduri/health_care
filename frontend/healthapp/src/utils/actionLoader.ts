/**
 * Tiny global store that tracks how many "actions" (mutating API requests)
 * are currently in flight. The axios layer increments/decrements it and a
 * single overlay component subscribes to render a loading indicator.
 */

type Listener = (pending: number) => void;

let pending = 0;
const listeners = new Set<Listener>();

const emit = () => {
  listeners.forEach((fn) => fn(pending));
};

export const startAction = () => {
  pending += 1;
  emit();
};

export const endAction = () => {
  pending = Math.max(0, pending - 1);
  emit();
};

export const getPendingActions = () => pending;

export const subscribeActions = (fn: Listener) => {
  listeners.add(fn);
  fn(pending);
  return () => {
    listeners.delete(fn);
  };
};
