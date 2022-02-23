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
function generateTableHead(table, data) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of data) {
    let th = document.createElement('th');
    let text = document.createTextNode(key);
    th.appendChild(text);
    row.appendChild(th);
  }
}

function generateTable(table, data) {
  for (let element of data) {
    let row = table.insertRow();
    for (key in element) {
      let cell = row.insertCell();
      let text = document.createTextNode(element[key]);
      cell.appendChild(text);
    }
  }
}

function generateRow(table, data) {
  let element = data;
  let row = table.insertRow();
  for (key in element) {
    let cell = row.insertCell();
    let text = document.createTextNode(element[key]);
    cell.appendChild(text);
  }
}
