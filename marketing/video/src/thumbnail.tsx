import React from 'react';
import {AbsoluteFill,Composition,Img,registerRoot,staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {IPhoneFrame} from './IPhoneFrame';

loadFont({family:'Outfit',url:staticFile('fonts/Outfit_600SemiBold.ttf'),weight:'600'});
loadFont({family:'Manrope',url:staticFile('fonts/Manrope_400Regular.ttf'),weight:'400'});

const blue='#3B9CFF';

/** Standalone artwork: changing this composition does not change the promo. */
function Thumbnail(){
  return <AbsoluteFill style={{background:'#050608',fontFamily:'Manrope',color:'#FFFFFF',overflow:'hidden'}}>
    <Img src={staticFile('thumbnail/code-bg.png')} style={{position:'absolute',left:-20,top:-20,width:1960,height:1120,objectFit:'cover',filter:'blur(9px) saturate(1.15)',transform:'scale(1.02)'}}/>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(100deg,#03040Ad0 0%,#03040Aa8 26%,#03040A70 48%,#03040A3c 66%,#03040A1c 100%)'}}/>

    <div style={{position:'absolute',left:1420,top:120,width:560,height:560,borderRadius:'50%',background:'radial-gradient(circle,#3B9CFF30,#3B9CFF00 65%)',filter:'blur(10px)',mixBlendMode:'screen'}}/>

    <div style={{position:'absolute',left:122,top:96,display:'flex',alignItems:'center',gap:23}}>
      <Img src={staticFile('brand/icon.png')} style={{width:80,height:80,borderRadius:21,boxShadow:'0 0 24px #2B72FF30'}}/>
      <span style={{fontFamily:'Outfit',fontWeight:600,fontSize:43,letterSpacing:-1.5,color:'#FFFFFF'}}>WinTheWeek</span>
    </div>

    <div style={{position:'absolute',left:122,top:338}}>
      <div style={{fontFamily:'Outfit',fontSize:180,fontWeight:600,letterSpacing:-8,lineHeight:1.02,color:'#FFFFFF'}}>
        Win The<br/><span style={{color:blue,textShadow:`0 0 34px ${blue}80`}}>Week</span>
      </div>
      <div style={{fontSize:36,letterSpacing:-.3,marginTop:46,color:'#C3D2E1',whiteSpace:'nowrap'}}>A little structure. Lasting consistency.</div>
    </div>

    <div style={{position:'absolute',left:1338,top:100,transform:'rotate(5deg) scale(.855)',transformOrigin:'top left',filter:'drop-shadow(0 40px 90px #00000090)'}}>
      <IPhoneFrame dark={false}>
        <Img src={staticFile('thumbnail/today.png')} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
      </IPhoneFrame>
    </div>
  </AbsoluteFill>;
}

registerRoot(()=> <Composition id="WinTheWeekThumbnail" component={Thumbnail} durationInFrames={1} fps={30} width={1920} height={1080}/>);
