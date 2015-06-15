//http://www.websudoku.com/books/steps_example.php

var input = [
    //0  1  2    3  4  5    6   7  8
    //1  2  3    4  5  6    7   8  9
    [-1, 7, 8,  -1,-1,-1,   1, -1,-1],
    [3, -1, 5,   9,-1,-1,  -1,  8,-1],
    [2,  9,-1,  -1,-1, 5,   6, -1,-1],
    
    //1  2  3    4  5  6    7  8  9
    [-1, 4, 1,  -1, 7,-1,  -1,-1,-1],
    [ 9,-1,-1,   1, 3, 8,  -1,-1, 4],
    [-1,-1,-1,  -1, 4,-1,   8, 5,-1],
    
    //1  2  3    4  5  6    7  8  9
    [-1,-1, 7,   2,-1,-1,  -1, 6, 9],
    [-1, 8,-1,  -1,-1, 6,   2,-1, 7],
    [-1,-1, 2,  -1,-1,-1,   3, 1,-1],
];

solve(0,0,input);


function solve(rowIndex, colIndex, grid) {
  // make a copy of the grid, so it's local and allows easy backtracking
  var localGrid = copyGrid(grid);
  var value = localGrid[rowIndex][colIndex];
  // skip all existing filled in numbers.
  console.log("skipping "+value + " at row:"+rowIndex + " col:"+colIndex);
  while (value != -1 && colIndex < 9 && rowIndex < 9) {
    // move to next row
    if (colIndex == 8) {
      rowIndex += 1;
      colIndex = 0;
    } else {
      colIndex += 1;
    }
    value = localGrid[rowIndex][colIndex];
  } 
  
  for(var posibility=1;posibility<10;posibility++) {
    if (isValidForRow(posibility, rowIndex, localGrid) &&
        isValidForCol(posibility, colIndex, localGrid) &&
        isValidForQuadrant(posibility, rowIndex, colIndex, localGrid)) {
      localGrid[rowIndex][colIndex] = posibility;
      console.log("added " + posibility + "  row:" + rowIndex + " col:"+colIndex);
      if (solved(localGrid)) {
        prettyPrint(localGrid);
        return true;
      }
      console.log("solve with row:"+rowIndex + " col:"+colIndex)
      if (solve(rowIndex, colIndex, localGrid)) {
        return true;
      };
      console.log("out of posibilities at row:"+rowIndex+ " col:"+colIndex);
    }
  } 
}

function prettyPrint(grid) {
  var row = [];
  for (var i = 0; i < 9; i++) {
    if (row.length > 0) {
      console.log(row);
      row = [];
    }
    for (var j = 0; j < 9; j++) {
      if (grid[i][j] == -1) {
        row.push("" + grid[i][j])  
      } else {
        row.push(" " +grid[i][j]);
      }
    }
  }
  console.log(row);
}

function solved(grid) {
  for (var i = 0; i < 9; i++) {
    for (var j = 0; j < 9; j++) {
      if (grid[i][j] == -1) {
        return false;
      }
    }
  }
  console.log(grid);
  return true;
}

function isValidForRow(value, rowIndex, grid) {
  var row = grid[rowIndex];
  return !isPresent(value, row);
}

function isValidForCol(value, colIndex, grid) {
  var col = [];
  for (var rowIndex=0; rowIndex < 9;rowIndex++) {
    col.push(grid[rowIndex][colIndex]);
  }
  return !isPresent(value, col);
}

function isPresent(value, array) {
  for (var i=0; i < array.length;i++) {
    if (value == array[i]) {
      return true;
    }
  }
  return false;
}

function isValidForQuadrant(value, rowIndex, colIndex, grid) {
  while(rowIndex % 3 != 0 ) {
    rowIndex-=1;
  }
  while(colIndex % 3 != 0) {
    colIndex-=1;
  } 
  for (var i=rowIndex; i < rowIndex+3;i++) {
    for (var j=colIndex; j < colIndex+3;j++) {
      if (value == grid[i][j]) {
        return false;
      }
    }
  }
  return true;
}

function copyGrid(grid) {
  var newGrid = [];
  for (var i = 0; i < 9; i++) {
    newGrid.push([]);
    for (var j = 0; j < 9; j++) {
      newGrid[i].push(grid[i][j]);
    }
  }
  return newGrid;
}

function copyArray(array) {
  var newArray = [];
  for (var i = 0; i < 9; i++) {
    newArray.push(array[i]);
  }
  return newArray;
}

function tests() {
  assertEq(true, isValidForRow(2, 0, input), "2 in row 0 ");
  assertEq(false, isValidForRow(9, 0, input), "9 in row 0 ");
  assertEq(true, isValidForCol(2, 7, input), "2 in col 7 ");
  assertEq(false, isValidForCol(8, 7, input), "8 in col 7 ");
  assertEq(true, isValidForQuadrant(4, 0, 0, input), "4 top left quadrant");
  assertEq(false, isValidForQuadrant(2, 0, 0, input), "2 top left quadrant");
  assertEq(true, isValidForQuadrant(2, 5, 5, input), "2 middle quadrant");
  assertEq(false, isValidForQuadrant(8, 5, 5, input), "8 middle quadrant");
  console.log("tests complete");
}

function assertEq(expected, actual, message) {
  if (expected == actual) {
    return true;
  }
  if (!message) { 
    message = ""; 
  }
  console.log(message + " expected " +expected + " actual " +actual);
}

tests();