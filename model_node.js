const {readFileAsync} = require('./data_node.js');
const {
  generateTableHead,
  generateTableHeadEnd,
  generateRow,
  generateRows,
  parseGPUTrace
} = require('./trace_op_node.js');
const fs = require('fs');
const fsasync = require('fs').promises;

const enableProfile = false;

async function createModelFromData(
    tracingPredictJsonData, tracingJsonData, profilePredictJsonData,
    profileJsonData) {
  // Model data: Tracing predict.
  const rootDir = 'timeline\\';

  // Ops data.
  const [tracingData, tracingSum] = await parseGPUTrace(tracingJsonData);
  console.log('tracingSum=' + tracingSum);
  const tracingGPUStart = tracingJsonData[0]['query'][0];
  const tracingGPUEnd = tracingJsonData[tracingJsonData.length - 1]['query'][1];
  const tracingGPULastFirst = (tracingGPUEnd - tracingGPUStart) / 1000000;

  // In case we need to show both tracing and profile data.
  let mergedData;
  let profileSumOut = 0;
  if (enableProfile) {
    const [profileData, profileSum] = await parseGPUTrace(profileJsonData);
    profileSumOut = profileSum;
    mergedData = mergeJsonArray(tracingData, profileData);
  } else {
    mergedData = tracingData;
  }
  return [
    mergedData, tracingGPULastFirst, tracingPredictJsonData, tracingSum,
    profilePredictJsonData, profileSumOut
  ];
}

async function createModel() {
  const rootDir = 'timeline\\';
  let tracingPredictJsonData =
      JSON.parse(await readFileAsync(rootDir + 'tracing_predict.json'));

  // Model data: Profile predict.
  let profilePredictJsonData;
  if (enableProfile) {
    profilePredictJsonData =
        JSON.parse(await readFileAsync(rootDir + 'profile_predict.json'));
  }

  // Ops data.
  let tracingJsonData =
      JSON.parse(await readFileAsync(rootDir + 'tracing_gpudata.json'));

  let profileJsonData
  if (enableProfile) {
    profileJsonData = JSON.parse(await readFileAsync('profile_gpudata.json'));
  }
  return await createModelFromData(
      tracingPredictJsonData, tracingJsonData, profilePredictJsonData,
      profileJsonData);
}

function updateUI(
    tableName, mergedData, tracingGPULastFirst, tracingPredictJsonData,
    tracingSum, profilePredictJsonData, profileSumOut) {
  // Update UI.
  console.log('tableName =' + tableName);
  let modelTable = generateTableHead(tableName);
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
  return modelTable + table;
}

async function singleModelSummary(
    tabelName, tracingPredictJsonData, tracingJsonData,
    profilePredictJsonData = null, profileJsonData = null) {
  if (tracingPredictJsonData == null) {
    const [mergedData, tracingGPULastFirst, tracingPredictData, tracingSum, profilePredictData, profileSumOut] =
        await createModel();
    return updateUI(
        tabelName, mergedData, tracingGPULastFirst, tracingPredictData,
        tracingSum, profilePredictData, profileSumOut);
  } else {
    const [mergedData, tracingGPULastFirst, tracingPredictData, tracingSum, profilePredictData, profileSumOut] =
        await createModelFromData(
            tracingPredictJsonData, tracingJsonData, profilePredictJsonData,
            profileJsonData);
    return updateUI(
        tabelName, mergedData, tracingGPULastFirst, tracingPredictJsonData,
        tracingSum, profilePredictData, profileSumOut);
  }
}

function getJsonFromString(str, start, end) {
  const regStr = String.raw`${start}.*?${end}`;
  var matchRegex = new RegExp(regStr, 'g');
  const matchResults = str.match(matchRegex);
  if (Array.isArray(matchResults)) {
    var results = [];
    for (const item of matchResults) {
      results.push(JSON.parse(item.replace(start, '').replace(end, '')));
    }
    return results;
  } else {
    return JSON.parse(matchResults.replace(start, '').replace(end, ''));
  }
}

function getModelNames(modelNamesJson) {
  if (modelNamesJson == null) {
    console.error('No Model names!');
    return [];
  }
  const modelNames = [];
  for (const item in modelNamesJson['performance']) {
    modelNames.push(modelNamesJson['performance'][item][0]);
  }
  return modelNames;
}

async function modelSummary(logfileName, results) {
  if (logfileName == null) {
    console.error('No log file!');
  }
  const modelNames = getModelNames(results);
  const strMatch = await fsasync.readFile(logfileName, 'binary');
  const predictJsonData =
      getJsonFromString(strMatch, 'predictbegin', 'predictend');
  const gpuJsonData = getJsonFromString(strMatch, 'gpudatabegin', 'gpudataend');

  let html = '';
  if (Array.isArray(predictJsonData)) {
    for (var i = 0; i < predictJsonData.length; i++) {
      html += await singleModelSummary(
          modelNames[i], predictJsonData[i], gpuJsonData[i]);
    }
  } else {
    html +=
        await singleModelSummary(modelNames[i], predictJsonData, gpuJsonData);
  }
  const modelSummaryFile = logfileName.split('.')[0] + '-modelsummary.html'
  fs.writeFileSync(modelSummaryFile, html);
}

module.exports = {
  modelSummary: modelSummary
};
