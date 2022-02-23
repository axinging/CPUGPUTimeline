// Data.
async function parseGPUTrace(jsonData) {
  const traces = [];
  let sum = 0;
  for (let i = 0; i < jsonData.length; i++) {
    let queryData = jsonData[i]['query'];
    if (queryData.length == 2) {
      queryData = (queryData[1] - queryData[0]) / 1000000;
    } else if (queryData.length == 1) {
      queryData = queryData[0];
    } else {
      console.error('Query data length is ' + queryData.length);
    }
    sum += Number(queryData);
    traces.push({name: jsonData[i]['name'], query: queryData});
  }
  console.log(sum);
  sum = Number(sum).toFixed(3);
  return [traces, sum];
}

function mergeJsonArray(array1 = '', array2) {
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
// From https://www.valentinog.com/blog/html-table/
function generateTableHeadStart() {
  return "<table><thead>";
}

function generateTableHeadEnd() {
    return "</thead></table>";
  }

  function generateTableHead(data) {
    var header = generateTableHeadStart();
    header += generateRow(data);
    // header += generateTableHeadEnd();
    return header;
  }

  function generateRows(data) {
    var rows = '';
    for (let element of data) {
      rows += generateRow(element); 
    }
    return rows;
  }

/*
<table>
    <thead>
    <tr>
        <th>name</th>
        <th>height</th>
        <th>place</th>
    </tr>
    </thead>
*/

function generateRow(data) {
  let tr = '<tr>';
  console.log(data);
  for (key in data) {
    // console.log(data[key]+ data[]);
    tr += `<th>${data[key]}</th>`;
  }
  tr += '</tr>';
  return tr;
}

module.exports = {
    generateTableHead: generateTableHead,
    generateTableHeadEnd: generateTableHeadEnd,
    generateRow: generateRow,
    generateRows: generateRows,
    parseGPUTrace: parseGPUTrace,
};
