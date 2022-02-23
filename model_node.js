const {readFileAsync} = require('./data_node.js');
const {
  generateTableHead,
  generateTableHeadEnd,
  generateRow,
  generateRows,
  parseGPUTrace
} = require('./trace_op_node.js');
const fs = require('fs');

const enableProfile = false;
async function createModel() {
  // Model data: Tracing predict.
  const rootDir = 'timeline\\';
  let tracingPredictJsonData =
      JSON.parse(await readFileAsync(rootDir + 'tracing_predict.json'));
  console.log(tracingPredictJsonData['times'][0]);

  // Model data: Profile predict.
  let profilePredictJsonData;
  if (enableProfile) {
    profilePredictJsonData =
        JSON.parse(await readFileAsync(rootDir + 'profile_predict.json'));
    console.log(profilePredictJsonData);
  }

  // Ops data.
  let tracingJsonData =
      JSON.parse(await readFileAsync(rootDir + 'tracing_gpudata.json'));
  const [tracingData, tracingSum] = await parseGPUTrace(tracingJsonData);
  console.log('tracingSum=' + tracingSum);
  const tracingGPUStart = tracingJsonData[0]['query'][0];
  const tracingGPUEnd = tracingJsonData[tracingJsonData.length - 1]['query'][1];
  const tracingGPULastFirst = (tracingGPUEnd - tracingGPUStart) / 1000000;

  // In case we need to show both tracing and profile data.
  let mergedData;
  let profileSumOut = 0;
  if (enableProfile) {
    let profileJsonData =
        JSON.parse(await readFileAsync('profile_gpudata.json'));
    const [profileData, profileSum] = await parseGPUTrace(profileJsonData);
    profileSumOut = profileSum;
    mergedData = mergeJsonArray(tracingData, profileData);
  } else {
    mergedData = tracingData;
    console.log(mergedData[0]);
  }
  return [
    mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum,
    profilePredictJsonData, profileSumOut
  ];
}

function updateUI(mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum,
  profilePredictJsonData, profileSumOut) {
  // Update UI.
  let modelTable = generateTableHead();
  modelTable += generateRow({
    name: 'Tracing mode Predict time: ',
    data: (tracingPredictJsonData['times'][0]),
  });

  modelTable += generateRow({
    name: 'Tracing mode GPU timestamp last end - first start: ',
    data: tracingGPULastFirst,
  });

  if (enableProfile) {
    modelTable += generateRow({
      name: 'Profile mode Predict time: ',
      data: (profilePredictJsonData),
    });
  }

  modelTable += generateTableHeadEnd();

  let table = '';
  let headdata = Object.keys(mergedData[0]);
  table += generateTableHead(headdata);
  table += generateRows(mergedData);
  if (enableProfile) {
    table += generateRow(
        {name: 'Sum', TracingQuery: tracingSum, ProfileQuery: profileSumOut});
  } else {
    table += generateRow({name: 'Sum', TracingQuery: tracingSum});
  }
  table += generateTableHeadEnd();
  fs.writeFileSync('tabel.html', modelTable + table);
}

async function main() {
  const [mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum, profilePredictJsonData, profileSumOut] =
      await createModel();
  updateUI(
      mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum,
      profilePredictJsonData, profileSumOut);
}

module.exports = {
  main: main
};
