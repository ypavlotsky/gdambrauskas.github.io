// for i,j where i>j, find all pairs where array[i]<array[j]
var input = [1,3,5,2,4,6];

// every element whose index is greater, but value is less
findInversions(0,0,input);

function findInversions(i, j, array) {
  var l = input.length;
  if (i >= l && j >=l) {
    return;
  }
  if (i>=input.length) {
    i=0;
    j++;
  }
  if (i>j && array[i] < array[j]) {
    console.log("i>j, "+i+">"+j+ " value "+array[i] +"," +array[j]);
    return 1 + findInversions(i+1,j, array)
  }
  return findInversions(i+1, j, array);
}

// the clever way would be to do merge sort with descending order and count
// the swaps done.