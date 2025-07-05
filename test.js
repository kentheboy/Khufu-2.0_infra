const h = require("./index.js").handler;
h(require("./sample_amplify_event.json"))
  .then(console.log)
  .catch(console.error);
