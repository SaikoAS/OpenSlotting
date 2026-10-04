// Experiment only: discard obsolete read/compute results before updating the UI.
export class TaskGate {
  #context = '';
  #serial = 0;
  #active;
  setContext({ workspaceId, revision, locale, view, requestKey = null }) {
    const next = JSON.stringify([workspaceId, revision, locale, view, requestKey]);
    if (next !== this.#context) { this.cancel(); this.#context = next; }
  }
  cancel() { this.#serial += 1; this.#active?.abort(); this.#active = undefined; }
  async run(compute, apply) {
    if (apply.constructor.name === 'AsyncFunction') throw new TypeError('apply must be synchronous');
    this.cancel();
    const serial = this.#serial, context = this.#context, controller = new AbortController();
    this.#active = controller;
    const current = () => serial === this.#serial && context === this.#context && !controller.signal.aborted;
    try {
      const value = await compute(controller.signal);
      if (!current()) return { status: 'discarded' };
      // apply is synchronous; it may not contain an unguarded later persistence operation.
      const result = apply(value);
      if (result && typeof result.then === 'function') throw new TypeError('apply must not return a promise');
      return { status: 'applied' };
    } catch (error) {
      if (!current()) return { status: 'discarded' };
      throw error;
    } finally { if (this.#active === controller) this.#active = undefined; }
  }
}
