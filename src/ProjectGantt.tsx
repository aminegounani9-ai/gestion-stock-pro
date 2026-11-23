import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GanttChartSquare, ListChecks } from "lucide-react";
import "./project-gantt.css";
type Task=Record<string,any>&{id:string;project_id:string;title:string;status:string;progress:number;start_date?:string|null;due_date?:string|null;parent_task_id?:string|null};
type Project=Record<string,any>&{id:string;name:string;project_code:string;start_date?:string|null;target_end_date?:string|null};
type Props={tasks:Task[];projects:Project[];lang:"fr"|"en"|"ar";selectedProjectId?:string;onProjectChange?:(id:string)=>void;onOpenTask:(task:Task)=>void};
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
const dateKey=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const parseDate=(value:string)=>{const [y,m,d]=String(value).slice(0,10).split("-").map(Number);return new Date(y,m-1,d);};
const taskColor=(id:string)=>{let hash=0;for(let i=0;i<id.length;i++)hash=(hash*31+id.charCodeAt(i))>>>0;return `hsl(${hash%360} 62% 43%)`;};
const complianceTone=(v:number)=>v<80?"bad":v<100?"mid":"good";
export default function ProjectGantt({tasks,projects,lang,selectedProjectId,onProjectChange,onOpenTask}:Props){
 const [year,setYear]=useState(()=>new Date().getFullYear()),[projectFilter,setProjectFilter]=useState(selectedProjectId||"all"),[clock,setClock]=useState(()=>Date.now());
 const rtl=lang==="ar";
 useEffect(()=>{if(selectedProjectId!==undefined)setProjectFilter(selectedProjectId);},[selectedProjectId]);
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),30000);return()=>window.clearInterval(timer);},[]);
 const l=lang==="en"?{title:"Project calendar · Gantt",sub:"Annual monthly timeline · task duration, progress and schedule compliance",project:"Project",all:"All projects",today:"Current year",task:"Task / planned dates",duration:"Duration",progress:"Progress",compliance:"Compliance",late:"Overdue",empty:"No scheduled tasks for this project. Add a start date and an end date.",days:"d",secondary:"SUBTASK",main:"MAIN TASK",inProgress:"IN PROGRESS",onTrack:"On track",ahead:"Ahead",behind:"Behind schedule"}:lang==="ar"?{title:"تقويم المشاريع · Gantt",sub:"تخطيط سنوي بالشهور · مدة المهام والإنجاز واحترام الآجال",project:"المشروع",all:"كل المشاريع",today:"السنة الحالية",task:"المهمة / التواريخ",duration:"المدة",progress:"الإنجاز",compliance:"الالتزام",late:"متأخرة",empty:"لا توجد مهام مبرمجة لهذا المشروع. أضف تاريخ البداية والنهاية.",days:"ي",secondary:"مهمة فرعية",main:"مهمة رئيسية",inProgress:"قيد التنفيذ",onTrack:"في الوقت",ahead:"متقدمة",behind:"متأخرة"}:{title:"Calendrier projets · Gantt",sub:"Planning annuel par mois · durée, avancement et respect des délais",project:"Projet",all:"Tous les projets",today:"Année actuelle",task:"Tâche / dates prévues",duration:"Durée",progress:"Avancement",compliance:"Conformité",late:"En retard",empty:"Aucune tâche planifiée pour ce projet. Ajoutez une date de début et une date de fin.",days:"j",secondary:"SOUS-TÂCHE",main:"TÂCHE PRINCIPALE",inProgress:"EN COURS",onTrack:"Dans les délais",ahead:"En avance",behind:"En retard"};
 const selectedProject=projects.find(p=>p.id===projectFilter)||null;
 const filtered=useMemo(()=>tasks.filter(t=>(projectFilter==="all"||t.project_id===projectFilter)&&t.start_date&&t.due_date&&t.status!=="cancelled").sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))),[tasks,projectFilter]);
 const yearStart=new Date(year,0,1),yearEnd=new Date(year+1,0,1),totalDays=(yearEnd.getTime()-yearStart.getTime())/86400000;
 const months=useMemo(()=>Array.from({length:12},(_,i)=>({date:new Date(year,i,1),days:new Date(year,i+1,0).getDate()})),[year]);
 const visible=filtered.filter(t=>parseDate(t.due_date!)>=yearStart&&parseDate(t.start_date!)<yearEnd);
 const now=new Date(clock),todayPct=((now.getTime()-yearStart.getTime())/Math.max(1,yearEnd.getTime()-yearStart.getTime()))*100;
 const progressAvg=visible.length?Math.round(visible.reduce((n,t)=>n+clamp(Number(t.progress||0)),0)/visible.length):0;
 const overdue=visible.filter(t=>parseDate(t.due_date!)<now&&Number(t.progress)<100).length;
 const scheduleCompliance=(t:Task)=>{const start=parseDate(t.start_date!).getTime(),end=parseDate(t.due_date!).getTime()+86400000-1,expected=clamp((clock-start)/Math.max(1,end-start)*100);return expected<1?100:Math.round(clamp(Number(t.progress||0))/expected*100);};
 const duration=(t:Task)=>Math.max(1,Math.round((parseDate(t.due_date!).getTime()-parseDate(t.start_date!).getTime())/86400000)+1);
 const fmt=(value:string)=>parseDate(value).toLocaleDateString(lang==="en"?"en-US":lang==="ar"?"ar-DZ":"fr-FR",{day:"2-digit",month:"short"});
 const yearToday=()=>setYear(new Date().getFullYear());
 return <section className="panel pgantt-panel pgantt-year-panel" dir={rtl?"rtl":"ltr"}>
  <div className="pgantt-head"><div className="pgantt-heading"><span className="pgantt-icon"><GanttChartSquare size={19}/></span><div><h3>{l.title}</h3><p>{l.sub}</p></div></div>
   <div className="pgantt-tools"><label className="pgantt-project-filter"><span>{l.project}</span><select value={projectFilter} onChange={e=>{setProjectFilter(e.target.value);onProjectChange?.(e.target.value);}}><option value="all">{l.all}</option>{projects.map(p=><option key={p.id} value={p.id}>{p.project_code?p.project_code+" · ":""}{p.name}</option>)}</select></label>
    <button className="pgantt-today" onClick={yearToday}>{l.today}</button><button className="pgantt-nav" aria-label="Previous year" onClick={()=>setYear(v=>v-1)}><ChevronLeft size={17}/></button><b className="pgantt-period">{year}</b><button className="pgantt-nav" aria-label="Next year" onClick={()=>setYear(v=>v+1)}><ChevronRight size={17}/></button>
   </div>
  </div>
  <div className="pgantt-kpis"><div><span><ListChecks size={15}/>{l.progress}</span><b>{progressAvg}%</b></div><div><span><CalendarDays size={15}/>{l.task}</span><b>{visible.length}</b></div><div><span><Clock3 size={15}/>{l.late}</span><b className={overdue?"is-late":""}>{overdue}</b></div><div><span>{l.compliance}</span><b>{visible.length?Math.round(visible.reduce((n,t)=>n+scheduleCompliance(t),0)/visible.length):0}%</b></div></div>
  {!visible.length?<div className="pgantt-empty"><CalendarDays size={28}/><b>{l.empty}</b></div>:<div className="pgantt-scroll pgantt-year-scroll"><div className="pgantt-year-layout">
   <div className="pgantt-label-head">{l.task}</div><div className="pgantt-year-axis">{months.map(m=><div key={m.date.getMonth()}><b>{m.date.toLocaleDateString(lang==="en"?"en-US":lang==="ar"?"ar-DZ":"fr-FR",{month:"long"})}</b><small>{m.days} {l.days}</small></div>)}</div><div className="pgantt-meta-head">{l.compliance}</div>
   {visible.map(t=>{const start=parseDate(t.start_date!),end=parseDate(t.due_date!),clippedStart=start<yearStart?yearStart:start,clippedEnd=end>=yearEnd?new Date(yearEnd.getTime()-86400000):end;const left=((clippedStart.getTime()-yearStart.getTime())/86400000)/totalDays*100;const width=Math.max(.65,((clippedEnd.getTime()-clippedStart.getTime())/86400000+1)/totalDays*100);const pc=clamp(Number(t.progress||0)),comp=scheduleCompliance(t),secondary=Boolean(t.parent_task_id),inProgress=t.status==="in_progress",color=taskColor(t.id),project=projects.find(p=>p.id===t.project_id);return <div className={"pgantt-year-row"+(secondary?" is-secondary":"")+(inProgress?" is-in-progress":"")} key={t.id}>
    <button className={"pgantt-year-task-label"+(secondary?" child":"")} onClick={()=>onOpenTask(t)}><span className="pgantt-task-type">{secondary?l.secondary:l.main}</span><b>{secondary?"↳ ":""}{t.title}</b><small>{fmt(t.start_date!)} → {fmt(t.due_date!)}{projectFilter==="all"?" · "+(project?.project_code||project?.name||""):""}</small></button>
    <div className="pgantt-year-track">{months.map(m=><i key={m.date.getMonth()} className={m.date.getMonth()%2?"alt":""}/>)}{now>=yearStart&&now<yearEnd&&<i className="pgantt-year-today" style={{left:todayPct+"%"}}/>}
     <button className={"pgantt-year-bar"+(inProgress?" is-live":"")+(secondary?" is-subtask":"")} style={{left:left+"%",width:width+"%","--task-color":color} as React.CSSProperties} onClick={()=>onOpenTask(t)} title={t.title+" · "+fmt(t.start_date!)+" → "+fmt(t.due_date!)+" · "+pc+"% · "+comp+"%"}><span className="pgantt-year-bar-fill" style={{width:pc+"%"}}/><b>{secondary?"↳ ":""}{t.title} <em>{fmt(t.start_date!)} → {fmt(t.due_date!)}</em></b><strong>{pc}%</strong></button>
    </div><div className="pgantt-year-meta"><span>{duration(t)} {l.days}</span><b className={"pgantt-compliance "+complianceTone(comp)}>{comp}%</b></div>
   </div>})}
  </div></div>}
  <div className="pgantt-foot"><span><i className="blue"/>{l.progress}</span><span><i className="green"/>{l.ahead}</span><span><i className="red"/>{l.behind}</span><small>{selectedProject?.name||l.all} · {year} · {visible.length} {lang==="en"?"tasks":lang==="ar"?"مهام":"tâches"}</small></div>
 </section>;
}
