// Keep ordinary local builds unchanged; Docker uses Next's minimal Node server.
export default {
  output: process.env.PERDTU_STANDALONE === '1' ? 'standalone' : undefined,
};
