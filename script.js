
function getNextTuesday(){
const n=new Date(),t=new Date(n);
let d=(2-n.getDay()+7)%7;if(d===0)d=7;
t.setDate(n.getDate()+d);t.setHours(0,0,0,0);return t;
}
const launch=getNextTuesday();
function u(){
const x=launch-new Date();
document.getElementById('days').textContent=String(Math.floor(x/86400000)).padStart(2,'0');
document.getElementById('hours').textContent=String(Math.floor(x%86400000/3600000)).padStart(2,'0');
document.getElementById('minutes').textContent=String(Math.floor(x%3600000/60000)).padStart(2,'0');
document.getElementById('seconds').textContent=String(Math.floor(x%60000/1000)).padStart(2,'0');
}
u();setInterval(u,1000);
