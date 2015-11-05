function uniformDistribution(random_number) { return random_number; }

function start() {
  var canvas = document.getElementById('simulation');
  var context = canvas.getContext('2d');
  var lengthX = 128;
  var lengthY = lengthX;
  var cellSizeX = canvas.width / lengthX;
  var cellSizeY = canvas.height / lengthY;
  var cellSize = cellSizeX < cellSizeY ? cellSizeX : cellSizeY;

  var fibers = new Fibers(lengthX, lengthY, uniformDistribution);
  var numTotalFibers = fibers.getNumTotalFibers();
  var numIntactFibers = numTotalFibers;

  var firstIntactFiberIndex = 0;
  var timer;
  var loop = function() {
    var weakestFiberIndex = findWeakestFiberIndex(fibers, firstIntactFiberIndex);
    fibers.changeLoadToBreak(weakestFiberIndex);

    var totalLoad = fibers.getTotalLoad();
    var stress = totalLoad / numTotalFibers;
    var strain = totalLoad / numIntactFibers;
    var fractionOfBrokenFibers = 1.0 - numIntactFibers / numTotalFibers;

    fibers.breakFiber(weakestFiberIndex);
    --numIntactFibers;
    var burstSize = 1;

    if (numIntactFibers > 0) {
      fibers.transferLoad(weakestFiberIndex);

      var breakingFiberIndices = [];
      while(true) {
        for (var index = firstIntactFiberIndex; index < numTotalFibers; ++index)
          if (fibers.isIntact(index) && fibers.getLoad(index) > fibers.getThreshold(index))
            breakingFiberIndices.push(index);

        if (breakingFiberIndices.length == 0)
          break;

        for (var count = 0; count < breakingFiberIndices.length; ++count)
          fibers.breakFiber(breakingFiberIndices[count]);
        numIntactFibers -= breakingFiberIndices.length;
        burstSize += breakingFiberIndices.length;

        if (numIntactFibers == 0)
          break;

        for (var count = 0; count < breakingFiberIndices.length; ++count)
          fibers.transferLoad(breakingFiberIndices[count]);

        breakingFiberIndices = [];
      }
    }

    drawFibers(context, canvas, fibers, totalLoad, stress, strain, fractionOfBrokenFibers, burstSize, cellSize);

    if (numIntactFibers > 0) {
      while (!fibers.isIntact(firstIntactFiberIndex))
        ++firstIntactFiberIndex;

      clearTimeout(timer);
      timer = setTimeout(loop, 50);
    }
  };

  loop();
}


function findWeakestFiberIndex(fibers, firstIntactFiberIndex) {
  var numTotalFibers = fibers.getNumTotalFibers();

  var weakestFiberIndex = firstIntactFiberIndex;
  var possibleLoadIncrement = fibers.getThreshold(weakestFiberIndex) - fibers.getLoad(weakestFiberIndex);
  for (var index = firstIntactFiberIndex+1; index < numTotalFibers; ++index) {
    var loadToBreak = fibers.getThreshold(index) - fibers.getLoad(index);
    if (fibers.isIntact(index) && loadToBreak < possibleLoadIncrement) {
      weakestFiberIndex = index;
      possibleLoadIncrement = loadToBreak;
    }
  }

  return weakestFiberIndex;
}

function Fibers(lengthX, lengthY, distribution) {
  var lengthX_ = lengthX;
  var lengthY_ = lengthX;
  var numTotalFibers_ = lengthX_ * lengthY_;

  var thresholds_ = new Array(numTotalFibers_);
  for (var index = 0; index < numTotalFibers_; ++index)
    thresholds_[index] = distribution(Math.random());

  var loadDeviations_ = new Array(numTotalFibers_);
  for (var index = 0; index < numTotalFibers_; ++index)
    loadDeviations_[index] = 0.0;

  var baseLoad_ = 0.0;

  var isIntacts_ = new Array(numTotalFibers_);
  for (var index = 0; index < numTotalFibers_; ++index)
    isIntacts_[index] = true;

  var indexToPosition_ = function(index) {
    return {x: index % lengthX_, y: Math.floor(index / lengthX_)};
  };

  var positionToIndex_ = function(x, y) {
    return x + lengthX_ * y;
  };

  var getNearestIntactFiberIndices_ = function(index) {
    var nearestIntactFiberIndices = [];

    var right = ((index+1) % lengthX_ == 0) ? index+1-lengthX_ : index+1;
    if (isIntacts_[right])
      nearestIntactFiberIndices.push(right);
    var left = (index % lengthX_ == 0) ? index+lengthX_-1 : index-1;
    if (isIntacts_[left])
      nearestIntactFiberIndices.push(left);
    var down = (Math.floor(index / lengthX_) == lengthY_-1) ? index+lengthX_-numTotalFibers_ : index+lengthX_;
    if (isIntacts_[down])
      nearestIntactFiberIndices.push(down);
    var up = (Math.floor(index / lengthX_) == 0) ? index+numTotalFibers_-lengthX_ : index-lengthX_;
    if (isIntacts_[up])
      nearestIntactFiberIndices.push(up);

    var depth = 1;
    while (nearestIntactFiberIndices.length == 0) {
      ++depth;
      nearestIntactFiberIndices = getIntactFiberIndicesInDepth_(index, depth);
    }

    return nearestIntactFiberIndices;
  };

  var getIntactFiberIndicesInDepth_ = function(index, depth) {
    var intactFiberIndices = [];

    var otherIndex = getIndexMovedFrom_(index, 0, -depth);
    if (isIntacts_[otherIndex])
      intactFiberIndices.push(otherIndex);
    otherIndex = getIndexMovedFrom_(index, 0, depth);
    if (isIntacts_[otherIndex])
      intactFiberIndices.push(otherIndex);

    for (var depthX = 1; depthX <= depth-1; ++depthX) {
      var depthY = depth - depthX;

      otherIndex = getIndexMovedFrom_(index, -depthX, -depthY);
      if (isIntacts_[otherIndex])
        intactFiberIndices.push(otherIndex);
      otherIndex = getIndexMovedFrom_(index, -depthX, depthY);
      if (isIntacts_[otherIndex])
        intactFiberIndices.push(otherIndex);
      otherIndex = getIndexMovedFrom_(index, depthX, -depthY);
      if (isIntacts_[otherIndex])
        intactFiberIndices.push(otherIndex);
      otherIndex = getIndexMovedFrom_(index, depthX, depthY);
      if (isIntacts_[otherIndex])
        intactFiberIndices.push(otherIndex);
    }

    otherIndex = getIndexMovedFrom_(index, -depth, 0);
    if (isIntacts_[otherIndex])
      intactFiberIndices.push(otherIndex);
    otherIndex = getIndexMovedFrom_(index, depth, 0);
    if (isIntacts_[otherIndex])
      intactFiberIndices.push(otherIndex);

    return intactFiberIndices;
  };

  var getIndexMovedFrom_ = function(index, differenceX, differenceY) {
    var position = indexToPosition_(index);

    var resultX = position.x + differenceX;
    var resultY = position.y + differenceY;
    if (resultX < 0) {
      do {
        resultX += lengthX_;
      } while (resultX < 0);
    }
    else {
      while (resultX >= lengthX_) {
        resultX -= lengthX_;
      }
    }
    if (resultY < 0) {
      do {
        resultY += lengthY_;
      } while (resultY < 0);
    }
    else {
      while (resultY >= lengthY_) {
        resultY -= lengthY_;
      }
    }

    return positionToIndex_(resultX, resultY);
  };

  return {
    getLengthX: function() {
      return lengthX_;
    },

    getLengthY: function() {
      return lengthY_;
    },

    getNumTotalFibers: function() {
      return numTotalFibers_;
    },

    getThreshold: function(index) {
      return thresholds_[index];
    },

    getLoad: function(index) {
      return baseLoad_ + loadDeviations_[index];
    },

    isIntact: function(index) {
      return isIntacts_[index];
    },

    changeLoadToBreak: function(index) {
      baseLoad_ = thresholds_[index] - loadDeviations_[index];
    },

    breakFiber: function(index) {
      isIntacts_[index] = false;
    },

    getTotalLoad: function() {
      var totalLoadDeviation = 0.0;
      var numIntactFibers = 0;
      for (var index = 0; index < numTotalFibers_; ++index)
        if (isIntacts_[index]) {
          totalLoadDeviation += loadDeviations_[index];
          ++numIntactFibers;
        }
      return totalLoadDeviation + baseLoad_ * numIntactFibers;
    },

    transferLoad: function(index) {
      var nearestIntactFiberIndices = getNearestIntactFiberIndices_(index);
      var loadIncrement = (baseLoad_ + loadDeviations_[index]) / nearestIntactFiberIndices.length;
      for (var count = 0; count < nearestIntactFiberIndices.length; ++count)
        loadDeviations_[nearestIntactFiberIndices[count]] += loadIncrement;
    },

    indexToPosition: function(index) {
      return indexToPosition_(index);
    },

    positionToIndex: function(x, y) {
      return positionToIndex_(x, y);
    }
  };
}


function drawFibers(context, canvas, fibers, totalLoad, stress, strain, fractionOfBrokenFibers, burstSize, cellSize, opt_maxLoad) {
  context.clearRect(600, 0, canvas.width, canvas.height);

  var maxLoad = opt_maxLoad || 1.0;
  var halfMaxLoad = maxLoad * 0.5;
  var quarterMaxLoad = maxLoad * 0.25;
  var threeQuartersMaxLoad = maxLoad * 0.75;

  var numTotalFibers = fibers.getNumTotalFibers();
  for (var index = 0; index < numTotalFibers; ++index) {
    var position = fibers.indexToPosition(index);

    if (fibers.isIntact(index)) {
      var load = fibers.getLoad(index);

      var red = 255;
      var green = 0;
      var blue = 0;
      if (load < quarterMaxLoad) {
        red = 0;
        green = Math.floor(255 * load / quarterMaxLoad);
        blue = 255;
      }
      else if (load < halfMaxLoad) {
        red = 0;
        green = 255;
        blue = 255 - Math.floor(255 * (load - quarterMaxLoad) / quarterMaxLoad);
      }
      else if (load < quarterMaxLoad) {
        red = Math.floor(255 * (load - halfMaxLoad) / quarterMaxLoad);
        green = red;
      }
      else if (load < maxLoad) {
        green = 255 - Math.floor(255 * (load - threeQuartersMaxLoad) / quarterMaxLoad);
      }

      drawFiber(context, position.x, position.y, red, green, blue, cellSize);
    }
    else
      drawFiber(context, position.x, position.y, 0, 0, 0, cellSize);
  }

  context.fillStyle = 'black';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText('fraction = ', 610, 490);
  context.fillText(fractionOfBrokenFibers, 650, 490);
  context.fillText('stress = ', 610, 510);
  context.fillText(stress, 650, 510);
  context.fillText('strain = ', 610, 530);
  context.fillText(strain, 650, 530);
}

function drawFiber(context, x, y, red, green, blue, cellSize) {
  context.fillStyle = 'rgb('+red+','+green+','+blue+')';
  context.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
}


