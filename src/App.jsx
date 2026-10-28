import {useEffect,useState} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { db, auth, googleProvider } from './services/firebase';
import {
  LayoutDashboard, CarFront, ClipboardList, Upload, Menu, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, Wifi, WifiOff, RefreshCw, Users,
  UserRound, Fuel, Radio, FileWarning, GitCompare, Target, Gauge,
  BarChart3, BriefcaseBusiness, Network, FileSpreadsheet
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Multas from './pages/Multas';
import Frota from './pages/Frota';
import Importar from './pages/Importar';
import PlanilhaModulo from './pages/PlanilhaModulo';

const nav=[
  {id:'dashboard',label:'Painel',icon:LayoutDashboard},
  {id:'condutores',label:'Condutores',icon:Users},
  {id:'frota',label:'Veículos',icon:CarFront},
  {id:'funcionarios',label:'Funcionários',icon:UserRound},
  {id:'ticktlog',label:'Cadastros Ticket Log',icon:Fuel},
  {id:'ibutton',label:'iButton / Cobli',icon:Radio},
  {id:'multas',label:'Infrações',icon:ClipboardList},
  {id:'gestaoManual',label:'Gestão manual de infrações',icon:FileWarning},
  {id:'gestaoCadastros',label:'Gestão Cadastros',icon:GitCompare},
  {id:'metas',label:'Minhas metas',icon:Target},
  {id:'calculosFrota',label:'Cálculos Frota',icon:Gauge},
  {id:'chartData',label:'Chart Data',icon:BarChart3},
  {id:'dadosBIMultas',label:'Dados BI Multas',icon:FileSpreadsheet},
  {id:'dadosAdministrativos',label:'Dados Administrativos',icon:BriefcaseBusiness},
  {id:'hierarquia',label:'Hierarquia Dados',icon:Network},
  {id:'importar',label:'Importar planilha',icon:Upload}
];
const moduleKeys={condutores:'condutores',funcionarios:'funcionarios',ticktlog:'ticktlog',ibutton:'ibutton',gestaoManual:'gestaoManual',gestaoCadastros:'gestaoCadastros',metas:'metas',calculosFrota:'calculosFrota',chartData:'chartData',dadosBIMultas:'dadosBIMultas',dadosAdministrativos:'dadosAdministrativos',hierarquia:'hierarquia'};
const norm=s=>String(s??'').trim();
const valueByNormalizedKey=(data,keys)=>{
  const wanted=new Set(keys.map(normalized));
  const entry=Object.entries(data||{}).find(([key,value])=>wanted.has(normalized(key))&&value!==undefined&&value!==null&&String(value).trim()!=='');
  return entry?.[1]??'';
};
const documentId=value=>String(value??'').trim().replace(/\\//g,'-').slice(0,1500);
const vehicleView=(data,id)=>({...data,id,placa:String(valueByNormalizedKey(data,['placa'])||'').toUpperCase(),prefixo:valueByNormalizedKey(data,['Nº Frota','No Frota','prefixo']),modelo:valueByNormalizedKey(data,['modelo completo','modelo']),marca:valueByNormalizedKey(data,['marca']),ano:valueByNormalizedKey(data,['ano modelo','ano fabricação','ano']),hodometro:valueByNormalizedKey(data,['hodometro']),propriedade:valueByNormalizedKey(data,['propriedade']),status:valueByNormalizedKey(data,['status veículo','status'])});
const fineView=(data,id)=>({...data,id,ait:valueByNormalizedKey(data,['ait','Nº Auto Infração (AIT)','Auto de Infração']),placa:String(valueByNormalizedKey(data,['placa'])||'').toUpperCase(),dataInfracao:valueByNormalizedKey(data,['data infração','data/hora infração','dataInfracao']),prazo:valueByNormalizedKey(data,['data limite apresentar condutor','prazo acompanhamento','prazo']),condutor:valueByNormalizedKey(data,['condutor']),valor:valueByNormalizedKey(data,['valor total','valor com desconto','valor']),pontos:valueByNormalizedKey(data,['pontos cnh','pontos']),infracao:valueByNormalizedKey(data,['descrição infração','infração']),status:valueByNormalizedKey(data,['etapa fluxo','status / próxima ação','status'])});
const normalized=s=>String(s??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const rowKey=(sheet,row)=>{
  const tab=normalized(sheet), entries=Object.entries(row);
  const pick=(terms)=>{const p=entries.find(([k,v])=>terms.some(t=>normalized(k).includes(t))&&String(v??'').trim()!=='');return p?String(p[1]).trim():''};
  let key='';
  if(tab.includes('veicul'))key=pick(['placa'])||pick(['id'])||pick(['numerofrota']);
  else if(tab.includes('infrac')||tab.includes('multa'))key=pick(['ait','autodeinfracao'])||[pick(['placa']),pick(['datahora','datainfracao']),pick(['infracao'])].filter(Boolean).join('|');
  else if(tab.includes('condutor'))key=pick(['matricula'])||pick(['cpf'])||pick(['id'])||pick(['nome']);
  else if(tab.includes('funcion'))key=pick(['matricula'])||pick(['cpf'])||pick(['id'])||pick(['nome']);
  else key=pick(['id'])||pick(['codigo'])||pick(['matricula'])||pick(['placa'])||pick(['ait'])||pick(['nome']);
  if(!key)key=JSON.stringify(row);
  return normalized(key);
};
const canonicalFields=(sheet,row)=>{
  const data={...row},tab=normalized(sheet);
  for(const [k,v] of Object.entries(row)){
    const key=normalized(k),value=typeof v==='string'?v.trim():v;
    if(key==='placa')data.placa=String(value??'').toUpperCase();
    if(['norfrota','numerofrota','prefixo'].includes(key))data.prefixo=value;
    if(['ait','autodeinfracao','numerodoait'].includes(key))data.ait=value;
    if(['datahorainfracao','datainfracao'].includes(key))data.dataInfracao=value;
    if(['prazoacompanhamento','prazo'].includes(key))data.prazo=value;
    if(['valor','valorr'].includes(key))data.valor=value;
    if(key==='pontos')data.pontos=value;
    if(['statusproximaacao','status'].includes(key))data.status=value;
    if(['nome','nomecompleto'].includes(key)&&tab.includes('condutor'))data.nome=value;
    if(['matricula','matriculaempregado'].includes(key))data.matricula=value;
    if(key==='cpf')data.cpf=value;
    if(key==='modelo')data.modelo=value;
    if(key==='marca')data.marca=value;
  }
  return data;
};
function mapRow(r,kind){
  const o={};
  for(const [k,v] of Object.entries(r)){
    const key=String(k).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const val=typeof v==='string'?v.trim():v;
    if(kind==='frota'){
      const aliases={placa:'placa','nº frota':'prefixo','no frota':'prefixo',prefixo:'prefixo',modelo:'modelo',marca:'marca',ano:'ano',hodometro:'hodometro',status:'status',propriedade:'propriedade','propriedade do veiculo':'propriedade'};
      if(aliases[key])o[aliases[key]]=val;else o[key.replace(/\s+/g,'_')]=val;
    }else{
      const aliases={placa:'placa',ait:'ait','auto de infracao':'ait','data/hora infracao':'dataInfracao','data infracao':'dataInfracao','prazo acompanhamento':'prazo',prazo:'prazo',condutor:'condutor','valor (r$)':'valor',valor:'valor',pontos:'pontos',natureza:'natureza',infracao:'infracao','status / proxima acao':'status',status:'status',observacoes:'observacoes'};
      if(aliases[key])o[aliases[key]]=val;else o[key.replace(/\s+/g,'_')]=val;
    }
  }
  return o;
}
export default function App(){
  const [page,setPage]=useState('dashboard'),[vehicles,setVehicles]=useState([]),[fines,setFines]=useState([]),[connected,setConnected]=useState(false),[error,setError]=useState(''),[authUser,setAuthUser]=useState(null),[authReady,setAuthReady]=useState(false),[signingIn,setSigningIn]=useState(false),[dark,setDark]=useState(true),[collapsed,setCollapsed]=useState(false),[mobileNav,setMobileNav]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,user=>{setAuthUser(user);setAuthReady(true);if(!user){setConnected(false);setError('Conecte-se com a conta Google autorizada para acessar o Firestore.')}else if(user.email?.toLowerCase()!=='rafinhass853@gmail.com'){setError('Use a conta autorizada rafinhass853@gmail.com.');signOut(auth).catch(()=>{});}}),[]);
  const connectGoogle=async()=>{setSigningIn(true);setError('');try{const result=await signInWithPopup(auth,googleProvider);if(result.user?.email?.toLowerCase()!=='rafinhass853@gmail.com'){await signOut(auth);throw new Error('Use a conta autorizada rafinhass853@gmail.com.')}}catch(e){setError(e.message||'Não foi possível conectar com o Google.');}finally{setSigningIn(false)}};
  useEffect(()=>{
    if(!authReady||!authUser||authUser.email?.toLowerCase()!=='rafinhass853@gmail.com')return;
    let ready=0;const done=()=>{ready++;if(ready>=2)setConnected(true)};
    const fail=e=>{setError(e.message||'Falha de conexão com o Firestore.');setConnected(false)};
    const a=onSnapshot(collection(db,'veiculos'),s=>{setVehicles(s.docs.map(d=>vehicleView(d.data(),d.id)));done()},fail);
    const b=onSnapshot(collection(db,'infracoes'),s=>{setFines(s.docs.map(d=>fineView(d.data(),d.id)));done()},fail);
    return()=>{a();b()};
  },[authReady,authUser]);
  const saveVehicle=async(data,id)=>{
    const placa=norm(data.placa).toUpperCase();
    if(!placa)throw new Error('Informe a placa do veículo.');
    const duplicate=vehicles.find(v=>v.placa?.toUpperCase()===placa&&v.id!==id);
    if(duplicate)throw new Error('Já existe veículo com esta placa.');
    const payload={...data,placa,Placa:placa,updatedAt:serverTimestamp()};
    if(id)await updateDoc(doc(db,'veiculos',id),payload);else{const sourceId=documentId(data.id||placa);if(!sourceId)throw new Error('Informe o ID ou a placa para identificar o veículo.');await setDoc(doc(db,'veiculos',sourceId),{...payload,id:data.id??sourceId,createdAt:serverTimestamp()});}
  };
  const saveFine=async(data,id)=>{
    const ait=norm(data.ait);
    if(ait){const duplicate=fines.find(f=>norm(f.ait)===ait&&f.id!==id);if(duplicate)throw new Error('Já existe multa com este AIT.');}
    const aitId=documentId(data.id||ait);
    const plate=norm(data.placa).toUpperCase();
    const payload={...data,placa:plate,Placa:plate,valor:Number(data.valor||0),pontos:Number(data.pontos||0),updatedAt:serverTimestamp()};
    if(id)await updateDoc(doc(db,'infracoes',id),payload);else if(aitId)await setDoc(doc(db,'infracoes',aitId),{...payload,id:data.id??aitId,createdAt:serverTimestamp()});else await addDoc(collection(db,'infracoes'),{...payload,createdAt:serverTimestamp()});
  };
  const importRows=async(sheets,onProgress=()=>{})=>{
    let added=0,skipped=0,invalid=0;
    const loaded=new Map(),seenInFile=new Map();
    const resolveCollection=sheet=>{
      const n=normalized(sheet.name);
      if(n.includes('condutor'))return 'condutores';
      if(n.includes('veicul')||n==='frota')return 'veiculos';
      if(n.includes('infrac')||n.includes('multa'))return 'infracoes';
      if(n.includes('funcion'))return 'funcionarios';
      if(n.includes('ticketlog')||n.includes('ticktlog'))return 'cadastros_ticktlog';
      if(n.includes('ibutton')||n.includes('cobli'))return 'ibutton_cobli';
      return sheet.collection||n.replace(/[^a-z0-9]+/g,'_')||'importacao_planilha';
    };
    const identifyExisting=(sheetName,data)=>{
      const tab=normalized(sheetName);
      const get=(...keys)=>valueByNormalizedKey(data,keys);
      if(tab.includes('veicul'))return normalized(get('Placa','id','Nº Frota','prefixo'));
      if(tab.includes('infrac')||tab.includes('multa'))return normalized(get('id','Nº Auto Infração (AIT)','AIT','Auto de Infração'))||normalized([get('Placa'),get('Data Infração','Data/Hora Infração'),get('Descrição Infração','Infração')].filter(Boolean).join('|'));
      if(tab.includes('condutor'))return normalized(get('id','Matrícula','CPF','Nome'));
      if(tab.includes('funcion'))return normalized(get('Matricula','Matrícula','CPF','Nome'));
      return normalized(get('id','codigo','matricula','placa','ait','nome'))||normalized(JSON.stringify(data));
    };
    try{
      for(let i=0;i<sheets.length;i++){
        const sheet=sheets[i],collectionName=resolveCollection(sheet);
        onProgress('Conferindo coleção '+collectionName+' ('+(i+1)+'/'+sheets.length+')...');
        if(!loaded.has(collectionName)){
          const snap=await getDocs(collection(db,collectionName));
          loaded.set(collectionName,snap.docs.map(d=>({...d.data(),id:d.id})));
          seenInFile.set(collectionName,new Set(loaded.get(collectionName).map(d=>identifyExisting(sheet.name,d)).filter(Boolean)));
        }
      }
      for(let i=0;i<sheets.length;i++){
        const sheet=sheets[i],collectionName=resolveCollection(sheet);
        const seen=seenInFile.get(collectionName)||new Set();
        let batch=writeBatch(db),inBatch=0;
        for(let idx=0;idx<sheet.rows.length;idx++){
          const row=sheet.rows[idx];
          if(!row||!Object.values(row).some(v=>String(v??'').trim()!=='')){invalid++;continue}
          const key=rowKey(sheet.name,row);
          if(!key){invalid++;continue}
          const matchKey=identifyExisting(sheet.name,row);
          if(matchKey&&seen.has(matchKey)){skipped++;continue}
          const data=canonicalFields(sheet.name,row);
          data._importacao={arquivo:'Gestãototal.xlsx',aba:sheet.name,chave:key,importadoEm:new Date().toISOString()};
          let ref;
          if(['veiculos','condutores','infracoes'].includes(collectionName)){
            const sourceId=documentId(valueByNormalizedKey(row,['id'])||(collectionName==='veiculos'?valueByNormalizedKey(row,['placa']):collectionName==='infracoes'?valueByNormalizedKey(row,['Nº Auto Infração (AIT)','AIT','Auto de Infração']):''));
            if(sourceId){
              const alreadyHasDocument=loaded.get(collectionName).some(item=>item.id===sourceId);
              if(alreadyHasDocument){skipped++;if(matchKey)seen.add(matchKey);continue;}
              ref=doc(db,collectionName,sourceId);
              data.id=valueByNormalizedKey(row,['id'])||sourceId;
            }
          }
          if(!ref)ref=doc(collection(db,collectionName));
          batch.set(ref,data);
          inBatch++;added++;
          if(matchKey)seen.add(matchKey);
          if(inBatch>=400){await batch.commit();batch=writeBatch(db);inBatch=0;onProgress('Gravando '+collectionName+' · '+(idx+1)+' de '+sheet.rows.length+' linhas...');}
        }
        if(inBatch)await batch.commit();
        seenInFile.set(collectionName,seen);
        loaded.set(collectionName,loaded.get(collectionName)||[]);
        onProgress('Aba '+sheet.name+' processada.');
      }
      return{added,skipped,invalid};
    }catch(e){
      e.message='A gravação parou após '+added+' novo(s) registro(s). '+(e.message||'Falha no Firestore')+' Reimporte o arquivo: os registros já gravados serão reconhecidos e ignorados.';
      throw e;
    }
  };
  const title=nav.find(n=>n.id===page)?.label||'Painel';
  const navigate=id=>{setPage(id);setMobileNav(false)};
  const isGeneric=Boolean(moduleKeys[page]);
  return <div className={'app-shell '+(dark?'theme-dark':'theme-light')}>
    <aside className={'sidebar '+(collapsed?'collapsed ':'')+(mobileNav?' mobile-open':'')}>
      <div className="brand"><div className="brand-mark"><CarFront size={23}/></div>{!collapsed&&<div><strong>EIXO <span>SP</span></strong><small>GESTÃO OPERACIONAL</small></div>}</div>
      <div className="nav-caption">{!collapsed&&'MENU PRINCIPAL'}</div>
      <nav>{nav.map(n=><button key={n.id} className={'nav-item '+(page===n.id?'active':'')} onClick={()=>navigate(n.id)} title={collapsed?n.label:''}><n.icon size={18}/>{!collapsed&&<span>{n.label}</span>}{n.id==='multas'&&!collapsed&&fines.filter(f=>!['Concluída','Encerrada','Paga'].includes(f.status)).length>0&&<b>{fines.filter(f=>!['Concluída','Encerrada','Paga'].includes(f.status)).length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="connection">{connected?<Wifi size={16}/>:<WifiOff size={16}/>} {!collapsed&&<span>{connected?'Firestore conectado':error?'Verificar conexão':'Conectando ao Firestore...'}</span>}<i className={connected?'online':''}/></div>{!collapsed&&<div className="sidebar-foot">Eixo SP · Operações<br/>Painel de frota, multas e cadastros</div>}</div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button desktop-only" onClick={()=>setCollapsed(v=>!v)} title="Recolher menu">{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</button><button className="icon-button mobile-only" onClick={()=>setMobileNav(v=>!v)}><Menu size={20}/></button><div className="breadcrumbs">Operações <span>/</span> <b>{title}</b></div></div><div className="topbar-right"><span className={'connection-label '+(connected?'connected':'')}>{connected?'Ao vivo':'Offline / conectando'}</span><button className="icon-button" onClick={()=>setDark(v=>!v)} title={dark?'Usar tema claro':'Usar tema escuro'}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><div className="avatar">SP</div></div></header>
      <div className="content">
        {error&&<div className="error-banner"><WifiOff size={18}/><div><strong>{authUser?'Não foi possível carregar os dados do Firestore.':'Acesso protegido do Firestore'}</strong><p>{error}</p>{!authUser&&<button className="button button-primary" disabled={!authReady||signingIn} onClick={connectGoogle}>{signingIn?'Conectando...':'Conectar com Google'}</button>}</div><button className="icon-button" onClick={()=>location.reload()} title="Tentar novamente"><RefreshCw size={16}/></button></div>}
        {page==='dashboard'?<Dashboard vehicles={vehicles} fines={fines} onNavigate={navigate}/>:page==='frota'?<Frota vehicles={vehicles} onSave={saveVehicle}/>:page==='multas'?<Multas fines={fines} onSave={saveFine} onDelete={id=>deleteDoc(doc(db,'infracoes',id))}/>:page==='importar'?<Importar onImport={importRows}/>:isGeneric?<PlanilhaModulo moduleKey={moduleKeys[page]} onNavigate={navigate}/>:null}
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Eixo SP · Gestão operacional</span><span><i className={connected?'online':''}/>{connected?'Sincronização ativa':'Aguardando Firestore'}</span></footer>
    </main>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Fechar menu"/>}
  </div>;
}
