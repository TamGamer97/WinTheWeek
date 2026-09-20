import React from 'react';

/** Device presentation only. The entire application area is a real recording.
 * 448 × 896 content preserves the source's exact 1:2 ratio. Separate 62 px
 * top and 38 px bottom safe areas keep every app pixel clear of hardware.
 */
export function IPhoneFrame({children,dark}:{children:React.ReactNode;dark:boolean}){
  const ink=dark?'#EEEFF2':'#1C1917';
  return <div style={{width:472,height:1020,position:'relative',borderRadius:70,
    background:'linear-gradient(105deg,#A4A6AC 0%,#33353A 2%,#777A81 4%,#202126 8%,#5F6268 92%,#B1B3B8 98%,#303238 100%)',
    boxShadow:dark?'0 36px 80px #00000065,0 0 0 1px #A4ACBC50':'0 34px 75px #1C191735,0 0 0 1px #16171B',
  }}>
    {[{top:151,height:30},{top:215,height:65},{top:299,height:65}].map((button,i)=><div key={i} style={{position:'absolute',left:-4,width:5,borderRadius:2,background:'linear-gradient(90deg,#43454C,#A3A5AA)',...button}}/>)}
    <div style={{position:'absolute',right:-4,top:259,width:5,height:103,borderRadius:2,background:'linear-gradient(90deg,#A3A5AA,#43454C)'}}/>
    <div style={{position:'absolute',inset:4,borderRadius:67,background:'#08090B',boxShadow:'inset 0 0 0 1px #909299'}}/>
    <div style={{position:'absolute',left:12,top:12,width:448,height:996,borderRadius:58,overflow:'hidden',background:dark?'#0D0E11':'#FDFCFB'}}>
      <div style={{position:'absolute',left:29,top:20,fontFamily:'Manrope',fontWeight:600,fontSize:17,lineHeight:1,color:ink}}>9:41</div>
      <div style={{position:'absolute',left:163,top:12,width:122,height:33,borderRadius:22,background:'#050506',boxShadow:'inset 0 0 0 1px #15151A'}}>
        <div style={{position:'absolute',right:11,top:10,width:12,height:12,borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#233343,#080B13 55%,#141823)',boxShadow:'0 0 0 2px #0A0A0D'}}/>
      </div>
      <svg width="70" height="21" viewBox="0 0 70 21" style={{position:'absolute',right:24,top:18,color:ink}}>
        {[5,8,11,14].map((h,i)=><rect key={h} x={i*5} y={18-h} width="3.5" height={h} rx="1" fill="currentColor"/>)}
        <path d="M25 7 Q33 0 41 7 M28 10 Q33 6 38 10 M31 13 Q33 11 35 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        <circle cx="33" cy="16" r="1.2" fill="currentColor"/>
        <rect x="47" y="5" width="19" height="11" rx="3" fill="none" stroke="currentColor" opacity=".55"/>
        <rect x="49" y="7" width="15" height="7" rx="1.5" fill="currentColor"/>
        <rect x="67" y="8" width="2" height="5" rx="1" fill="currentColor" opacity=".55"/>
      </svg>
      <div style={{position:'absolute',left:0,top:62,width:448,height:896,overflow:'hidden'}}>{children}</div>
      <div style={{position:'absolute',bottom:12,left:151,width:146,height:5,borderRadius:4,background:ink}}/>
    </div>
  </div>;
}
