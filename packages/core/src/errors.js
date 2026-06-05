// @ts-check
/**
 * Error & diagnostic model.
 *
 * The spec distinguishes two failure modes:
 *  - Hard errors (throw `WiremarkError`): structural violations the author must
 *    fix -- tabs in indentation, inconsistent nesting, a bare (unquoted) text
 *    literal, a bare text node on its own line. (SPEC ss.3.1, 3.2.1, 3.2.3)
 *  - Soft warnings (collected as `Diagnostic`s, never thrown): the renderer
 *    degrades gracefully and keeps drawing -- e.g. a missing `background=#id`
 *    target, or a detected background cycle. (SPEC ss.5.1.1)
 */

/** A source location, 1-based. @typedef {{ line: number, col?: number }} Loc */

/**
 * A non-fatal problem surfaced to the caller alongside output.
 * @typedef {Object} Diagnostic
 * @property {'warning'|'error'} severity
 * @property {string} message
 * @property {Loc} [loc]
 */

/** Fatal, author-must-fix parse/validation error with a source location. */
export class WiremarkError extends Error {
  /** @param {string} message @param {Loc} [loc] */
  constructor(message, loc) {
    super(loc?.line ? `${message} (line ${loc.line})` : message);
    this.name = 'WiremarkError';
    /** @type {Loc|undefined} */
    this.loc = loc;
  }
}

/** Thrown by not-yet-implemented pipeline stages during scaffolding. */
export class NotImplementedError extends Error {
  /** @param {string} what */
  constructor(what) {
    super(`${what} is not implemented yet`);
    this.name = 'NotImplementedError';
  }
}

/**
 * @param {'warning'|'error'} severity
 * @param {string} message
 * @param {Loc} [loc]
 * @returns {Diagnostic}
 */
export function diagnostic(severity, message, loc) {
  return loc ? { severity, message, loc } : { severity, message };
}
