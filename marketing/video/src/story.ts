/** Edit this file to change copy, timing, footage or its in-point.
 * Durations are seconds. Each clip needs duration + dissolve handles.
 * All supplied recordings are real interactions with the Expo web build.
 */
export const FPS = 30;
export const DISSOLVE = 14;
export const soundtrack = {file:'audio/waves.mp3',volume:0.65};
export type Shot = {
  id: string;
  duration: number;
  eyebrow: string;
  title: string;
  detail: string;
  file?: string;
  inSeconds?: number;
  dark?: boolean;
};
export const shots: Shot[] = [
  {id:'hero', duration:4, eyebrow:'wintheweek.tamimshuhel.com', title:'Win your\nweek.', detail:'A little structure. Lasting consistency.', file:'v2/01-hero-light.mp4'},
  {id:'create', duration:4.5, eyebrow:'MAKE IT YOURS', title:'Create a\nweekly routine.', detail:'Start with something that matters to you.', file:'v2/02-create-routine.mp4'},
  {id:'days', duration:5.5, eyebrow:'FIND YOUR RHYTHM', title:'Choose the days\nit happens.', detail:'A routine that fits your week.', file:'v2/03-choose-days.mp4'},
  {id:'week', duration:4, eyebrow:'THE BIG PICTURE', title:'See your\nwhole week.', detail:'Every routine. A place in your plan.', file:'v2/04-full-week.mp4'},
  {id:'today', duration:4, eyebrow:'ONE DAY AT A TIME', title:'Focus on\ntoday.', detail:'Your routines, right in front of you.', file:'v2/05-today.mp4',dark:true},
  {id:'complete', duration:3.5, eyebrow:'ONE TAP FORWARD', title:'Done.\nOn to the next.', detail:'Small actions. A week well spent.', file:'v2/06-complete.mp4',dark:true},
  {id:'move-today', duration:7, eyebrow:'ROOM FOR REAL LIFE', title:'Plans change.\nYour week can too.', detail:'Move an unfinished routine to tomorrow.', file:'v2/07-move-today.mp4',dark:true},
  {id:'move-week', duration:4.5, eyebrow:'BACK IN YOUR PLAN', title:'Same routine.\nA better day.', detail:'Evening stretch, moved to Tuesday.', file:'v2/08-move-week.mp4',dark:true},
  {id:'progress', duration:7, eyebrow:'SEE IT ADD UP', title:'Your progress,\nin perspective.', detail:'Good days. Off days. A clearer picture.', file:'v2/09-progress.mp4',dark:true},
  {id:'brand', duration:5, eyebrow:'wintheweek.tamimshuhel.com', title:'WinTheWeek', detail:'A calmer way to plan your routines.', dark:true},
];
export const durationInFrames = shots.reduce((sum,s)=>sum+Math.round(s.duration*FPS),0);
