'use strict';

const fs = require('fs').promises;

function createCPUModel(jsonData, data, categoriesIndex) {
  // handle createComputePipelineAsync
  let createComputePipelineAsyncName = 'CreateComputePipelineAsyncTask::Run';
  if (createComputePipelineAsyncName in jsonData) {
    let allData = jsonData[createComputePipelineAsyncName];
    let newAllData = [];
    let endTime = [];
    for (let i in allData) {
      let oneData = allData[i];
      let added = false;
      for (let j in endTime) {
        if (endTime[j] < oneData[0]) {
          newAllData[j].push(oneData);
          endTime[j] = oneData[0] + oneData[1];
          added = true;
        }
      }
      if (!added) {
        newAllData.push([]);
        let lastIndex = newAllData.length - 1;
        newAllData[lastIndex].push(oneData);
        endTime[newAllData.length - 1] = oneData[0] + oneData[1];
      }
    }
    delete jsonData[createComputePipelineAsyncName];
    for (let i in newAllData) {
      jsonData[`${createComputePipelineAsyncName}${i}(${
          newAllData[i].length})`] = newAllData[i];
    }
  }

  const cpuCategories = Object.keys(jsonData);
  cpuCategories.forEach(function(category, index) {
    let categoryData = jsonData[category];
    for (let i = 0; i < categoryData.length; i++) {
      let baseTime = categoryData[i][0];
      let duration = categoryData[i][1];
      data.push({
        name: category,
        value: [categoriesIndex, baseTime, (baseTime += duration), duration],
        itemStyle: {normal: {color: `${getRandomColor()}`}}
      });
    }
    categoriesIndex++;
  });
  return [cpuCategories, categoriesIndex];
}

function createGPUModel(jsonData, data, categoriesIndex) {
  var types = [
    {name: 'JS Heap', color: '#7b9ce1'}, {name: 'Documents', color: '#bd6d6c'},
    {name: 'Nodes', color: '#75d874'}, {name: 'Listeners', color: '#e0bc78'},
    {name: 'GPU Memory', color: '#dc77dc'}, {name: 'GPU', color: '#72b362'}
  ];
  // Generate mock data
  const gpuCategories = ['GPU'];
  gpuCategories.forEach(function(category, index) {
    var baseTime = 0;
    const dataCount = jsonData.length;
    const TIME_CONVERTER = 1;
    const baseTime0 = 0;
    for (var i = 0; i < dataCount; i++) {
      const item = jsonData[i];
      var baseTime = item.query[0] / TIME_CONVERTER - baseTime0;
      var duration =
          item.query[1] / TIME_CONVERTER - item.query[0] / TIME_CONVERTER;
      data.push({
        name: item.name,
        value: [categoriesIndex, baseTime, (baseTime += duration), duration],
        itemStyle: {normal: {color: `${getRandomColor()}`}}
      });
    }
    categoriesIndex++;
  });
  return [gpuCategories, categoriesIndex];
}

async function readFileAsync(url, method = 'GET') {
  return await fs.readFile(url, 'binary');
}

module.exports = {
  readFileAsync: readFileAsync,
};
