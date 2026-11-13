import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import ListingSearchPage from '../../src/features/public-listing-search/components/ListingSearchPage';
import V2ServicesPage from '../../components/v2/services/V2ServicesPage';
import ProviderManagementSection from '../../src/features/viewer-provider-controls/components/ProviderManagementSection';
import ProviderControlsBoundary from '../../src/features/viewer-provider-controls/components/ProviderControlsBoundary';
import ProviderMenu from '../../src/features/viewer-provider-controls/components/ProviderMenu';
import {usePublicProfile} from '../../src/features/public-profile/model/usePublicProfile';
import {useViewerAccount} from '../../src/shared/provider-controls/useViewerAccount';
import {useConversationBlockState} from '../../src/features/listing-conversation/model/useConversationBlockState';
import ThreadActions from '../../src/features/listing-conversation/components/ThreadActions';
import {fixture} from './viewer-provider-controls-fixture';

function Profile(){const {profile,loading,error}=usePublicProfile('repair-studio');
  return <section data-test-profile className="rounded-2xl border bg-white p-6">{loading?'Loading profile…':error?'Profile unavailable':profile?
    <><h1>{profile.displayName}</h1><ProviderMenu target={{type:'profile',id:profile.identityId}} name={profile.displayName} allowHide={false}/><p>{profile.bio}</p></>:'Profile unavailable'}</section>;}
function Conversation(){const context=useViewerAccount();
  const actor=useMemo(()=>context.actor?{expectedUserId:context.actor.userId,expectedIdentityId:fixture.ids.second,
    accessToken:context.actor.accessToken,generation:context.actor.generation,signal:context.actor.signal}:null,[context.actor]);
  const current=useMemo(()=>a=>!!context.actor&&context.isCurrent({...a,userId:a.expectedUserId}),[context.actor,context.isCurrent]);
  const blocks=useConversationBlockState(actor,current,'9',!!actor,false,false);
  return <section className="rounded-2xl bg-white p-6"><h1>Conversation</h1>
    <ThreadActions blocked={blocks.blockedByMe} blockedByOther={blocks.blockedByOther} blockUnavailable={!blocks.verified}
      onHide={async()=>false} onBlock={async()=>{throw Error('No message operation should be submitted');}}/>
    <p data-test-history>Existing conversation history</p></section>;}
function FixtureControls(){const diagnostics=fixture.diagnostics(),refresh=()=>window.dispatchEvent(new Event('fixture-change'));
  const action=(name,run)=><button key={name} type="button" className="rounded border bg-white px-3 py-2 text-xs" onClick={()=>{run();refresh();}}>{name}</button>;
  return <details data-test-fixture-controls className="mb-5 rounded-xl border border-dashed border-neutral-400 bg-neutral-100 p-3 text-neutral-800">
    <summary className="cursor-pointer text-sm font-bold">Synthetic test controls · no live accounts</summary>
    <nav className="mt-3 flex flex-wrap gap-2">{[['Products','/v2/products'],['Services','/v2/services'],['Management','/v2/my-area'],['Direct profile','/v2/profile/repair-studio'],['Conversation','/v2/messages/9']].map(([name,url])=>
      <a key={url} className="rounded border bg-white px-3 py-2 text-xs" href={url+'?lang='+fixture.language} onClick={event=>{event.preventDefault();fixture.navigate(event.currentTarget.getAttribute('href'));}}>{name}</a>)}</nav>
    <div className="mt-3 flex flex-wrap gap-2">{[
      ['Lose next acknowledgement',()=>fixture.loseNextAcknowledgement()],['Hold next write',()=>fixture.holdNextWrite()],['Release held write',()=>fixture.releaseWrite()],
      ['Release held search',()=>fixture.releaseSearch()],['Switch account',()=>fixture.switchAccount()],['Sign out',()=>fixture.signOut()],['Switch identity',()=>fixture.switchIdentity()],
      ['Add 26 hidden providers',()=>fixture.seedHidden()],['Seed my block',()=>fixture.ownBlock()],['Block by other account',()=>fixture.incomingBlock()],
      ['Advance server 24 hours',()=>fixture.advance(86400000)],['Refresh diagnostics',()=>{}],
    ].map(([name,run])=>action(name,run))}</div>
    <p className="mt-3 text-xs">{diagnostics.account}; identity {diagnostics.identity}; GET {diagnostics.reads}; SET {diagnostics.writes}; last target {diagnostics.lastTarget}; last action {diagnostics.lastAction}; last product focus: {diagnostics.lastProductFocus}</p>
    <p className="mt-2 flex flex-wrap gap-4 text-xs"><a className="underline" href={location.pathname+'?lang=en'}>Reset fixture in English</a><a className="underline" href={location.pathname+'?lang=et'}>Lähtesta katse eesti keeles</a></p>
  </details>;}
function App(){const [,setVersion]=useState(0);useEffect(()=>{const changed=()=>setVersion(value=>value+1);
  window.addEventListener('popstate',changed);window.addEventListener('fixture-change',changed);return()=>{window.removeEventListener('popstate',changed);window.removeEventListener('fixture-change',changed);};},[]);
  const route=location.pathname;
  return <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><FixtureControls/><div className="mb-6 flex gap-4" data-v2-header><span>Selqiro</span></div>
    {route==='/v2/products'?<ListingSearchPage/>:route==='/v2/services'?<V2ServicesPage/>:route==='/v2/my-area'?<ProviderManagementSection/>:
      route.startsWith('/v2/profile/')?<ProviderControlsBoundary><Profile/></ProviderControlsBoundary>:route.startsWith('/v2/messages/')?<Conversation/>:<p>Direct destination</p>}
  </main>;
}
window.__providerReactAct=React.act;
const testRoot=createRoot(document.getElementById('root'));
window.__providerUnmount=()=>testRoot.unmount();
testRoot.render(<React.StrictMode><App/></React.StrictMode>);
