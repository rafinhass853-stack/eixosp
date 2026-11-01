// src/Menu.jsx
import { useState } from 'react';
import Condutores from './Condutores';
import Veiculos from './Veiculos';
import Funcionarios from './Funcionarios';
import TicketLog from './TicketLog';
import Cobli from './Cobli';
import Multas from './Multas';

/* ============================================================
   ITENS DO MENU
   Para adicionar uma nova página:
   1. Crie o componente (ex.: src/Veiculos.jsx)
   2. Importe aqui em cima
   3. Adicione um objeto em MENU com { key, label, icon, componente }
============================================================ */
const MENU = [
  {
    key: 'condutores',
    label: 'Condutores',
    icon: '👤',
    componente: <Condutores />,
  },
  {
  key: 'multas',
  label: 'Multas',
  icon: '🚨',
  componente: <Multas />,
},
  
  {
  key: 'ticketlog',
  label: 'Ticket Log',
  icon: '🎫',
  componente: <TicketLog />,
},
  {
    key: 'veiculos',
    label: 'Veículos',
    icon: '🚗',
    componente: <Veiculos />,
  },
  {
  key: 'funcionarios',
  label: 'Funcionários',
  icon: '🧑‍💼',
  componente: <Funcionarios />,
},
{
  key: 'cobli',
  label: 'Cobli',
  icon: '📡',
  componente: <Cobli />,
},
  // Exemplo de próximos itens (descomente quando criar os componentes):
  // {
  //   key: 'checklists',
  //   label: 'Checklists',
  //   icon: '📋',
  //   componente: <Checklists />,
  // },
];

export default function Menu() {
  const [pagina, setPagina] = useState('condutores');

  const itemAtual = MENU.find((m) => m.key === pagina);

  return (
    <div className="min-h-screen flex bg-surface text-ink font-sans">
      {/* ===================== SIDEBAR ===================== */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo / título */}
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-brand-700">Frota</h1>
          <p className="text-xs text-muted">Gestão de condutores</p>
        </div>

        {/* Itens de navegação */}
        <nav className="flex-1 p-3 space-y-1">
          {MENU.map((item) => {
            const ativo = pagina === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setPagina(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition ${
                  ativo
                    ? 'bg-brand-600 text-white font-semibold'
                    : 'text-ink hover:bg-surface'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Rodapé opcional */}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-muted">
          v1.0
        </div>
      </aside>

      {/* ===================== CONTEÚDO ===================== */}
      <div className="flex-1 min-w-0">
        {/* Header do topo (opcional — o Condutores tem o próprio header) */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{itemAtual?.label || '—'}</h2>
        </header>

        <main className="p-6">{itemAtual?.componente}</main>
      </div>
    </div>
  );
}