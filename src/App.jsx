import {useEffect,useState} from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';
import {
  LayoutDashboard, CarFront, ClipboardList, Upload, Menu, Sun, Moon,
  PanelLeftClose, PanelLeftOpen, Wifi, WifiOff, RefreshCw, Users,
  UserRound, Fuel, Radio, FileWarning, GitCompare, Target, Gauge,
  ChartNoAxesCombined, BriefcaseBusiness, Network, FileSpreadsheet
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
  {id:'chartData',label:'Chart Data',icon:ChartNoAxesCombined},
  {id:'dadosBIMultas',label:'Dados BI Multas',icon:FileSpreadsheet},
  {id:'dadosAdministrativos',label:'Dados Administrativos',icon:BriefcaseBusiness},
  {id:'hierarquia',label:'Hierarquia Dados',icon:Network},
  {id:'importar',label:'Importar planilha',icon:Upload}
];
const moduleKeys={condutores:'condutores',funcionarios:'funcionarios',ticktlog:'ticktlog',ibutton:'ibutton',gestaoManual:'gestaoManual',gestaoCadastros:'gestaoCadastros',metas:'metas',calculosFrota:'calculosFrota',chartData:'chartData',dadosBIMultas:'dadosBIMultas',dadosAdministrativos:'dadosAdministrativos',hierarquia:'hierarquia'};
const norm=s=>String(s??'').trim();
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
  const [page,setPage]=useState('dashboard'),[vehicles,setVehicles]=useState([]),[fines,setFines]=useState([]),[connected,setConnected]=useState(false),[error,setError]=useState(''),[dark,setDark]=useState(true),[collapsed,setCollapsed]=useState(false),[mobileNav,setMobileNav]=useState(false);
  useEffect(()=>{
    let ready=0;const done=()=>{ready++;if(ready>=2)setConnected(true)};
    const fail=e=>{setError(e.message||'Falha de conexão com o Firestore.');setConnected(false)};
    const a=onSnapshot(collection(db,'veiculos'),s=>{setVehicles(s.docs.map(d=>({id:d.id,...d.data()})));done()},fail);
    const b=onSnapshot(collection(db,'multas'),s=>{setFines(s.docs.map(d=>({id:d.id,...d.data()})));done()},fail);
    return()=>{a();b()};
  },[]);
  const saveVehicle=async(data,id)=>{
    const placa=norm(data.placa).toUpperCase();
    if(!placa)throw new Error('Informe a placa do veículo.');
    const duplicate=vehicles.find(v=>v.placa?.toUpperCase()===placa&&v.id!==id);
    if(duplicate)throw new Error('Já existe veículo com esta placa.');
    const payload={...data,placa,updatedAt:serverTimestamp()};
    if(id)await updateDoc(doc(db,'veiculos',id),payload);else await addDoc(collection(db,'veiculos'),{...payload,createdAt:serverTimestamp()});
  };
  const saveFine=async(data,id)=>{
    const ait=norm(data.ait);
    if(ait){const duplicate=fines.find(f=>norm(f.ait)===ait&&f.id!==id);if(duplicate)throw new Error('Já existe multa com este AIT.');}
    const payload={...data,placa:norm(data.placa).toUpperCase(),valor:Number(data.valor||0),pontos:Number(data.pontos||0),updatedAt:serverTimestamp()};
    if(id)await updateDoc(doc(db,'multas',id),payload);else await addDoc(collection(db,'multas'),{...payload,createdAt:serverTimestamp()});
  };
  const importRows=async(kind,rows)=>{
    let added=0,updated=0,skipped=0;
    for(const row of rows){
      const data=mapRow(row,kind);
      if(kind==='frota'){
        const placa=norm(data.placa).toUpperCase();if(!placa){skipped++;continue}
        const old=vehicles.find(v=>norm(v.placa).toUpperCase()===placa);
        if(old){const safe={...data};delete safe.id;await updateDoc(doc(db,'veiculos',old.id),{...safe,updatedAt:serverTimestamp()});updated++}
        else{await addDoc(collection(db,'veiculos'),{...data,placa,createdAt:serverTimestamp()});added++}
      }else{
        const ait=norm(data.ait);if(!ait){skipped++;continue}
        const old=fines.find(f=>norm(f.ait)===ait);
        if(old){const safe={...data};for(const k of Object.keys(safe))if(safe[k]===''||safe[k]===null||safe[k]===undefined)delete safe[k];await updateDoc(doc(db,'multas',old.id),{...safe,updatedAt:serverTimestamp()});updated++}
        else{await addDoc(collection(db,'multas'),{...data,createdAt:serverTimestamp()});added++}
      }
    }
    return{added,updated,skipped};
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
        {error&&<div className="error-banner"><WifiOff size={18}/><div><strong>Não foi possível carregar os dados do Firestore.</strong><p>{error} Verifique a conectividade e as regras de segurança do projeto Firebase.</p></div><button className="icon-button" onClick={()=>location.reload()}><RefreshCw size={16}/></button></div>}
        {page==='dashboard'?<Dashboard vehicles={vehicles} fines={fines} onNavigate={navigate}/>:page==='frota'?<Frota vehicles={vehicles} onSave={saveVehicle}/>:page==='multas'?<Multas fines={fines} onSave={saveFine} onDelete={id=>deleteDoc(doc(db,'multas',id))}/>:page==='importar'?<Importar onImport={importRows}/>:isGeneric?<PlanilhaModulo moduleKey={moduleKeys[page]} onNavigate={navigate}/>:null}
      </div>
      <footer className="app-footer"><span>© {new Date().getFullYear()} Eixo SP · Gestão operacional</span><span><i className={connected?'online':''}/>{connected?'Sincronização ativa':'Aguardando Firestore'}</span></footer>
    </main>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Fechar menu"/>}
  </div>;
}
