# Controle de acesso por matrícula — Eixo SP

## O que está implementado
- Tela de bloqueio antes da montagem do menu.
- Validação de matrícula no backend (Cloud Function), consultando `funcionarios.Matricula`.
- Sessão de conveniência local por até 180 dias; botão Sair remove a sessão.
- A função retorna somente matrícula e nome, não o documento completo do funcionário.
- A matrícula 7460 **não** recebe privilégio administrativo. Inserir/editar não deve ser considerado autorizado por este mecanismo.
- Regras Firestore em modo fail-closed: o navegador não pode ler nem gravar coleções diretamente.

## Limitação explícita
Matrícula é identificador, não prova de identidade. Qualquer pessoa que conheça uma matrícula pode digitá-la. O valor guardado no localStorage é editável e não é token assinado. Esta solução é uma barreira de interface, não autenticação forte. Não use a sessão para autorizar dados pessoais, escrita, funções administrativas ou acesso a documentos.

## Onde cadastrar matrículas
A fonte é a coleção `funcionarios` do Firestore, campo string `Matricula`. A função busca igualdade exata. Garanta que os valores importados estejam normalizados como texto, sem espaços. Não coloque a lista de funcionários no frontend nem em variáveis de ambiente do Vite.

## Configurações necessárias para ativar
1. Ative faturamento Blaze no projeto Firebase se exigido para Cloud Functions.
2. Confirme que a conta de serviço usada no GitHub Actions tem permissões de deploy de Cloud Functions e regras do Firestore.
3. Publique as dependências de `functions/` e faça deploy de `validarMatricula`.
4. Publique `firestore.rules`. As regras são intencionalmente restritivas e farão os módulos que consultam Firestore falharem até que uma autenticação real e regras específicas por coleção sejam implementadas.
5. Para liberar dados de operação, escolha um provedor de autenticação (por exemplo, Firebase Authentication com provedor corporativo) e regras de acesso por coleção. Para admin, atribua custom claims exclusivamente no servidor após autenticação real; não confie em `matricula === "7460"` no cliente.
6. Para segurança adicional contra abuso, configure Firebase App Check e limites/monitoramento para a callable function.
7. O painel de visitantes não é ativado por esta versão, pois contagens baseadas em matrícula/cookie podem ser falsificadas e revelar nomes/matrículas. Só implemente esse painel após definir autenticação e quem pode ver os registros.

## Coleções e dados pessoais
As regras deny-all são o padrão seguro. Antes de habilitar a aplicação operacional novamente, audite cada coleção usada por `src/` e conceda somente as leituras/gravações necessárias por perfil. Não troque por regras abertas como `allow read, write: if true`.
