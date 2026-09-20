// Records the real app with user-requested illustrative month history.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const root = path.resolve(__dirname, '..');
const appRoot = path.join(root, 'capture/app-v2');
const captureRoot = path.join(root, 'capture');
const output = path.join(root, 'public/recordings/v2');
const demoRoutines = require('./demo-data.cjs');
const {shots,FPS,DISSOLVE} = require('../src/story.ts');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const demoDate = '2026-09-28T09:41:00+01:00';
const mime = {'.html':'text/html','.js':'application/javascript','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'};
const server = http.createServer((req,res) => {
  const relative = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(appRoot, relative);
  if (!file.startsWith(appRoot + path.sep) || !fs.existsSync(file)) {res.writeHead(404).end();return;}
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {channel:'chrome'})});
  const context = await browser.newContext({viewport:{width:412,height:824},deviceScaleFactor:2,timezoneId:'Europe/London'});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  const recordings=[];
  try {
    // Advance normally so React Native's Date-based animations can finish.
    await page.clock.install({time:new Date(demoDate)});
    await page.goto('http://127.0.0.1:8766');
    await page.evaluate(data=>{
      localStorage.setItem('@cadence/routines/v2',JSON.stringify(data));
      localStorage.setItem('@cadence/onboarding/v1',JSON.stringify({seenIntro:true,seenCoachmarks:true}));
    },demoRoutines);
    await page.reload();await delay(1000);
    const text = t=>page.getByText(t,{exact:true});
    const tap = async(x,y)=>{await page.mouse.click(x,y); await page.mouse.move(0,0);};
    // The Today FAB preselects today's day. Clear it before demonstrating
    // an explicit three-day choice (the UI still supplies the default).
    const addForm = async()=>{await tap(362,696);await delay(420);await text('Mon').click();await delay(200);};
    const cdp=await context.newCDPSession(page);
    // Chromium emits the actual rendered surface on visual changes. Preserve
    // its timestamps, including still holds; encode to a constant 30 fps MP4.
    async function record(name,action){
      const dir=path.join(captureRoot,name);fs.mkdirSync(dir,{recursive:true});
      const frames=[];let accepting=true;
      const listener=event=>{
        if(accepting){
          const file=`frame-${String(frames.length).padStart(5,'0')}.png`;
          fs.writeFileSync(path.join(dir,file),Buffer.from(event.data,'base64'));
          frames.push({file,time:event.metadata.timestamp});
        }
        cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
      };
      cdp.on('Page.screencastFrame',listener);
      const started=Date.now()/1000;
      await cdp.send('Page.startScreencast',{format:'png',maxWidth:824,maxHeight:1648,everyNthFrame:1});
      await delay(200);
      await action();
      // Record a real hold through the scene and its complete dissolve handle.
      const shot=shots.find(s=>s.file===`v2/${name}.mp4`);
      if(!shot)throw new Error(`No story slot for ${name}`);
      await delay(Math.max(0,(shot.duration+DISSOLVE/FPS+0.3)*1000-(Date.now()-started*1000)));
      const ended=Date.now()/1000;accepting=false;
      await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',listener);
      if(!frames.length)throw new Error(`No frames captured: ${name}`);
      const lines=['ffconcat version 1.0'];
      frames.forEach((f,i)=>{lines.push(`file '${f.file}'`,`duration ${Math.max(1/120,(frames[i+1]?.time??ended)-f.time)}`);});
      lines.push(`file '${frames.at(-1).file}'`);
      const manifest=path.join(dir,'frames.ffconcat');fs.writeFileSync(manifest,lines.join('\n'));
      execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',manifest,'-vf','fps=30,scale=824:1648:flags=lanczos','-c:v','libx264','-preset','fast','-crf','14','-g','15','-keyint_min','15','-sc_threshold','0','-bf','0','-pix_fmt','yuv420p','-an','-movflags','+faststart',path.join(output,`${name}.mp4`)],{stdio:'inherit'});
      await page.screenshot({path:path.join(captureRoot,`${name}-end.png`)});
      recordings.push({name,frames:frames.length,seconds:ended-started});
      console.log(`Recorded ${name}: ${(ended-started).toFixed(2)} seconds, ${frames.length} screen frames`);
    }
    await addForm();
    await record('02-create-routine',async()=>{
      await delay(700);await page.getByRole('textbox').pressSequentially('Morning walk',{delay:110});
      await page.getByRole('textbox').blur();await delay(2600);
    });
    await record('03-choose-days',async()=>{
      await delay(650);for(const day of ['Mon','Wed','Fri']){await text(day).click();await delay(700);}
      await delay(650);await text('Create routine').click();await delay(1800);
    });
    await delay(500);await record('01-hero-light',async()=>{await delay(4000);});
    await text('Week').click();await delay(650);
    await record('04-full-week',async()=>{
      await delay(3800);
    });
    // Theme switch happens between takes, never as a dedicated product beat.
    await tap(368,52);await delay(450);await text('Dark').click();await delay(350);
    await tap(42,44);await delay(500);
    await record('05-today',async()=>{
      await delay(250);await text('Today').click();await delay(3600);
    });
    await record('06-complete',async()=>{
      await delay(950);
      const box=await text('Morning walk').boundingBox();
      await tap(354,box.y+14);await delay(3000);
    });
    await record('07-move-today',async()=>{
      await delay(650);
      const box=await text('Evening stretch').boundingBox();
      await page.mouse.move(box.x+70,box.y+12);await page.mouse.down();await delay(600);await page.mouse.up();
      await delay(800);
      await page.getByRole('button',{name:'Switch day',exact:true}).click();
      await delay(900);await text('Tue').click();await delay(1100);
      await text('Move to this day').click();await delay(2000);
    });
    await record('08-move-week',async()=>{
      await delay(180);await text('Week').click();await delay(3900);
    });
    await record('09-progress',async()=>{
      await delay(300);await tap(320,52);await delay(6300);
    });
    const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('@cadence/routines/v2')));
    const moved=data.find(r=>r.title==='Evening stretch');
    if(moved.schedule['2026-09-28'].includes('mon')||!moved.schedule['2026-09-28'].includes('tue'))throw new Error('Move was not persisted');
    if(!data.find(r=>r.title==='Morning walk').doneDates['2026-09-28'])throw new Error('Completion was not persisted');
    const manifest=JSON.stringify({source:'Live Expo web export with illustrative historical fixture requested by user; current actions performed through UI',fixture:'scripts/demo-data.cjs',demoDate,viewport:{width:412,height:824,scale:2},recordings,errors},null,2);
    fs.writeFileSync(path.join(captureRoot,'manifest.json'),manifest);
    fs.writeFileSync(path.join(output,'provenance.json'),manifest);
    if(errors.length)throw new Error(errors.join('\n'));
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
