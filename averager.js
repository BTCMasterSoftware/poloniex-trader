/**
  Averaging:
  - every 15 minutes interval
  - not keeping individual trade data for things older than 1 day
  - Averaging data only over 15 minutes old

  Internal structure:
  - summaries of every 15 minutes things in a list: [AveragedData, ...]
  - Trades storage: lists of lists of 1000 trades
*/

function Averager() {
  this.data = [new Data()];
  this.averagedData = [];
  this.currentTime = 0;
  this.lastAveraged = 0;
  this.averagingFunctions = {};
}

Averager.prototype.addData = function(object, timeData) {
  var seq = timeData.seq;
  var stamp = Math.floor(new Date(timeData.date).getTime() / 1000);

  if (this.currentTime < stamp) {
    this.currentTime = stamp;
  }
  if (this.lastAveraged == 0 || this.lastAveraged > stamp) {
    this.lastAveraged = stamp;
  }

  if (this.lastData().isFull()) {
    this.newBlock();
  }

  this.lastData().addData(object, [stamp, seq]);
};

Averager.prototype.lastData() = function() {
  return this.data[this.data.length-1];
};

Averager.prototype.newBlock = function() {
  this.averageOldData();
  this.data.push(new Data());
};

Averager.prototype.averageOldData = function() {
  /* Last non-averaged trade needs to be 30 minutes old at least */
  if ( (this.currentTime - this.lastAveraged) < 30*60) {
    return;
  }

  /* Get all trades in blocks of 15 minutes */
  var trades = this.getDataTimeRange(this.lastAveraged+1, this.currentTime);
  var averagedData = new AveragedData(this.lastAveraged+1, this.currentTime);

  for (key in this.averagingFunctions) {
    var result = this.averagingFunctions[key](trades);

    this.averagedData.addData(key, result);
  }
  this.averagedData.push(averagedData);
  this.lastAveraged = this.currentTime;
};

/* Get all trades in a time range, in the format [{object, timeStamp}, ...] */
Averager.prototype.getDataTimeRange = function(begin, end) {
  var res = [];

  for (var i = 0; i < this.data.length; i = i +1) {
    if (begin > this.data[i].timeEnd || end < this.data[i].timeStart) {
      continue;
    }

    this.data[i].forEach(function(item) {
      if (item.timeStamp < begin || item.timeStart > end) {
        return;
      }
      res.push(item);
    });
  }

  return res;
}

/* ASSUMPTIONS
 - Averaged data stored in order
 - no gap in averaged data

 Return: {trades: [{object, timeStamp}, ...], averages: [AveragedData...]}
 */
Averager.prototype.getAveragedDataTimeRange = function(begin, end) {
  var averageBegin = 0;
  var averageEnd = 0;
  var averages = [];

  averagedData.forEach(function(item) {
    if (item.timeStart < begin) {
      return;
    }
    if (item.timeEnd > end) {
      return;
    }
    if (averageBegin == 0 || item.timeStart < averageBegin) {
      averageBegin = item.timeStart;
    }
    if (averageEnd == 0 || item.timeEnd > averageEnd) {
      averageEnd = item.timeEnd;
    }
    averages.push(item);
  });

  var trades = this.getDataTimeRange(begin, averageBegin-begin).concat(end, averageEnd-end);
  return {trades, averages};
};

function AveragedData(begin, end) {
  this.timeStart = begin;
  this.timeEnd = end;
  this.data = {};
}

AveragedData.prototype.addData = function(key, result) {
  this.data[key] = result;
};

function Data() {
  this.raw = [];
  this.timeStart = 0;
  this.timeEnd = 0;
}

Data.prototype.isFull = function() {
  return this.raw.length >= 1000;
};

Data.prototype.addData = function(object, timeData) {
  var timeStamp = timeData[0];
  if (this.isEmpty()) {
    this.timeStart = timeStamp;
  }
  if (timeStamp < this.timeStart) {
    this.timeStart = timeStamp;
  }
  if (timeStamp > this.timeEnd) {
    this.timeEnd = timeStamp;
  }
  this.raw.push({object, timeStamp});
};

Data.prototype.isEmpty = function() {
  return this.raw.length == 0;
};