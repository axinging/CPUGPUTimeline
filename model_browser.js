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
  let modelTable = document.querySelector('#model');
  generateRow(modelTable, {
    name: 'Tracing mode Predict time: ',
    data: (tracingPredictJsonData['times'][0]),
  });


  generateRow(modelTable, {
    name: 'Tracing mode GPU timestamp last end - first start: ',
    data: tracingGPULastFirst,
  });

  if (enableProfile) {
    generateRow(modelTable, {
      name: 'Profile mode Predict time: ',
      data: (profilePredictJsonData),
    });
  }



  let table = document.querySelector('#ops');
  let headdata = Object.keys(mergedData[0]);
  generateTableHead(table, headdata);
  generateTable(table, mergedData);
  if (enableProfile) {
    generateRow(
        table,
        {name: 'Sum', TracingQuery: tracingSum, ProfileQuery: profileSumOut});
  } else {
    generateRow(table, {name: 'Sum', TracingQuery: tracingSum});
  }
}

async function main() {
  const [mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum, profilePredictJsonData, profileSumOut] =
      await createModel();
  updateUI(
      mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum,
      profilePredictJsonData, profileSumOut);
}
