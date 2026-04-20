import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  active:   { label: 'Active',   dot: '#10b981', bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  draft:    { label: 'Draft',    dot: '#9ca3af', bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  paused:   { label: 'Paused',   dot: '#f59e0b', bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  closed:   { label: 'Closed',   dot: '#ef4444', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  archived: { label: 'Archived', dot: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
};
const STATUS_ACTIONS = {
  draft: ['publish'], active: ['pause','close'], paused: ['resume','close'], closed: ['archive'], archived: [],
};
const ACTION_CONFIG = {
  publish: { label:'Publish', icon:'▶', color:'#10b981', hoverBg:'#d1fae5', hoverText:'#065f46' },
  pause:   { label:'Pause',   icon:'⏸', color:'#f59e0b', hoverBg:'#fef3c7', hoverText:'#92400e' },
  resume:  { label:'Resume',  icon:'▶', color:'#6366f1', hoverBg:'#e0e7ff', hoverText:'#3730a3' },
  close:   { label:'Close',   icon:'✕', color:'#ef4444', hoverBg:'#fee2e2', hoverText:'#991b1b' },
  archive: { label:'Archive', icon:'📦',color:'#8b5cf6', hoverBg:'#ede9fe', hoverText:'#5b21b6' },
};
const ACTION_TO_STATUS = { publish:'active', pause:'paused', resume:'active', close:'closed', archive:'archived' };
const STATUS_TABS = ['all','active','draft','paused','closed','archived'];

const getDaysAgo = (date) => {
  const diff = Math.ceil(Math.abs(new Date() - new Date(date)) / 864e5);
  if (diff <= 1) return 'Today';
  if (diff < 7)  return `${diff}d ago`;
  if (diff < 30) return `${Math.ceil(diff/7)}w ago`;
  return `${Math.ceil(diff/30)}mo ago`;
};
const getDeadlineStatus = (deadline) => {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline) - new Date()) / 864e5);
  if (days < 0)   return { label:'Expired',       color:'#ef4444', bg:'#fee2e2' };
  if (days === 0) return { label:'Expires today',  color:'#f59e0b', bg:'#fef3c7' };
  if (days <= 3)  return { label:`${days}d left`,  color:'#f59e0b', bg:'#fef3c7' };
  if (days <= 7)  return { label:`${days}d left`,  color:'#6366f1', bg:'#e0e7ff' };
  return           { label:`${days}d left`,        color:'#10b981', bg:'#d1fae5' };
};
const avatarColor = (name='') => {
  const cs=['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#0ea5e9','#ef4444'];
  let h=0; for(const c of name) h=c.charCodeAt(0)+((h<<5)-h);
  return cs[Math.abs(h)%cs.length];
};

function ConfirmDialog({ action, jobTitle, onConfirm, onCancel, isLoading }) {
  useEffect(() => {
    const fn = (e) => { if (e.key==='Escape') onCancel(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onCancel]);
  const cfg = ACTION_CONFIG[action]||{};
  const MESSAGES = {
    publish:'This will make the job visible to candidates and open for applications.',
    pause:'Candidates will no longer see this job until you resume it.',
    resume:'The job will become visible to candidates again.',
    close:'No more applications will be accepted. This is difficult to undo.',
    archive:'The job will be moved to archives and hidden from all views.',
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <motion.div initial={{opacity:0,scale:0.95,y:8}} animate={{opacity:1,scale:1,y:0}}
        exit={{opacity:0,scale:0.95,y:8}} transition={{duration:0.18,ease:[0.22,1,0.36,1]}}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl"
          style={{backgroundColor:cfg.hoverBg}}>{cfg.icon}</div>
        <h2 className="text-lg font-black text-gray-900 text-center mb-1">{cfg.label} this job?</h2>
        <p className="text-sm font-bold text-gray-700 text-center mb-2 truncate px-2">"{jobTitle}"</p>
        <p className="text-xs text-gray-400 text-center mb-6 px-4">{MESSAGES[action]}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition"
            style={{backgroundColor:cfg.color}}>
            {isLoading?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Working…</>:<>{cfg.icon} {cfg.label}</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status]||STATUS_CONFIG.draft;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
      style={{background:cfg.bg,color:cfg.text,border:`1px solid ${cfg.border}`}}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:cfg.dot}}/>
      {cfg.label}
    </span>
  );
}

function JobCard({ job, onAction, actionLoading, index }) {
  const color=avatarColor(job.title||''), deadline=getDeadlineStatus(job.applicationDeadline);
  const actions=STATUS_ACTIONS[job.status]||[], appCount=job.applicationCount??job.applicationsCount??0;
  const canEdit=['draft','active','paused'].includes(job.status);
  return (
    <motion.div layout initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8,scale:0.98}}
      transition={{duration:0.35,delay:index*0.04,ease:[0.22,1,0.36,1]}}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm" style={{background:color}}>
            {(job.title||'J').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate leading-snug">{job.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                  {job.location&&<><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg><span className="truncate">{job.location}</span><span className="shrink-0">·</span></>}
                  <span className="shrink-0">{getDaysAgo(job.createdAt)}</span>
                </p>
              </div>
              <StatusBadge status={job.status}/>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {job.jobType&&<span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md capitalize">{job.jobType.replace('-',' ')}</span>}
              {job.experienceLevel&&<span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-600 rounded-md capitalize">{job.experienceLevel}</span>}
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-600 rounded-md">{appCount} applicant{appCount!==1?'s':''}</span>
              {deadline&&<span className="px-2 py-0.5 text-xs font-semibold rounded-md" style={{background:deadline.bg,color:deadline.color}}>{deadline.label}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {actions.map(action=>{
              const acfg=ACTION_CONFIG[action], isLoading=actionLoading===`${job._id}-${action}`;
              return (
                <motion.button key={action} whileTap={{scale:0.95}} onClick={()=>onAction(job,action)} disabled={!!actionLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all disabled:opacity-40"
                  style={{borderColor:acfg.color+'40',color:acfg.color,backgroundColor:'transparent'}}
                  onMouseEnter={e=>{e.currentTarget.style.backgroundColor=acfg.hoverBg;e.currentTarget.style.color=acfg.hoverText;}}
                  onMouseLeave={e=>{e.currentTarget.style.backgroundColor='transparent';e.currentTarget.style.color=acfg.color;}}>
                  {isLoading?<div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"/>:<span className="text-[10px]">{acfg.icon}</span>}
                  {acfg.label}
                </motion.button>
              );
            })}
            {actions.length===0&&<span className="text-xs text-gray-300 italic">No actions available</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link to={`/recruiter/jobs/${job._id}`} title="View" className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </Link>
            {canEdit&&<Link to={`/recruiter/jobs/${job._id}/edit`} title="Edit" className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </Link>}
            <Link to={`/recruiter/candidates?jobId=${job._id}`} title="Applicants" className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatsBar({ jobs }) {
  const counts=jobs.reduce((acc,j)=>{acc[j.status]=(acc[j.status]||0)+1;return acc;},{});
  const stats=[
    {label:'Total',value:jobs.length,accent:'#6366f1'},{label:'Active',value:counts.active||0,accent:'#10b981'},
    {label:'Draft',value:counts.draft||0,accent:'#9ca3af'},{label:'Paused',value:counts.paused||0,accent:'#f59e0b'},
    {label:'Closed',value:counts.closed||0,accent:'#ef4444'},{label:'Archived',value:counts.archived||0,accent:'#8b5cf6'},
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
      {stats.map((s,i)=>(
        <motion.div key={s.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
          transition={{duration:0.4,delay:i*0.04,ease:[0.22,1,0.36,1]}}
          className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <p className="text-xl font-black" style={{color:s.accent}}>{s.value}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState({ filter, onClear }) {
  const isFiltered=filter!=='all';
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">{isFiltered?'🔍':'💼'}</div>
      <h3 className="text-base font-bold text-gray-800 mb-1">{isFiltered?`No ${filter} jobs`:'No jobs posted yet'}</h3>
      <p className="text-sm text-gray-400 mb-5 max-w-xs">{isFiltered?`You don't have any jobs with "${filter}" status.`:'Post your first job to start receiving applications.'}</p>
      {isFiltered
        ?<button onClick={onClear} className="px-4 py-2 text-sm font-bold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition">Show all jobs</button>
        :<Link to="/recruiter/jobs/create" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Post Your First Job</Link>
      }
    </div>
  );
}

export default function ViewAllJobs() {
  const [jobs,setJobs]=useState([]), [isLoading,setIsLoading]=useState(true);
  const [searchTerm,setSearchTerm]=useState(''), [activeTab,setActiveTab]=useState('all');
  const [sortBy,setSortBy]=useState('newest'), [actionLoading,setActionLoading]=useState(null);
  const [confirm,setConfirm]=useState(null);

  const loadJobs=useCallback(async()=>{
    try {
      setIsLoading(true);
      const res=await jobsAPI.getMyJobs({limit:200});
      const list=res?.data?.data??res?.data?.jobs??[];
      setJobs(Array.isArray(list)?list:[]);
    } catch(err) {
      console.error('ViewAllJobs load error:',err);
      toast.error(err?.response?.data?.message||'Failed to load jobs');
    } finally { setIsLoading(false); }
  },[]);

  useEffect(()=>{loadJobs();},[loadJobs]);

  const filtered=jobs
    .filter(j=>{
      const matchesTab=activeTab==='all'||j.status===activeTab;
      const q=searchTerm.toLowerCase();
      const matchesSearch=!q||j.title?.toLowerCase().includes(q)||j.location?.toLowerCase().includes(q)||j.company?.name?.toLowerCase().includes(q);
      return matchesTab&&matchesSearch;
    })
    .sort((a,b)=>{
      if(sortBy==='newest') return new Date(b.createdAt)-new Date(a.createdAt);
      if(sortBy==='oldest') return new Date(a.createdAt)-new Date(b.createdAt);
      if(sortBy==='applications') return (b.applicationCount??0)-(a.applicationCount??0);
      if(sortBy==='deadline') return new Date(a.applicationDeadline||0)-new Date(b.applicationDeadline||0);
      return 0;
    });

  const handleAction=(job,action)=>setConfirm({job,action});

  const executeAction=async()=>{
    if(!confirm) return;
    const {job,action}=confirm;
    setActionLoading(`${job._id}-${action}`);
    setConfirm(null);
    try {
      await jobsAPI.lifecycleAction(job._id,action);
      const verb=action==='publish'?'published':action==='archive'?'archived':action+'d';
      toast.success(`Job ${verb} successfully`);
      setJobs(prev=>prev.map(j=>j._id===job._id?{...j,status:ACTION_TO_STATUS[action]}:j));
    } catch(err) {
      console.error(err);
      toast.error(err?.response?.data?.message||`Failed to ${action} job`);
      loadJobs();
    } finally { setActionLoading(null); }
  };

  if(isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"/>
        <p className="text-sm text-gray-400">Loading your jobs…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap'); .vaj-root{font-family:'DM Sans',sans-serif;}`}</style>
      <div className="vaj-root max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Recruiter</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Job Management</h1>
            <p className="text-sm text-gray-400 mt-1">{jobs.length} job{jobs.length!==1?'s':''} total</p>
          </div>
          <Link to="/recruiter/jobs/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 hover:-translate-y-0.5 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Post New Job
          </Link>
        </motion.div>

        {jobs.length>0&&<StatsBar jobs={jobs}/>}

        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.1,ease:[0.22,1,0.36,1]}} className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search by title, location, or company…"
              className="w-full pl-10 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-gray-900 placeholder:text-gray-300 font-medium transition"/>
            {searchTerm&&<button onClick={()=>setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-700 shrink-0">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="applications">Most applications</option>
            <option value="deadline">Deadline soonest</option>
          </select>
        </motion.div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4,delay:0.15}}
          className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 overflow-x-auto">
          {STATUS_TABS.map(tab=>{
            const count=tab==='all'?jobs.length:jobs.filter(j=>j.status===tab).length;
            const isActive=activeTab===tab;
            return (
              <button key={tab} onClick={()=>setActiveTab(tab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                style={{backgroundColor:isActive?'#6366f1':'transparent',color:isActive?'#fff':'#6b7280'}}>
                <span className="capitalize">{tab}</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black" style={{backgroundColor:isActive?'rgba(255,255,255,0.25)':'#f3f4f6',color:isActive?'#fff':'#9ca3af'}}>{count}</span>
              </button>
            );
          })}
        </motion.div>

        {filtered.length===0
          ?<EmptyState filter={activeTab} onClear={()=>{setActiveTab('all');setSearchTerm('');}}/>
          :<motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((job,i)=><JobCard key={job._id} job={job} index={i} onAction={handleAction} actionLoading={actionLoading}/>)}
            </AnimatePresence>
          </motion.div>
        }
        {searchTerm&&filtered.length>0&&<p className="text-xs text-gray-400 text-center mt-6">{filtered.length} result{filtered.length!==1?'s':''} for "{searchTerm}"</p>}
      </div>

      <AnimatePresence>
        {confirm&&<ConfirmDialog action={confirm.action} jobTitle={confirm.job.title} onConfirm={executeAction} onCancel={()=>setConfirm(null)} isLoading={!!actionLoading}/>}
      </AnimatePresence>
    </div>
  );
}