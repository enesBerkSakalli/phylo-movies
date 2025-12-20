/**
 * Generic layer factory function
 * Creates a deck.gl layer instance from config and props
 */

/**
 * Create a deck.gl layer from configuration
 * @param {Object} config - Layer config with id, LayerClass, defaultProps
 * @param {Object} props - Instance-specific props
 * @returns {Layer} deck.gl layer instance
 */
export function createLayer(config, props) {
  return new config.LayerClass({
    ...config.defaultProps,
    id: config.id,
    ...props
  });
}
