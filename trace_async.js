'use strict';

/*
This is used to get the time origin for both CPU and GPU.
First we extracted a CPU-GPU time from
tracing(d3d12::CommandRecordingContext::ExecuteCommandList Detailed Timing).

In tracing, we use first CPU tracing time as origin.
However, the CPU time (and so GPU time) from Detailed Timing is far behind the
first CPU tracing time(cpuTracingBase). So we need to adjust the GPU time
so that it can be used with first CPU tracing time as CPU origin and GPU origin.

GPU origin = GPU time from Detailed Timing + (first CPU tracing time - GPU time
from Detailed Timing)

Return in us.
*/
function getBaseTime(rawTime, cpuTracingBase) {
  const splitRawTime = rawTime.split(',');
  const cpuBase = splitRawTime[2].split(':')[1];
  const cpuFreq = splitRawTime[4].split(':')[1];
  const gpuBase = splitRawTime[3].split(':')[1];
  const gpuFreq = splitRawTime[5].split(':')[1];
  const TICK2US = 1000000;
  if (cpuTracingBase != 0) {
    // If this is used for CPU-GPU time: cpuTracingBase may possibly happens
    // before cpuBase. We use cpuTracingBase as real base, so the diff should be
    // applied to gpuBase.
    const diff = cpuTracingBase - cpuBase / cpuFreq * TICK2US;
    return [cpuTracingBase, gpuBase / gpuFreq * TICK2US + diff];
  } else {
    // For GPU only, cpuBase is not used.
    return [cpuBase / cpuFreq * TICK2US, gpuBase / gpuFreq * TICK2US];
  }
}

async function getBaseFromTracing(traceFile = '') {
  if (traceFile == null) {
    console.warn('No tracing file!');
    return [0, 0];
  }
  let eventNames = [
    'DeviceBase::APICreateComputePipeline',
    'CreateComputePipelineAsyncTask::Run', 'DeviceBase::APICreateShaderModule'
  ];
  let baseTimeName =
      'd3d12::CommandRecordingContext::ExecuteCommandList Detailed Timing';
  let baseTime = '';
  let cpuTracingBase = 0;

  let jsonData = JSON.parse(await readFileAsync('GET', traceFile));
  for (let event of jsonData['traceEvents']) {
    let eventName = event['name'];
    if (eventNames.indexOf(eventName) >= 0) {
      if (cpuTracingBase == 0) {
        // This is the first none 0 ts in tracing.
        cpuTracingBase = event['ts'];
      }
    }

    // This is the first Detailed Timing in tracing.
    if (eventName == baseTimeName) {
      if (baseTime == '') {
        baseTime = event.args['Timing'];
      }
    }
    if (baseTime != '' && cpuTracingBase != 0) {
      return getBaseTime(baseTime, cpuTracingBase);
    }
  }
  if (baseTime == '') {
    console.warn('Tracing has no Detailed Timing!');
  }
  return [0, 0];
}

async function parseCPUTrace(traceFile = '', totalTime = 0, baseCPUTime) {
  let eventNames = [
    'DeviceBase::APICreateComputePipeline',
    'CreateComputePipelineAsyncTask::Run', 'DeviceBase::APICreateShaderModule'
  ];
  let timeOriginName =
      'd3d12::CommandRecordingContext::ExecuteCommandList Detailed Timing';
  let results = {};
  let base_ts = 0;
  let baseTime = '';

  let jsonData = JSON.parse(await readFileAsync('GET', traceFile));
  for (let event of jsonData['traceEvents']) {
    let eventName = event['name'];
    if (eventNames.indexOf(eventName) >= 0) {
      if (!(eventName in results)) {
        results[eventName] = [];
      }
      // Event is us. Result is ms.
      results[eventName].push(
          [(event['ts'] - baseCPUTime) / 1000, event['dur'] / 1000]);
    }
  }
  results['total'] = [[0, totalTime]];
  return results;
}

async function parseGPUTrace(traceFile = '', totalTime = 0, baseGPUTime) {
  let eventNames = [
    'DeviceBase::APICreateComputePipeline',
    'CreateComputePipelineAsyncTask::Run', 'DeviceBase::APICreateShaderModule'
  ];
  let timeOriginName =
      'd3d12::CommandRecordingContext::ExecuteCommandList Detailed Timing';
  let results = {};
  let base_ts = 0;

  let jsonData = JSON.parse(await readFileAsync('GET', traceFile));
  // Raw GPU timestamp is ns, divided by 1000000 to get ms, align with CPU time.
  const TICK2MS = 1 / 1000000;

  for (let i = 0; i < jsonData.length; i++) {
    let eventName = jsonData[i];
    // When parse GPU alone, use the first as base.
    if (baseGPUTime == 0) {
      baseGPUTime = eventName['query'][0] * TICK2MS * 1000;
    }
    eventName['query'][0] =
        eventName['query'][0] * TICK2MS - baseGPUTime / 1000;
    eventName['query'][1] =
        eventName['query'][1] * TICK2MS - baseGPUTime / 1000;
  }
  return jsonData;
}
