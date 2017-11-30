/** 企业自动报备 */
const { main, finished, showError } = require('./lib');

try {
  main(window, finished);
} catch (error) {
  showError(error);
}
