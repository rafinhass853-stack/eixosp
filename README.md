# Eixo SP — Gestão de Multas

Aplicação React + Vite + Tailwind + Firebase para acompanhamento operacional de multas de trânsito.

## Recursos da primeira versão
- Dashboard de multas abertas, prazos vencidos e valores em aberto.
- Busca por placa, AIT, condutor e responsável.
- Cadastro manual de multa e status operacional.
- Importação de Excel com seleção de aba, prévia e deduplicação por AIT sem sobrescrever registros existentes.
- Registro de auditoria para cadastros e importações.
- Autenticação Google e sincronização de dados com Firestore.

## Desenvolvimento
1. Use Node.js 20 ou superior.
2. Copie `.env.example` para `.env.local` e preencha as variáveis do app web Firebase.
3. Ative Google como provedor em Firebase Authentication.
4. Execute `npm install` e `npm run dev`.

## Publicação
O workflow do GitHub Actions publica no Firebase Hosting quando há push em `main`. Configure os secrets do repositório:
- `FIREBASE_SERVICE_ACCOUNT_EIXOSPGESTAOFROTAS` (JSON da conta de serviço de implantação)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Segurança antes de produção
- Nunca coloque credenciais administrativas no frontend nem em arquivos versionados.
- As regras atuais exigem usuário autenticado. Antes de produção corporativa, restrinja acesso a e-mails/domínios autorizados ou use custom claims.
- A importação da primeira versão importa a aba selecionada como multas; ela ainda não distribui automaticamente as abas de condutores, veículos e funcionários em coleções separadas.
- Confira a prévia antes de gravar e teste com poucos registros.
- O arquivo `firestore.rules` precisa ser revisado e publicado no Firebase com autorização antes de operar dados reais.
