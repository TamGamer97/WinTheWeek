// Illustrative history requested for the promo, confined to capture storage.
// The app itself computes every statistic and calendar ring from these records.
const allDays=['mon','tue','wed','thu','fri','sat','sun'];
const missed=new Set([3,10,16]);
const partial=new Set([5,8,12,19,21]);
function routine(id,title,color,days,index){
  const doneDates={};
  for(let day=1;day<=27;day++){
    if(!missed.has(day)&&(!partial.has(day)||index===0))doneDates[`2026-09-${String(day).padStart(2,'0')}`]=true;
  }
  return {id,title,color,timesPerWeek:4,createdIso:'2026-09-01',defaultDays:days,
    defaultDaysHistory:[{untilIso:'2026-09-28',days:allDays}],schedule:{},doneDates,order:index,dayOrder:{}};
}
module.exports=[
  routine(101,'Read 20 minutes','violet',['mon','tue','thu','sat'],0),
  routine(102,'Evening stretch','green',['mon','wed','fri','sun'],1),
];
