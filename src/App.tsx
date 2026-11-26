import { lazy, Suspense, useMemo, useRef, useState, type RefObject } from 'react'
import { Check, ChevronRight, Download, FileText, Filter, Menu, Moon, PanelLeftClose, Plus, Search, Settings, Sun, Trash2, Upload, X, Copy, RotateCcw, Pencil } from 'lucide-react'
import { sheets as predefinedSheets } from './data/sheets'
import { useLearningData, validateBackup } from './hooks/useLearningData'
import type { ActiveView, CustomSheet, LearningState, NoteBlock, SheetTopic } from './types'
import { exportBackup, readBackupFile } from './services/backup'
import './App.css'
import './social.css'
import './notes.css'

const CodeEditor=lazy(()=>import('./components/CodeEditor'))
import './feedback.css'

function ProgressBar({ value }: { value: number }) { return <div className="progress-track"><div className="progress-fill" style={{ width: `${value}%` }} /></div> }
function ConfirmModal({ title, message, keyword, onConfirm, onCancel }: { title:string; message:string; keyword?:'delete'|'reset'; onConfirm:()=>void; onCancel:()=>void }) { const [text,setText]=useState(''); const actionLabel = keyword === 'delete' ? 'Delete' : keyword === 'reset' ? 'Reset' : 'Continue'; return <div className="modal-backdrop"><div className="confirm-modal" role="dialog" aria-modal="true"><h3>{title}</h3><p>{message}</p>{keyword && <label className="confirm-input"><span>Type <b>{keyword}</b> to continue</span><input value={text} onChange={e=>setText(e.target.value)} autoFocus /></label>}<div className="modal-actions"><button className="button ghost" onClick={onCancel}>Cancel</button><button className="button danger" disabled={!!keyword && text !== keyword} onClick={onConfirm}>{actionLabel}</button></div></div></div> }

export default function App() {
  const { state, setTheme, toggleTopic, setNotes, reset, replace, update } = useLearningData()
  const [view,setView]=useState<ActiveView>('dashboard')
  const [collapsed,setCollapsed]=useState(false)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState<'all'|'completed'|'incomplete'>('all')
  const [noteTopic,setNoteTopic]=useState<SheetTopic|null>(null)
  const [toast,setToast]=useState('')
  const toastTimer=useRef<number | undefined>(undefined)
  const [dialog,setDialog]=useState<{title:string;message:string;keyword?:'delete'|'reset';action:()=>void}|null>(null)
  const [sheetModal,setSheetModal]=useState<'create'|'rename'|null>(null)
  const [sheetModalId,setSheetModalId]=useState<string|null>(null)
  const importRef=useRef<HTMLInputElement>(null)

  const allSheets = useMemo<any[]>(() => {
    const predefined = predefinedSheets.map(base => {
      const override=state.sheetOverrides[base.id]
      return { ...base, name: override?.name ?? base.name, description: override?.description, topics: override?.topics ?? base.topics, deleted: !!override?.deleted }
    }).filter(s=>!s.deleted)
    const custom = state.customSheets.map(s=>({ ...s, shortName:s.name, deleted:false }))
    return [...predefined, ...custom]
  }, [state.sheetOverrides,state.customSheets])

  const totalTopics=allSheets.reduce((n:number,s:any)=>n+s.topics.length,0)
  const completed=allSheets.reduce((n:number,s:any)=>n+s.topics.filter((t:SheetTopic)=>state.completed[t.id]).length,0)
  const overall=totalTopics?Math.round(completed/totalTopics*100):0
  const sheet=typeof view==='string'&&view!== 'dashboard'&&view!=='settings'?allSheets.find(s=>s.id===view):undefined
  const progress=(s:any)=>{const c=s.topics.filter((t:SheetTopic)=>state.completed[t.id]).length;return {c,total:s.topics.length,p:s.topics.length?Math.round(c/s.topics.length*100):0}}
  const navigate=(id:ActiveView)=>{setView(id);setSearch('');setFilter('all');setMobileOpen(false)}
  const notify=(message:string)=>{setToast(message);if(toastTimer.current)window.clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),4000)}

  const handleImport=async(file?:File)=>{if(!file)return;try{const data=await readBackupFile(file);if(!validateBackup(data))throw new Error('This is not a valid emel backup');setDialog({title:'Import backup?',message:'This replaces all current sheets, progress, notes, and settings.',action:()=>{replace(data);notify('Backup imported successfully')}})}catch(e){notify(e instanceof Error?e.message:'Could not import the backup')}}
  const createSheet=(name:string,description:string,topics:string[])=>{const id=`custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;const sheet:CustomSheet={id,name,description,topics:topics.map((title,i)=>({id:`${id}-topic-${i}-${Math.random().toString(36).slice(2)}`,title}))};update(s=>({...s,customSheets:[...s.customSheets,sheet]}));navigate(id)}
  const renameOrRenameSheet=(id:string,name:string,description:string)=>{if(id.startsWith('custom-'))update(s=>({...s,customSheets:s.customSheets.map(x=>x.id===id?{...x,name,description}:x)}));else update(s=>({...s,sheetOverrides:{...s.sheetOverrides,[id]:{name,description,topics:s.sheetOverrides[id]?.topics ?? predefinedSheets.find(x=>x.id===id)?.topics ?? [],deleted:s.sheetOverrides[id]?.deleted}}}))}
  const deleteSheet=(id:string)=>{const sheetToDelete=allSheets.find(x=>x.id===id);update(s=>{const completed={...s.completed};const notes={...s.notes};sheetToDelete?.topics.forEach((topic:SheetTopic)=>{delete completed[topic.id];delete notes[topic.id]});if(id.startsWith('custom-'))return {...s,completed,notes,customSheets:s.customSheets.filter(x=>x.id!==id)};return {...s,completed,notes,sheetOverrides:{...s.sheetOverrides,[id]:{name:s.sheetOverrides[id]?.name??predefinedSheets.find(x=>x.id===id)?.name??'Sheet',topics:s.sheetOverrides[id]?.topics??predefinedSheets.find(x=>x.id===id)?.topics??[],deleted:true}}}});navigate('dashboard');notify('Sheet has been deleted successfully')}
  const setPredefinedTopics=(id:string,topics:SheetTopic[])=>update(s=>({...s,sheetOverrides:{...s.sheetOverrides,[id]:{name:s.sheetOverrides[id]?.name??predefinedSheets.find(x=>x.id===id)?.name??'Sheet',description:s.sheetOverrides[id]?.description,topics,deleted:s.sheetOverrides[id]?.deleted}}}))
  const setCustomTopics=(id:string,topics:SheetTopic[])=>update(s=>({...s,customSheets:s.customSheets.map(x=>x.id===id?{...x,topics}:x)}))
  const addTopic=(id:string,title:string)=>{if(!title.trim())return;const topic={id:`${id}-topic-${Date.now()}-${Math.random().toString(36).slice(2)}`,title:title.trim()};if(id.startsWith('custom-')){const sh=state.customSheets.find(x=>x.id===id);if(sh)setCustomTopics(id,[...sh.topics,topic])}else{const sh=allSheets.find(x=>x.id===id);if(sh)setPredefinedTopics(id,[...sh.topics,topic])}}
  const resetCurrentSheet=(id:string)=> {
    const topicIds = (allSheets.find((item: any) => item.id === id)?.topics as SheetTopic[] | undefined)?.map((topic: SheetTopic) => topic.id) ?? []
    update(current => {
      const completed = { ...current.completed }
      const notes = { ...current.notes }
      topicIds.forEach((topicId: string) => {
        delete completed[topicId]
        delete notes[topicId]
      })
      return { ...current, completed, notes }
    })
    notify('Progress has been reset successfully')
  }
  const confirmResetAll=()=>setDialog({
    title:'Reset all progress?',
    message:'This clears every checkbox and every note across emel.',
    keyword:'reset',
    action:()=>{reset();notify('Progress has been reset successfully')},
  })
  const editTopic=(topic:SheetTopic,title:string)=>{if(!sheet)return;const topics=sheet.topics.map((t:SheetTopic)=>t.id===topic.id?{...t,title}:t);if(sheet.id.startsWith('custom-'))setCustomTopics(sheet.id,topics);else setPredefinedTopics(sheet.id,topics)}
  return <div className={`app-shell ${collapsed?'collapsed':''}`}>
    <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
      <div className="brand-row"><button className="brand" onClick={()=>{setCollapsed(false);navigate('dashboard')}}><img src="/logo.svg" alt=""/><span>emel</span></button><button className="icon-button collapse-button" onClick={()=>setCollapsed(v=>!v)}><PanelLeftClose size={18}/></button></div>
      <nav><button className={view==='dashboard'?'nav-item active':'nav-item'} onClick={()=>navigate('dashboard')}><svg className="dashboard-nav-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1.25" y="1.25" width="6.25" height="6.25" rx="1.4" fill="currentColor"/><rect x="10.5" y="1.25" width="6.25" height="6.25" rx="1.4" fill="currentColor"/><rect x="1.25" y="10.5" width="6.25" height="6.25" rx="1.4" fill="currentColor"/><rect x="10.5" y="10.5" width="6.25" height="6.25" rx="1.4" fill="currentColor"/></svg><span>Dashboard</span></button>{allSheets.map(s=><button key={s.id} className={view===s.id?'nav-item active':'nav-item'} onClick={()=>navigate(s.id)} title={s.name}><FileText size={18}/><span>{s.name}</span></button>)}</nav>
      <button className="nav-item create-sheet" onClick={()=>setSheetModal('create')}><Plus size={18}/><span>Create Sheet</span></button>
      <button className={view==='settings'?'nav-item settings active':'nav-item settings'} onClick={()=>navigate('settings')}><Settings size={18}/><span>Settings / Backup</span></button>
      <footer className="sidebar-footer">
        <span>Connect me on</span>
        <div className="social-links">
          <a href="https://www.linkedin.com/in/abul-jaish-a57934286/" target="_blank" rel="noreferrer" aria-label="Abul Jaish on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 3.5a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2ZM3.4 9h3.7v11.6H3.4V9Zm5.9 0h3.5v1.6h.1c.5-.9 1.7-2 3.6-2 3.8 0 4.5 2.5 4.5 5.7v6.3h-3.7V15c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9v5.7H9.3V9Z"/></svg></a>
          <a href="https://github.com/abuljaish" target="_blank" rel="noreferrer" aria-label="Abul Jaish on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.08-.69.08-.69 1.12.08 1.72 1.15 1.72 1.15 1 1.72 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.13-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.16 1.78 1.16 3 0 4.3-2.62 5.25-5.11 5.52.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg></a>
        </div>
      </footer>
    </aside>{mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div className="topbar-brand" aria-label="emel"><span className="wordmark-e">e</span><span className="wordmark-m">m</span><span className="wordmark-e">e</span><span className="wordmark-l">l</span></div><button className="icon-button" onClick={()=>setTheme(state.theme==='light'?'dark':'light')} aria-label="Toggle theme">{state.theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button></header>
      {view==='dashboard'&&<div className="content dashboard"><div className="page-heading"><div><p className="eyebrow">Overview</p><h1>Your learning tracker</h1><p className="tagline">Create learning sheets, organize topics, track completed topics, take notes, and monitor your study progress.</p></div><div className="dashboard-actions"><button className="button dashboard-create-sheet" onClick={()=>setSheetModal('create')}><Plus size={16}/>Create Sheet</button><button className="button secondary" onClick={()=>navigate(allSheets.find(s=>progress(s).c<progress(s).total)?.id??allSheets[0]?.id??'settings')}>Continue learning <ChevronRight size={16}/></button></div></div>
        <section className="overall-card"><div><p>Overall progress</p><strong>{overall}%</strong><span>{completed} of {totalTopics} topics completed</span></div><div className="overall-bar"><ProgressBar value={overall}/></div></section>
        <section className="sheet-grid">{allSheets.map(s=>{const p=progress(s);return <button className="sheet-card" key={s.id} onClick={()=>navigate(s.id)}><div className="sheet-card-top"><div className="sheet-icon">{s.name.split(' ').map((w:string)=>w[0]).slice(0,2).join('')}</div><ChevronRight size={18}/></div><h2>{s.name}</h2>{s.description&&<p className="sheet-description">{s.description}</p>}<div className="sheet-stat"><strong>{p.c}</strong><span> / {p.total} completed</span></div><ProgressBar value={p.p}/><div className="sheet-percent">{p.p}% complete</div></button>})}</section>
      </div>}
      {sheet&&<SheetPage sheet={sheet} state={state} progress={progress(sheet)} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} toggleTopic={toggleTopic} setNoteTopic={setNoteTopic} addTopic={addTopic} updateSheet={(name:string,description:string)=>renameOrRenameSheet(sheet.id,name,description)} deleteSheet={()=>setDialog({title:`Delete ${sheet.name}?`,message:'This permanently removes the sheet, its topics, progress, and notes.',keyword:'delete',action:()=>deleteSheet(sheet.id)})} resetProgress={()=>setDialog({title:'Reset progress?',message:`This resets every checkbox and all notes in ${sheet.name}.`,keyword:'reset',action:()=>resetCurrentSheet(sheet.id)})} editTopic={editTopic}/>}
      {view==='settings'&&<SettingsPage state={state} setTheme={setTheme} importRef={importRef} handleImport={handleImport} resetAll={confirmResetAll}/>}
    </main>
    {toast&&<div className="success-toast" role="status" aria-live="polite"><Check size={17}/>{toast}</div>}
    {sheetModal&&<SheetModal mode={sheetModal} sheet={sheetModalId?allSheets.find(s=>s.id===sheetModalId):undefined} onClose={()=>{setSheetModal(null);setSheetModalId(null)}} onCreate={createSheet} onRename={renameOrRenameSheet}/>} 
    {noteTopic&&<NotesPanel topic={noteTopic} blocks={state.notes[noteTopic.id]??[]} onClose={()=>setNoteTopic(null)} onSave={b=>setNotes(noteTopic.id,b)} />}
    {dialog&&<ConfirmModal title={dialog.title} message={dialog.message} keyword={dialog.keyword} onCancel={()=>setDialog(null)} onConfirm={()=>{const action=dialog.action;setDialog(null);action()}}/>}
  </div>
}

function SheetPage({sheet,state,progress,search,setSearch,filter,setFilter,toggleTopic,setNoteTopic,addTopic,updateSheet,deleteSheet,resetProgress,editTopic}:any){
 const [manage,setManage]=useState(false);const [adding,setAdding]=useState(false);const [newTopic,setNewTopic]=useState('');const [editing,setEditing]=useState<string|null>(null);const [editTitle,setEditTitle]=useState('');
 const [renaming,setRenaming]=useState(false);const [sheetName,setSheetName]=useState(sheet.name);const [sheetDescription,setSheetDescription]=useState(sheet.description??'');
 const rename=()=>{setSheetName(sheet.name);setSheetDescription(sheet.description??'');setRenaming(true)}
 const visible=sheet.topics.filter((t:SheetTopic)=>t.title.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||(filter==='completed'?state.completed[t.id]:!state.completed[t.id])))
 return <div className="content sheet-page"><div className="page-heading sheet-heading"><div><p className="eyebrow">Learning sheet</p><h1>{sheet.name}</h1>{sheet.description&&<p className="sheet-description-inline">{sheet.description}</p>}</div><div className="heading-actions"><div className="heading-progress"><strong>{progress.p}%</strong><span>{progress.c} of {progress.total} completed</span></div><button className="button ghost" onClick={resetProgress}><RotateCcw size={15}/>Reset progress</button><button className="icon-button delete-sheet-icon" onClick={deleteSheet} title="Delete sheet" aria-label="Delete sheet"><Trash2 size={18}/></button><button className="icon-button" onClick={()=>setManage(v=>!v)} title="Manage sheet"><Pencil size={16}/></button></div></div><ProgressBar value={progress.p}/>
 {renaming&&<form className="sheet-rename-form" onSubmit={e=>{e.preventDefault();if(sheetName.trim()){updateSheet(sheetName.trim(),sheetDescription.trim());setRenaming(false)}}}><label>Sheet name<input value={sheetName} onChange={e=>setSheetName(e.target.value)} autoFocus required/></label><label>Description<input value={sheetDescription} onChange={e=>setSheetDescription(e.target.value)} placeholder="Description (optional)"/></label><button className="button primary" type="submit">Save changes</button><button className="button ghost" type="button" onClick={()=>setRenaming(false)}>Cancel</button></form>}
 {manage&&<div className="sheet-manager"><button className="button ghost" onClick={rename}><Pencil size={15}/>Rename sheet</button><button className="button secondary" onClick={()=>setAdding(v=>!v)}><Plus size={15}/>Add topic</button></div>}
 {adding&&<form className="add-topic-row" onSubmit={e=>{e.preventDefault();addTopic(sheet.id,newTopic);setNewTopic('');setAdding(false)}}><input value={newTopic} onChange={e=>setNewTopic(e.target.value)} placeholder="New topic title" autoFocus/><button className="button primary" type="submit">Add topic</button></form>}
 {sheet.topics.length===0?<div className="empty-state"><FileText size={28}/><h2>This sheet has no topics</h2><p>Use Add topic to add your first topic.</p></div>:<><div className="topic-controls"><label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics"/></label><label className="filter-box"><Filter size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All topics</option><option value="completed">Completed</option><option value="incomplete">Incomplete</option></select></label></div><div className="topic-list">{visible.map((topic:SheetTopic)=><div className={`topic-row ${state.completed[topic.id]?'completed':''}`} key={topic.id}><label className="topic-title"><input type="checkbox" checked={!!state.completed[topic.id]} onChange={()=>toggleTopic(topic.id)}/><span className="custom-check"><Check size={13}/></span><span>{topic.number?<b>{topic.number}. </b>:null}{topic.title}</span></label><div className="topic-actions">{editing===topic.id?<><input className="topic-edit-input" aria-label="Edit topic title" value={editTitle} onChange={e=>setEditTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&editTitle.trim()){editTopic(topic,editTitle.trim());setEditing(null)}if(e.key==='Escape')setEditing(null)}} autoFocus/><button className="button primary topic-save" onClick={()=>{if(editTitle.trim())editTopic(topic,editTitle.trim());setEditing(null)}}>Save</button><button className="button ghost topic-save" onClick={()=>setEditing(null)}>Cancel</button></>:<><button className="icon-button small" title="Edit topic" onClick={()=>{setEditing(topic.id);setEditTitle(topic.title)}}><Pencil size={14}/></button><button className="notes-button" onClick={()=>setNoteTopic(topic)}>Notes</button></>}</div></div>)}</div></>}</div>
}

function SheetModal({mode,sheet,onClose,onCreate,onRename}:any){const [name,setName]=useState(sheet?.name??'');const [description,setDescription]=useState(sheet?.description??'');const [topics,setTopics]=useState('');return <div className="modal-backdrop"><form className="sheet-modal" onSubmit={e=>{e.preventDefault();if(!name.trim())return;if(mode==='create')onCreate(name.trim(),description.trim(),topics.split('\n').map((t:string)=>t.trim()).filter(Boolean));else onRename(sheet.id,name.trim(),description.trim());onClose()}}><div className="sheet-modal-header"><div><p>{mode==='create'?'New sheet':'Sheet details'}</p><h2>{mode==='create'?'Create a custom sheet':'Rename sheet'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></div><label>Sheet name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. My JavaScript Course"/></label><label>Description <span>(optional)</span><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What are you learning?"/></label>{mode==='create'&&<label>Topics <span>(one per line)</span><textarea value={topics} onChange={e=>setTopics(e.target.value)} placeholder={'Introduction\nVariables and types\nFunctions'}/></label>}<div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button type="submit" className="button primary">{mode==='create'?'Create sheet':'Save changes'}</button></div></form></div>}

function SettingsPage({state,setTheme,importRef,handleImport,resetAll}: {state:LearningState,setTheme:(t:'light'|'dark')=>void,importRef:RefObject<HTMLInputElement|null>,handleImport:(f?:File)=>void,resetAll:()=>void}){return <div className="content settings-page"><div className="page-heading"><div><p className="eyebrow">Preferences</p><h1>Settings / Backup</h1></div></div><section className="settings-card"><h2>Appearance</h2><div className="setting-row"><div><strong>Theme</strong><p>Choose a light or dark interface.</p></div><div className="segmented"><button className={state.theme==='light'?'active':''} onClick={()=>setTheme('light')}><Sun size={15}/>Light</button><button className={state.theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Moon size={15}/>Dark</button></div></div></section><section className="settings-card"><h2>Manual backup</h2><div className="setting-row"><div><strong>Export or import a backup</strong><p>Backup includes sheets, topics, progress, notes, and settings.</p></div></div><div className="button-row"><button className="button secondary" onClick={()=>exportBackup(state)}><Download size={16}/>Export backup</button><button className="button ghost" onClick={()=>importRef.current?.click()}><Upload size={16}/>Import / Restore backup</button><input ref={importRef} className="hidden-input" type="file" accept="application/json" onChange={e=>{handleImport(e.target.files?.[0]);e.target.value=''}}/></div></section><section className="settings-card danger-card"><h2>Reset</h2><div className="setting-row"><div><strong>Reset all progress</strong><p>Clear every checkbox and note.</p></div><button className="button danger" onClick={resetAll}><RotateCcw size={16}/>Reset</button></div></section></div>}

function NotesPanel({topic,blocks,onClose,onSave}:{topic:SheetTopic;blocks:NoteBlock[];onClose:()=>void;onSave:(b:NoteBlock[])=>void}){
  const [draft,setDraft]=useState(blocks)
  const [saving,setSaving]=useState(false)
  const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`
  const update=(id:string,text:string)=>{const next=draft.map(b=>b.id===id?{...b,text} as NoteBlock:b);setDraft(next);onSave(next);setSaving(true);setTimeout(()=>setSaving(false),350)}
  const add=(type:NoteBlock['type'])=>{const next=[...draft,{id:uid(),type,text:''} as NoteBlock];setDraft(next);onSave(next)}
  const remove=(id:string)=>{const next=draft.filter(b=>b.id!==id);setDraft(next);onSave(next)}
  return <div className="notes-backdrop" onClick={onClose}><aside className="notes-panel" onClick={event=>event.stopPropagation()}>
    <div className="notes-header"><div><p>Topic notes</p><h2>{topic.title}</h2></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>
    <div className="notes-save"><span className={saving?'pulse':''}/>{saving?'Saving…':'Saved automatically'}</div>
    <div className="note-blocks">{draft.map(block=><div className={`note-block ${block.type}`} key={block.id}>
      {block.type==='heading'?<><input className="heading-input" value={block.text} onChange={e=>update(block.id,e.target.value)} placeholder="Heading"/><button className="block-delete" onClick={()=>remove(block.id)} aria-label="Delete heading block"><Trash2 size={15}/></button></>:block.type==='code'?<>
        <div className="code-toolbar"><button className="copy-code" onClick={()=>navigator.clipboard?.writeText(block.text)} aria-label="Copy code" title="Copy code"><Copy size={15}/></button><button className="block-delete code-delete" onClick={()=>remove(block.id)} aria-label="Delete code block" title="Delete code block"><Trash2 size={15}/></button></div>
        <Suspense fallback={<div className="code-editor" aria-label="Loading code editor"/>}><CodeEditor value={block.text} onChange={text=>update(block.id,text)}/></Suspense>
      </>:<>
        <textarea className="text-input" value={block.text} onChange={e=>update(block.id,e.target.value)} placeholder="Write a note…"/>
        <button className="block-delete" onClick={()=>remove(block.id)} aria-label="Delete note block"><Trash2 size={15}/></button>
      </>}
    </div>)}{draft.length===0&&<div className="note-empty">Add a heading, text, or code block to begin.</div>}</div>
    <div className="add-blocks"><button onClick={()=>add('heading')}><Plus size={15}/>Heading</button><button onClick={()=>add('text')}><Plus size={15}/>Text</button><button onClick={()=>add('code')}><Plus size={15}/>Code</button></div>
  </aside></div>
}
