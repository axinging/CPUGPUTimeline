function getAdjustTime(rawTime, isRawTimestamp, gpuFreq) {
  let adjustTime = 0;
  if (isRawTimestamp) {
    // raw timestamp is ticks.
    adjustTime = rawTime * 1000 / gpuFreq;
  } else {
    // converted GPU timestamp is ns. Converted to ms.
    adjustTime = rawTime / 1000000;
  }
  return adjustTime;
}

// Data. For Profile data, no lastFirst.
async function parseGPUTrace(jsonData, lastFirst = true, isRawTimestamp = false) {
  const gpuFreq = 19200000;
  if (isRawTimestamp && gpuFreq == 0) {
    throw 'isRawTimeStamp is true but gpuFreq is 0';
  }
  const traces = [];
  let sum = 0;

  let tracingGPULastFirst = 0;
  if (lastFirst) {
    const tracingGPUStart = jsonData[0]['query'][0];
    const tracingGPUEnd = jsonData[jsonData.length - 1]['query'][1];

    tracingGPULastFirst = getAdjustTime((tracingGPUEnd - tracingGPUStart), isRawTimestamp, gpuFreq);
  }

  for (let i = 0; i < jsonData.length; i++) {
    let queryData = jsonData[i]['query'];

    if (queryData.length == 2) {
      queryData = getAdjustTime((queryData[1] - queryData[0]), isRawTimestamp, gpuFreq);
    } else if (queryData.length == 1) {
      // FOr profile data, alreay in ms.
      queryData = queryData[0];
    } else {
      console.error(
          'Query data length ' + queryData.length + ' is not supported!');
    }
    sum += Number(queryData);
    traces.push({name: jsonData[i]['name'], query: queryData});
  }
  sum = Number(sum).toFixed(3);
  return [traces, sum, tracingGPULastFirst];
}

function mergeJsonArray(array1 = '', array2 = '') {
  const mergedArray = [];
  for (let i = 0; i < array1.length; i++) {
    let query1Data = array1[i]['query'];
    let query2Data = array2[i]['query'];
    if (array1[i]['name'] != array2[i]['name']) {
      console.error('Op name not match!');
    }
    mergedArray.push({
      name: array1[i]['name'],
      TracingQuery: query1Data,
      ProfileQuery: query2Data
    });
  }
  return mergedArray;
}

// View.
function createTableHeadStart() {
  return `<style>
  table {
    font-family: Arial, Helvetica, sans-serif;
    border-collapse: collapse;
    width: 30%;
  }

  td,
  th {
    border: 1px solid #ddd;
    padding: 8px;
  }

  tr:nth-child(even) {
    background-color: #f2f2f2;
  }

  tr:hover {
    background-color: #ddd;
  }

  th {
    padding-top: 12px;
    padding-bottom: 12px;
    text-align: left;
    background-color: #f4fAfD;
    color: black;
  }
  </style><table><thead>`;
}

function createTableHeadEnd() {
  return '</table>';
}

function createModelTableHead(data) {
  var header = createTableHeadStart();
  header += `<th>${data}</th></thead>`;
  return header;
}

function createTableHead(data, modelName, date) {
  var header = createTableHeadStart();
  header += createRowWithLink(data, modelName, date) + '</thead>';
  return header;
}


function createRows(data) {
  var rows = '';
  for (let element of data) {
    rows += createRow(element);
  }
  return rows;
}

function createRow(data) {
  let tr = '<tr>';
  for (key in data) {
    tr += `<td>${data[key]}</td>`;
  }
  tr += '</tr>';
  return tr;
}

function createRowWithLink(data, modelName, date) {
  let tr = '<tr>';
  for (key in data) {
    if (data[key] != 'name') {
      const gpuDataFile = `${modelName}-${key}`;
      console.log(modelName + ",,," + key + ",,," + `${key}` + ",,,,"+ gpuDataFile)
      tr += `<td><a href="./../../timeline.html?date=${date}&gpufile=${
          modelName}-${key}">${data[key]}</a></td>`;
    } else {
      tr += `<td>${data[key]}</td>`;
    }
  }
  tr += '</tr>';
  return tr;
}

module.exports = {
  createTableHead: createTableHead,
  createModelTableHead: createModelTableHead,
  createTableHeadEnd: createTableHeadEnd,
  createRow: createRow,
  createRows: createRows,
  parseGPUTrace: parseGPUTrace,
};
