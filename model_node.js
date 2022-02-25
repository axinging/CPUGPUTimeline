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
    tracingPredictTime, tracingJsonData, profilePredictJsonData,
    profileJsonData) {
  // Model data: Tracing predict.
  const rootDir = 'timeline\\';

  console.log('tracingJsonData.length =' + tracingJsonData.length);
  // Ops data.
  const repeat = tracingJsonData.length;
  const mergedData0 = [];
  const tracingGPULastFirstArray = [];
  const tracingSumArray = [];

  for (let i = 0; i < repeat; i++) {
    const [tracingData, tracingSum, tracingGPULastFirst] =
        await parseGPUTrace(tracingJsonData[i]);
    mergedData0.push(tracingData);
    tracingSumArray.push(tracingSum);
    tracingGPULastFirstArray.push(tracingGPULastFirst);
  }

  const mergedArray = [];

  const opCount = mergedData0[0].length;
  console.log('opCount =' + opCount);
  console.log(tracingPredictTime);
  for (let i = 0; i < opCount; i++) {
    var line = {};
    line['name'] = mergedData0[0][i]['name'];
    for (let j = 0; j < repeat; j++) {
      line[`Query${j + 1}`] = mergedData0[j][i]['query'];
    }
    mergedArray.push(line);
  }
  {
    var tracingPredictTimeRow = {};
    tracingPredictTimeRow['name'] = 'Tracing mode Predict time';
    var tracingGPULastFirstRow = {};
    tracingGPULastFirstRow['name'] = 'Tracing mode GPU last first';
    var tracingSumRow = {};
    tracingSumRow['name'] = 'Sum of Ops';
    for (let j = 0; j < repeat; j++) {
      tracingPredictTimeRow[`Query${j + 1}`] = tracingPredictTime[j];
      tracingGPULastFirstRow[`Query${j + 1}`] = tracingGPULastFirstArray[j];
      tracingSumRow[`Query${j + 1}`] = tracingSumArray[j]
    }
    mergedArray.push(tracingSumRow);
    mergedArray.push(tracingGPULastFirstRow);
    mergedArray.push(tracingPredictTimeRow);
  }

  let profileSumOut = 0;
  const tracingSum = 0;
  const tracingGPULastFirst = 0;
  return [
    mergedArray, tracingGPULastFirst, tracingSum, profilePredictJsonData,
    profileSumOut
  ];
}

function updateUI(
    tableName, mergedData, tracingGPULastFirst, tracingPredictTime, tracingSum,
    profilePredictJsonData, profileSumOut) {
  // Update UI.
  console.log('tableName =' + tableName);
  let modelTable = createModelTableHead(tableName);

  modelTable += createTableHeadEnd();

  let table = '';
  let headdata = Object.keys(mergedData[0]);
  table += createTableHead(headdata);
  table += createRows(mergedData);
  table += createTableHeadEnd();
  return modelTable + table;
}

async function singleModelSummary(
    tabelName, tracingPredictTime, tracingJsonData,
    profilePredictJsonData = null, profileJsonData = null) {
  const [mergedData, tracingGPULastFirst, profilePredictData] =
      await createModelFromData(
          tracingPredictTime, tracingJsonData, profilePredictJsonData,
          profileJsonData);
  return updateUI(tabelName, mergedData, 0, 0, 0, 0, 0);
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
    const tracingPredictTimes = predictJsonData[i]['times'];
    const gpuJsonDataForModel = gpuJsonData.slice(i * repeat, (i + 1) * repeat);
    html += await singleModelSummary(
        modelNames[i], tracingPredictTimes, gpuJsonDataForModel);

    for (var j = 0; j < repeat; j++) {
      const tracingPredictTime = predictJsonData[i]['times'][j];
      const name = modelName + '-' + j;
      fs.writeFileSync(
          name + '-gpu.json', JSON.stringify(gpuJsonData[i * repeat + j]));
    }

    fs.writeFileSync(
        modelName + '-predict.json', JSON.stringify(predictJsonData[i]));
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
