import React,{StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {useProviderControls} from '../../src/features/viewer-provider-controls/model/useProviderControls';
import ProviderControlFeedback from '../../src/features/viewer-provider-controls/components/ProviderControlFeedback';
import {fixture,observed} from './provider-state-feedback-fixture.mjs';

const language=new URLSearchParams(location.search).get('lang')??'en';
function Fixture(){
 const controls=useProviderControls();
 const [dialogHost,setDialogHost]=useState(null),[,refreshFixture]=useState(0);
 useEffect(()=>{fixture.view=controls.view;},[controls.view]);
 useEffect(()=>{setDialogHost(document.querySelector('[data-provider-dialog]'));},[]);
 const state=fixture.snapshot(),run=operation=>{operation();refreshFixture(value=>value+1);};
 const testControls=<details className="mt-4 space-y-3 rounded-xl border border-neutral-300 bg-neutral-50 p-3 text-xs" data-synthetic-test-controls>
  <summary className="cursor-pointer font-bold">Synthetic test controls</summary>
  <p>Only mock responses change. No account, database or message operation.</p>
  <p>Phase: {controls.view.phase}; GET: {state.calls.filter(call=>call.method==='get').length}; SET: {state.calls.filter(call=>call.method==='set').length}; synthetic current block: {state.currentBlock.id}.</p>
  <div className="flex flex-wrap gap-2">
   <button type="button" disabled={state.heldReadQueued||state.heldReadActive||!["uncertain","error"].includes(controls.view.phase)}
    onClick={()=>run(()=>fixture.holdNextRead())} className="min-h-11 rounded-lg border px-3 py-2 disabled:opacity-50">Hold next read</button>
   <button type="button" disabled={!state.heldReadActive} onClick={()=>run(()=>fixture.failHeldRead())}
    className="min-h-11 rounded-lg border px-3 py-2 disabled:opacity-50">Fail held read</button>
   <button type="button" disabled={controls.view.open} onClick={()=>run(()=>fixture.replaceBlock())}
    className="min-h-11 rounded-lg border px-3 py-2 disabled:opacity-50">Replace synthetic block</button>
  </div>
 </details>;
 return <main className="mx-auto max-w-3xl space-y-5 p-5">
  <h1 className="text-xl font-bold">Provider feedback fixture</h1>
  <p>Synthetic API and account. No external service or real user data.</p>
  <button type="button" disabled={!controls.account.ready||!controls.account.actor}
   onClick={()=>controls.session.openBlockRemoval(observed,'Synthetic provider')}
   className="min-h-11 rounded-full border border-neutral-300 bg-white px-5 py-3 font-bold">Open retained block</button>
  <ProviderControlFeedback controls={controls} language={language}/>
  {controls.view.open&&dialogHost?createPortal(testControls,dialogHost):testControls}
 </main>;
}
window.__providerStateFeedback=fixture;
const root=createRoot(document.getElementById('root'));
root.render(<StrictMode><Fixture/></StrictMode>);
window.__providerStateFeedbackUnmount=()=>root.unmount();
