const h = require("./index.js").handler;
const testEvent = require("./sample_amplify-sns_event.json");
const status = process.argv[2] || "success"; // Default to "success" if no argument is provided
h(testEvent[status])
  .then(console.log)
  .catch(console.error);
