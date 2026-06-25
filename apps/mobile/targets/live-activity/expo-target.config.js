/** @type {(config: unknown) => import('@bacons/apple-targets').Config} */
module.exports = () => ({
  type: 'widget',
  name: 'LiveMatch',
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'ActivityKit'],
});
