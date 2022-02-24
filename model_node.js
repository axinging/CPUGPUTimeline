const {readFileAsync} = require('./data_node.js');
const {
  createTableHead,
  createModelTableHead,
  createTableHeadEnd,
  createRow,
  createRows,
  parseGPUTrace
} = require('./trace_op_node.js');
const fs = require('fs');
const fsasync = require('fs').promises;

const enableProfile = false;

async function createModelFromData(
    tracingJsonData, profilePredictJsonData, profileJsonData) {
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
    mergedData, tracingGPULastFirst, tracingSum, profilePredictJsonData,
    profileSumOut
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
    tableName, mergedData, tracingGPULastFirst, tracingPredictTime, tracingSum,
    profilePredictJsonData, profileSumOut) {
  // Update UI.
  console.log('tableName =' + tableName);
  let modelTable = createModelTableHead(tableName);
  modelTable += createRow({
    name: 'Tracing mode Predict time',
    data: tracingPredictTime,
  });

  modelTable += createRow({
    name: 'Tracing mode GPU timestamp last - first',
    data: tracingGPULastFirst,
  });

  modelTable += createRow({
    name: 'Tracing mode GPU Ops sum',
    data: tracingSum,
  });

  if (enableProfile) {
    modelTable += createRow({
      name: 'Profile mode Predict time',
      data: (profilePredictJsonData),
    });
  }

  modelTable += createTableHeadEnd();

  let table = '';
  let headdata = Object.keys(mergedData[0]);
  table += createTableHead(headdata);
  table += createRows(mergedData);
  if (enableProfile) {
    table += createRow(
        {name: 'Sum', TracingQuery: tracingSum, ProfileQuery: profileSumOut});
  } else {
    table += createRow({name: 'Sum', TracingQuery: tracingSum});
  }
  table += createTableHeadEnd();
  return modelTable + table;
}

async function singleModelSummary(
    tabelName, tracingPredictTime, tracingJsonData,
    profilePredictJsonData = null, profileJsonData = null) {
  if (tracingJsonData == null) {
    const [mergedData, tracingGPULastFirst, tracingPredictData, tracingSum, profilePredictData, profileSumOut] =
        await createModel();
    return updateUI(
        tabelName, mergedData, tracingGPULastFirst, tracingSum,
        profilePredictData, profileSumOut);
  } else {
    const [mergedData, tracingGPULastFirst, tracingSum, profilePredictData, profileSumOut] =
        await createModelFromData(
            tracingJsonData, profilePredictJsonData, profileJsonData);
    return updateUI(
        tabelName, mergedData, tracingGPULastFirst, tracingPredictTime,
        tracingSum, profilePredictData, profileSumOut);
  }
}

function getJsonFromString(str, start, end) {
  const regStr = String.raw`${start}.*?${end}`;
  var matchRegex = new RegExp(regStr, 'g');
  const matchResults = str.match(matchRegex);
  console.log(start + '  matchResults length = ' + matchResults.length);
  if (Array.isArray(matchResults)) {
    var results = [];
    for (const item of matchResults) {
      results.push(JSON.parse(item.replace(start, '').replace(end, '')));
    }
    return results;
  } else {
    return new Array(
        JSON.parse(matchResults.replace(start, '').replace(end, '')));
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

function getName(item) {
  return item.replace(/[\[\]]/g, '').replace(/\//g, '_').replace(/[,\s]/g, '-');
}

function getModelNamesFromLog(logStr) {
  const matchRegex = /\[\d{1,2}\/\d{1,2}\].*webgpu/g;
  const matchResults = logStr.match(matchRegex);
  if (Array.isArray(matchResults)) {
    var results = [];
    for (const item of matchResults) {
      const name = getName(item);
      results.push(name);
    }
    return results;
  } else {
    return getName(matchResults);
  }
}

function writeSingleModelSummary(name, predictJsonData, gpuJsonData) {
  fs.writeFileSync(name + '-predict.json', JSON.stringify(predictJsonData));
  fs.writeFileSync(name + '-gpu.json', JSON.stringify(gpuJsonData));
}

async function modelSummary(logfileName, results) {
  if (logfileName == null) {
    console.error('No log file!');
  }
  const logStr = await fsasync.readFile(logfileName, 'binary');
  const modelNames =
      results == null ? getModelNamesFromLog(logStr) : getModelNames(results);

  const predictJsonData =
      getJsonFromString(logStr, 'predictbegin', 'predictend');
  const gpuJsonData = getJsonFromString(logStr, 'gpudatabegin', 'gpudataend');

  const modelSummarDir = logfileName.split('.')[0];
  try {
    if (!fs.existsSync(modelSummarDir)) {
      fs.mkdirSync(modelSummarDir)
    }
  } catch (err) {
    console.error(err)
  }

  let html = '';
  // predictJsonData.length is the model number.
  const modelCount = predictJsonData.length;
  for (var i = 0; i < modelCount; i++) {
    // Tracing may possible be repeated. predictJsonData[0]['times'].length is
    // the repeat count.
    const repeat = predictJsonData[0]['times'].length;
    const modelName = modelSummarDir + '\\' + modelNames[i];
    for (var j = 0; j < repeat; j++) {
      const tracingPredictTime = predictJsonData[i]['times'][j];
      html += await singleModelSummary(
          modelNames[i] + '-' + j, tracingPredictTime,
          gpuJsonData[i * repeat + j]);
      const name = modelName + '-' + j;
      fs.writeFileSync(name + '-gpu.json', JSON.stringify(gpuJsonData[i * repeat + j]));
    }

    fs.writeFileSync(modelName + '-predict.json', JSON.stringify(predictJsonData[i]));
  }


  const splitLogfileName = logfileName.split('\\');
  const modelSummaryFile = modelSummarDir + '\\' +
      splitLogfileName[splitLogfileName.length - 1].split('.')[0] +
      '-modelsummary.html';
  console.log(modelSummaryFile);
  fs.writeFileSync(modelSummaryFile, html);
}

module.exports = {
  modelSummary: modelSummary
};
