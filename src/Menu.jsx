import { Component, useMemo, useState } from 'react';
import Condutores from './Condutores';
import Veiculos from './Veiculos';
import Funcionarios from './Funcionarios';
import Locadoras from './Locadoras';
import TicketLog from './TicketLog';
import Cobli from './Cobli';
import Multas from './Multas';
import DashboardInteligente from './DashboardInteligente';

const MENU = [
  { key: 'funcionarios', label: 'Funcionários', desc: 'Base-mãe: cadastro oficial e dados completos dos colaboradores', icon: '🧑‍💼', componente: <Funcionarios />, group: 'Cadastros' },
  { key: 'condutores', label: 'Condutores', desc: 'Funcionários habilitados para conduzir no NextFleet', icon: '👤', componente: <Condutores />, group: 'Cadastros' },
  { key: 'veiculos', label: 'Veículos', desc: 'Cadastro completo da frota da empresa', icon: '🚘', componente: <Veiculos />, group: 'Cadastros' },
  { key: 'locadoras', label: 'Locadoras', desc: 'Contratos e veículos de terceiros por locadora', icon: '🏢', componente: <Locadoras />, group: 'Cadastros', submenus: ['Movida', 'CCV', 'Naubrás', 'Emtel', 'Dinâmica'] },
  { key: 'ticketlog', label: 'Ticket Log', desc: 'Cadastros e pontos de conferência', icon: '🎫', componente: <TicketLog />, group: 'Operação' },
  { key: 'cobli', label: 'Cobli', desc: 'Registros e informações operacionais', icon: '📡', componente: <Cobli />, group: 'Operação' },
  { key: 'multas', label: 'Multas', desc: 'Infrações, prazos e acompanhamento', icon: '🚨', componente: <Multas />, group: 'Operação' },
];

class ModuleErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro ao renderizar o módulo:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="module-error" role="alert">
          <h2>Não foi possível abrir este módulo</h2>
          <p>Ocorreu um erro inesperado ao montar a tela. Tente novamente.</p>
          <button type="button" onClick={() => window.location.reload()}>Recarregar aplicação</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Menu() {
  const [pagina, setPagina] = useState('funcionarios');
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaMenu, setBuscaMenu] = useState('');
  const itemAtual = MENU.find((m) => m.key === pagina) || MENU[0];
  const grupos = useMemo(() => {
    const termo = buscaMenu.trim().toLocaleLowerCase('pt-BR');
    return ['Cadastros', 'Operação'].map((nome) => ({
      nome,
      itens: MENU.filter((item) => item.group === nome && (!termo || (item.label + ' ' + item.desc).toLocaleLowerCase('pt-BR').includes(termo))),
    })).filter((grupo) => grupo.itens.length);
  }, [buscaMenu]);

  function navegar(key) {
    setPagina(key);
    setMenuAberto(false);
  }

  function navegarLocadora(nome) {
    setPagina('locadoras');
    window.dispatchEvent(new CustomEvent('locadora-select', { detail: nome }));
    setMenuAberto(false);
  }

  return (
    <div className="app-shell">
      {menuAberto && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />}
      <aside className={`app-sidebar ${menuAberto ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-symbol" aria-hidden="true"><span>eixo</span><b>SP</b></div>
          <div className="brand-copy"><strong>Gestão de Frota</strong><span>PLATAFORMA OPERACIONAL</span></div>
        </div>
        <div className="sidebar-status"><span className="status-dot" /> Ambiente operacional <span className="status-tag">PPCM</span></div>
        <div className="nav-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar módulo" placeholder="Buscar módulo..." value={buscaMenu} onChange={(e) => setBuscaMenu(e.target.value)} /></div>
        <nav className="primary-nav" aria-label="Navegação principal">
          {grupos.map((grupo) => <div className="nav-group" key={grupo.nome}>
            <p className="nav-group-title">{grupo.nome}</p>
            {grupo.itens.map((item) => <div key={item.key} className="nav-item-wrap">
              <button onClick={() => navegar(item.key)} className={`nav-link ${pagina === item.key ? 'active' : ''}`} aria-current={pagina === item.key ? 'page' : undefined}>
                <span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}<small>{item.desc}</small></span>{pagina === item.key && <span className="nav-current" />}
              </button>
              {item.submenus && pagina === item.key && <div className="nav-submenu" aria-label={`Submenus de ${item.label}`}>
                {item.submenus.map((submenu) => <button key={submenu} type="button" onClick={() => navegarLocadora(submenu)} className="nav-sublink">{submenu}</button>)}
              </div>}
            </div>)}
          </div>)}
          {grupos.length === 0 && <p className="nav-empty">Nenhum módulo encontrado.</p>}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card"><span className="support-icon">✦</span><div><strong>Central de operação</strong><p>Indicadores, cadastros e rotinas em um só lugar.</p></div></div>
          <div className="sidebar-foot"><span className="mini-brand">EIXO<span>SP</span></span><span>Gestão integrada <b>•</b> v1.2</span></div>
        </div>
      </aside>
      <section className="app-main">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu-button" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">☰</button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{itemAtual.label}</strong></div></div>
          <div className="topbar-right"><span className="topbar-date">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date())}</span><span className="topbar-divider" /><div className="profile-chip"><span className="profile-avatar">ES</span><span><strong>Operações</strong><small>Gestão de frota</small></span></div></div>
        </header>
        <main className="workspace">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> EIXO SP <span className="eyebrow-dot">/</span> CONTROLE OPERACIONAL</div><h1>{itemAtual.label}</h1><p>{itemAtual.desc}. Informações organizadas para facilitar a rotina.</p></div><div className="heading-mark" aria-hidden="true"><span>{itemAtual.icon}</span></div></div>
          <ModuleErrorBoundary key={pagina}>
            <DashboardInteligente modulo={pagina} />
            <div className="module-content">{itemAtual.componente}</div>
          </ModuleErrorBoundary>
          <footer className="workspace-footer"><span><b> EIXO SP</b> · Gestão operacional de frota</span><span>Plataforma interna <i className="footer-dot" /> Interface responsiva</span></footer>
        </main>
      </section>
    </div>
  );
}
