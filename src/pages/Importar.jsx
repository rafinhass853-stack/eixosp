import {useMemo,useState} from 'react';
import {Upload,FileSpreadsheet,ShieldCheck,AlertCircle,CheckCircle2,Database,Eye,Layers,LoaderCircle} from 'lucide-react';
import * as XLSX from 'xlsx';

const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const collectionFor=name=>{
  const n=normalize(name).replace(/[^a-z0-9]+/g,'');
  const known={
    condutores:'condutores',
    veiculos:'veiculos',
    infracoes:'infracoes',
    multas:'infracoes',
    funcionarios:'funcionarios',
    ticktlog:'cadastros_ticktlog',
    ticketlog:'cadastros_ticktlog',
    ibutton:'ibutton_cobli',
    cobli:'ibutton_cobli',
    gestaomanual:'gestao_manual_infracoes',
    gestaocadastros:'gestao_cadastros',
    minhasmetas:'metas',
    metas:'metas',
    calculosfrota:'calculos_frota',
    chartdata:'chart_data',
    dadosbimultas:'dados_bi_multas',
    dadosadministrativos:'dados_administrativos',
    hierarquia:'hierarquia_dados'
  };
  return known[n]||n.replace(/[^a-z0-9]+/g,'_')||'importacao_planilha';
};
const identityFor=(sheet,row)=>{
  const entries=Object.entries(row);
  const find=terms=>{const pair=entries.find(([k,v])=>terms.some(t=>normalize(k).replace(/[^a-z0-9]/g,'').includes(t))&&String(v??'').trim());return pair?String(pair[1]).trim():''};
  const tab=normalize(sheet);
  if(tab.includes('veicul'))return find(['id'])||find(['placa'])||find(['numerofrota']);
  if(tab.includes('infrac')||tab.includes('multa'))return find(['id'])||find(['ait','autodeinfracao'])||[find(['placa']),find(['datahora']),find(['infracao'])].filter(Boolean).join('|');
  if(tab.includes('condutor'))return find(['id'])||find(['matricula'])||find(['cpf'])||find(['nome']);
  if(tab.includes('funcion'))return find(['matricula'])||find(['cpf'])||find(['id'])||find(['nome']);
  return find(['id'])||find(['codigo'])||find(['matricula'])||find(['placa'])||find(['ait'])||find(['nome'])||'';
};
export default function Importar({onImport}){
  const [file,setFile]=useState(null),[sheets,setSheets]=useState([]),[selected,setSelected]=useState({}),[previews,setPreviews]=useState({}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[progress,setProgress]=useState('');
  const selectedSheets=useMemo(()=>sheets.filter(s=>selected[s]&&previews[s]?.rows?.length),[sheets,selected,previews]);
  const read=async f=>{
    setFile(f);setMessage('');setProgress('');
    try{
      const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});
      const next={},preview={};
      for(const name of wb.SheetNames){
        const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:'',raw:false});
        const clean=rows.filter(r=>Object.values(r).some(v=>String(v??'').trim()!==''));
        const headers=clean.length?Object.keys(clean[0]):[];
        next[name]=clean.length>0;
        preview[name]={rows:clean,headers,count:clean.length,collection:collectionFor(name),sample:clean.slice(0,4)};
      }
      setSheets(wb.SheetNames);setSelected(next);setPreviews(preview);
      const total=Object.values(preview).reduce((n,s)=>n+s.count,0);
      setMessage('Arquivo analisado: '+wb.SheetNames.length+' abas e '+total.toLocaleString('pt-BR')+' linhas com dados. Confira a seleção antes de gravar.');
    }catch(e){setSheets([]);setSelected({});setPreviews({});setMessage('Não foi possível ler o Excel: '+(e.message||'arquivo inválido.'))}
  };
  const toggleAll=value=>setSelected(old=>Object.fromEntries(sheets.map(s=>[s,value&&Boolean(previews[s]?.count)])));
  const commit=async()=>{
    if(!selectedSheets.length)return;
    setBusy(true);setMessage('');setProgress('Preparando '+selectedSheets.length+' abas para importação...');
    try{
      const payload=selectedSheets.map(name=>({name,collection:previews[name].collection,rows:previews[name].rows}));
      const result=await onImport(payload,(text)=>setProgress(text));
      setMessage('Importação finalizada. Novos: '+result.added.toLocaleString('pt-BR')+' · duplicados preservados: '+result.skipped.toLocaleString('pt-BR')+' · linhas sem identificador: '+result.invalid.toLocaleString('pt-BR')+'.');
      setProgress('');
    }catch(e){setMessage('Importação interrompida: '+(e.message||'verifique a conexão e as permissões do Firestore.'));setProgress('')}
    finally{setBusy(false)}
  };
  const totalRows=selectedSheets.reduce((n,s)=>n+previews[s].count,0);
  return <div className="page-stack">
    <div className="welcome"><div><div className="eyebrow">FERRAMENTAS / CARGA DE DADOS</div><h1>Importar planilha completa</h1><p>Selecione o arquivo Gestão Total uma única vez. Todas as abas serão identificadas e encaminhadas às suas coleções do Firestore.</p></div></div>
    <div className="import-grid">
      <section className="card import-panel">
        <div className="import-icon"><Upload size={23}/></div><h2>Arquivo Excel</h2><p>Compatível com .xlsx e .xls. A leitura é feita no navegador; nada é gravado até você confirmar.</p>
        <label className="dropzone"><FileSpreadsheet size={30}/><strong>{file?file.name:'Selecionar Gestão Total.xlsx'}</strong><span>Analisa todas as abas automaticamente</span><input type="file" accept=".xlsx,.xls" onChange={e=>e.target.files?.[0]&&read(e.target.files[0])}/></label>
        {sheets.length>0&&<>
          <div className="preview-meta"><span><Layers size={15}/> {sheets.length} abas detectadas</span><span>{totalRows.toLocaleString('pt-BR')} linhas selecionadas</span></div>
          <div className="button-row"><button className="button button-secondary" onClick={()=>toggleAll(true)}>Selecionar todas</button><button className="button button-secondary" onClick={()=>toggleAll(false)}>Limpar seleção</button></div>
          <div className="sheet-list">{sheets.map(name=>{const p=previews[name];return <label key={name} className="sheet-item"><input type="checkbox" checked={Boolean(selected[name])} disabled={!p?.count||busy} onChange={e=>setSelected(old=>({...old,[name]:e.target.checked}))}/><span className="sheet-name"><strong>{name}</strong><small>{p?.count?p.count.toLocaleString('pt-BR')+' registros · '+p.headers.length+' colunas':'Aba vazia'}</small></span><span className="collection-pill">{p?.collection}</span></label>})}</div>
          <div className="safe-note"><ShieldCheck size={17}/><span>Importação sem sobrescrita: registros com a mesma chave são preservados e ignorados. Todas as colunas originais são mantidas.</span></div>
          <button className="button button-primary wide" disabled={!selectedSheets.length||busy} onClick={commit}>{busy?<><LoaderCircle size={16} className="spin"/> Importando...</>:<>Importar {selectedSheets.length} abas · {totalRows.toLocaleString('pt-BR')} linhas</>}</button>
        </>}
        {progress&&<div className="notice"><LoaderCircle size={18} className="spin"/>{progress}</div>}
        {message&&<div className={'notice '+(message.startsWith('Não foi')||message.startsWith('Importação interrompida')?'notice-error':'notice-success')}>{message.startsWith('Não')||message.startsWith('Importação interrompida')?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<span>{message}</span></div>}
      </section>
      <section className="card import-panel"><h2>Prévia de todas as abas</h2><p>Confira o destino e exemplos de registros antes de executar a gravação.</p>
        {selectedSheets.length?selectedSheets.map(name=>{const p=previews[name];return <div className="sheet-preview" key={name}><div className="sheet-preview-head"><div><strong>{name}</strong><small>{p.count.toLocaleString('pt-BR')} linhas · {p.headers.length} colunas</small></div><span className="collection-pill"><Database size={13}/>{p.collection}</span></div><div className="table-wrap preview-table"><table><thead><tr>{p.headers.slice(0,5).map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{p.sample.slice(0,3).map((r,i)=><tr key={i}>{p.headers.slice(0,5).map(h=><td key={h}>{String(r[h]??'').slice(0,55)||'—'}</td>)}</tr>)}</tbody></table></div></div>}):<div className="preview-empty"><Eye size={28}/><strong>Aguardando planilha</strong><span>Após selecionar o arquivo, aparecerão aqui as abas, os campos e suas coleções de destino.</span></div>}
      </section>
    </div>
  </div>;
}
