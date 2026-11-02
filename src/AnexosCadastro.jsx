import { useRef, useState } from 'react';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;
const ALLOWED = /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/csv)$/i;

function segment(value) {
  return String(value || 'registro').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'registro';
}

function humanSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnexosCadastro({ collectionName, recordId, anexos = [], onChange }) {
  const inputRef = useRef(null);
  const [pendentes, setPendentes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [progresso, setProgresso] = useState('');

  function selecionar(files) {
    setErro('');
    const novos = Array.from(files || []);
    if (novos.length + pendentes.length > MAX_FILES_PER_UPLOAD) {
      setErro(`Selecione até ${MAX_FILES_PER_UPLOAD} arquivos por vez.`);
      return;
    }
    const invalidos = novos.filter((file) => file.size > MAX_FILE_BYTES || !(ALLOWED.test(file.type) || /\.(jpe?g|png|webp|gif|pdf|docx?|xlsx?|csv)$/i.test(file.name)));
    if (invalidos.length) {
      setErro('Use imagens, PDF, Word, Excel ou CSV de até 10 MB cada.');
      return;
    }
    setPendentes((current) => [...current, ...novos]);
  }

  async function enviar() {
    if (!pendentes.length || enviando) return;
    if (!String(recordId || '').trim()) {
      setErro('Preencha primeiro o identificador do cadastro para vincular os anexos.');
      return;
    }
    setEnviando(true);
    setErro('');
    const enviados = [];
    try {
      const storage = getStorage();
      const prefixo = `cadastros/${segment(collectionName)}/${segment(recordId)}`;
      for (const file of pendentes) {
        const caminho = `${prefixo}/${Date.now()}-${(globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))}-${segment(file.name)}`;
        const destino = ref(storage, caminho);
        await uploadBytes(destino, file, { contentType: file.type || 'application/octet-stream', customMetadata: { originalName: file.name } });
        enviados.push({
          nome: file.name,
          tipo: file.type || 'Arquivo',
          tamanho: file.size,
          caminho,
          url: await getDownloadURL(destino),
          enviadoEm: new Date().toISOString(),
        });
        setProgresso(`${enviados.length} de ${pendentes.length} arquivo(s) enviado(s)`);
      }
      await onChange([...(Array.isArray(anexos) ? anexos : []), ...enviados]);
      setPendentes([]);
      if (inputRef.current) inputRef.current.value = '';
      setProgresso('Anexos enviados. Salve o cadastro para registrar os vínculos.');
    } catch (error) {
      console.error('Falha ao enviar anexo do cadastro:', error);
      await Promise.all(enviados.map((item) => deleteObject(ref(getStorage(), item.caminho)).catch(() => {})));
      setErro('Não foi possível enviar os arquivos. Confira as regras do Firebase Storage e tente novamente.');
      setProgresso('');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(anexo) {
    const ok = window.confirm(`Remover o arquivo "${anexo.nome || 'anexo'}"?`);
    if (!ok) return;
    try {
      if (anexo.caminho) await deleteObject(ref(getStorage(), anexo.caminho));
      await onChange((Array.isArray(anexos) ? anexos : []).filter((item) => !(item.caminho === anexo.caminho && item.url === anexo.url)));
    } catch (error) {
      console.error('Falha ao remover anexo:', error);
      setErro('Não foi possível excluir o arquivo do Storage. Verifique as permissões.');
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-gray-200 bg-surface/40 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-sm">Fotos e arquivos do cadastro</h3>
        <p className="mt-1 text-xs text-muted">Imagens, PDF, Word, Excel ou CSV · até 10 MB por arquivo. Os anexos ficam no Storage; somente os metadados ficam no Firestore.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" className="hidden" onChange={(event) => selecionar(event.target.files)} />
        <button type="button" className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-surface" onClick={() => inputRef.current?.click()} disabled={enviando}>Selecionar arquivos</button>
        <button type="button" className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={enviar} disabled={!pendentes.length || enviando}>{enviando ? 'Enviando…' : `Enviar ${pendentes.length || ''} arquivo(s)`}</button>
      </div>
      {pendentes.length > 0 && <ul className="mt-3 space-y-1 text-xs">{pendentes.map((file, index) => <li key={file.name + file.lastModified + index} className="flex items-center justify-between gap-3"><span>{file.name} · {humanSize(file.size)}</span><button type="button" className="text-bad" onClick={() => setPendentes((current) => current.filter((_, i) => i !== index))}>Cancelar</button></li>)}</ul>}
      {Array.isArray(anexos) && anexos.length > 0 && <ul className="mt-3 space-y-2 border-t pt-3 text-sm">{anexos.map((item, index) => <li key={item.caminho || item.url || index} className="flex items-center justify-between gap-3"><a className="min-w-0 truncate text-brand-700 underline" href={item.url} target="_blank" rel="noreferrer">{item.nome || 'Abrir anexo'}</a><button type="button" className="shrink-0 text-xs text-bad" onClick={() => remover(item)}>Excluir arquivo</button></li>)}</ul>}
      {progresso && <p className="mt-2 text-xs text-muted" role="status">{progresso}</p>}
      {erro && <p className="mt-2 text-xs text-bad" role="alert">{erro}</p>}
    </section>
  );
}
