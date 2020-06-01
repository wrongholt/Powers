
var seconds = 0
t;
function add() {
  seconds++;
  
console.log(seconds);
seconds
  timer();
}
function timer() {
  t = setTimeout(add, 1000);

}
add();