/**
 * Shared teardown for the three deck.gl renderers.
 *
 * DeckGLContext, MSADeckGLViewer and DeckTimelineRenderer construct deck.gl very
 * differently - a canvas element against a parent div, one view against four
 * composite views, a controller against none - so their setup is genuinely not
 * shared. Their teardown is: each cancels a pending frame, disconnects a
 * ResizeObserver, finalizes the Deck, and removes the DOM element it created.
 *
 * They had drifted apart in how carefully they did the last step. Two wrapped
 * the removal in try/catch and checked parentage; the third called
 * removeChild through an optional chain with no guard, which throws if the
 * element was already detached. Routing all three through one implementation
 * gives every renderer the careful version.
 */

/**
 * Cancel a pending animation frame, if one is scheduled.
 * @param {number|null|undefined} frameId
 * @returns {null} so callers can assign the result back to their field
 */
export function cancelPendingFrame(frameId) {
  if (frameId === null || frameId === undefined) return null;
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
  return null;
}

/**
 * Disconnect a ResizeObserver, if one is attached.
 * @param {ResizeObserver|null|undefined} observer
 * @returns {null}
 */
export function disconnectObserver(observer) {
  observer?.disconnect();
  return null;
}

/**
 * Finalize a Deck instance.
 *
 * deck.gl 9.3.7 finalize() nulls its internal _canvasContext without destroying
 * it (visgl/deck.gl#10355). That only leaks when device teardown was skipped,
 * which needs MapboxOverlay's _reuseDevices; none of these renderers use it, so
 * finalize() is sufficient here. If that changes, this is the one place to add
 * the extra teardown.
 *
 * @param {{finalize?: () => void}|null|undefined} deck
 * @returns {null}
 */
export function finalizeDeck(deck) {
  deck?.finalize();
  return null;
}

/**
 * Remove an element this renderer added, leaving anything else alone.
 *
 * Checks parentage rather than assuming it: the element may already have been
 * detached by a parent unmount, and removeChild throws when the node is not a
 * child of the node it is called on.
 *
 * @param {Element|null|undefined} element
 * @param {string} label Prefix for the warning, e.g. '[MSA Viewer]'
 * @returns {null}
 */
export function removeCreatedElement(element, label) {
  try {
    const parent = element?.parentNode;
    if (parent && parent.contains(element)) parent.removeChild(element);
  } catch (error) {
    console.warn(`${label} Failed to remove a deck.gl element during cleanup:`, error);
  }
  return null;
}

/**
 * The whole sequence, in the order every renderer already used: stop scheduled
 * work, stop observing, finalize, then detach.
 *
 * @param {object} options
 * @param {number|null} [options.frameId]
 * @param {ResizeObserver|null} [options.resizeObserver]
 * @param {{finalize?: () => void}|null} [options.deck]
 * @param {Element|null} [options.element]
 * @param {string} options.label
 */
export function teardownDeckRenderer({ frameId, resizeObserver, deck, element, label }) {
  cancelPendingFrame(frameId);
  disconnectObserver(resizeObserver);
  finalizeDeck(deck);
  removeCreatedElement(element, label);
}
