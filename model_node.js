const {readFileAsync} = require('./data_node.js');
const {
  generateTableHead,
  generateTableHeadEnd,
  generateRow,
  generateRows,
  parseGPUTrace
} = require('./trace_op_node.js');
const fs = require('fs');

async function main() {
  // Model data: Tracing predict.
  const rootDir = 'timeline\\';
  let tracingPredictJsonData =
      JSON.parse(await readFileAsync(rootDir + 'tracing_predict.json'));
  console.log(tracingPredictJsonData['times'][0]);

  // Model data: Profile predict.
  const enableProfile = false;
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
  console.log(
      'Tracing GPU end - start = ' +
      (tracingGPUEnd - tracingGPUStart) / 1000000);

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
  // Update UI.
  let modelTable = generateTableHead();
  modelTable += generateRow({
    name: 'Tracing mode Predict time: ',
    data: (tracingPredictJsonData['times'][0]),
  });

  modelTable += generateRow({
    name: 'Tracing mode GPU timestamp last end - first start: ',
    data: (tracingGPUEnd - tracingGPUStart) / 1000000,
  });

  if (enableProfile) {
    modelTable += generateRow({
      name: 'Profile mode Predict time: ',
      data: (profilePredictJsonData),
    });
  }

  modelTable += generateTableHeadEnd();



  // Update UI.
  let table = '';  // document.querySelector("#ops");
  console.log(mergedData[0]);
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
  console.log(table);
}

module.exports = {
  main: main
};
