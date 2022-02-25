const {modelSummary} = require('./model_node.js');

(async function() {
  // single repeat 1: 20220224162630
  // single, repeat 10 20220224144903
  // multi repeat 10:  20220224145904
  // multimodel repeat 1: 20220224154340
  await modelSummary("20220224162630.log");
  await modelSummary("20220224144903.log");
  await modelSummary("20220224145904.log");
  await modelSummary("20220224154340.log");
})();
