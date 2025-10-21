Controle de Apostas Impulsivas — Plano de Testes (R1.0)

Trabalho prático – Parte A (manuais) + Parte B (automação)
Projeto focado em prevenção de apostas impulsivas com limites diário/semanal/mensal, bloqueio e autoexclusão.

📌 Acesso para correção (Azure Boards)

Projeto (Boards): https://dev.azure.com/RM94618/Case%20apostas%20impulsivas

Query – Testes Manuais: <cole o link da query “R1.0 – Testes Manuais”>

Query – Bugs Abertos: <cole o link da query “R1.0 – Bugs Abertos”>

⚠️ Professor adicionado como membro da organização/projeto em Organization settings → Users.

🎥 Vídeo dos testes automatizados (Parte B)

YouTube (não listado): ----------------------------------------------------------------------------------------------------------

O vídeo mostra: configuração do Postman, execução da collection no Runner e todos os testes PASS.

🧪 Automação (API com Postman)

Arquivos no repositório:

/tests/Postman_ControleApostasImpulsivas_Collection.json

Como rodar

Inicie a API (use a sua ou a mini-API abaixo).

Importe a collection no Postman.

Na collection, Variables → baseUrl = http://localhost:3333 (ou sua URL).

Crie/Selecione o Environment “Local” (variável token vazia).

Abra o Runner → Environment Local → Start Run.

O que a collection valida

Login → 200 e salva {{token}}.

Definir limites (50/200/500) → 200/201.

Registrar aposta (OK) → 201 e remainingDaily = 20.

Registrar aposta (bloqueada) → 4xx e mensagem contendo “limite”.

Dados controlados: usuário user01@teste.com / Senha@123; limites 50/200/500; apostas 30 (ok) e 40 (bloqueio).

🔌 Mini-API (opcional, para reproduzir facilmente)

Se você não tiver uma API própria, use a mini-API (Node + Express) que simula o sistema e atende a collection.

Instalar Node LTS (https://nodejs.org
)

Criar pasta e instalar deps:

mkdir mini-api-apostas && cd mini-api-apostas
npm init -y
npm i express cors


Criar server.js e colar o código da mini-API (tem /auth/login, /limits, /bets, /self-exclusion, /reports/month, /reports/export.csv).

Rodar:

node server.js


Saída esperada: Mini API rodando em http://localhost:3333

Usuário padrão: user01@teste.com / Senha@123.
Limites iniciais: 50/200/500 (pode alterar via PUT /limits).
Em memória (reiniciar = limpar dados).

✅ Parte A — Testes manuais (no Azure Boards)

Os 12 Test Cases foram criados com dados controlados e estão relacionados aos PBIs.
Execução registrada no campo Discussion de cada TC (formato RUN AAAA-MM-DD HH:MM — PASS/FAIL).

Dados de teste padronizados

Usuário principal: user01@teste.com / Senha@123

Usuário secundário (TC12): user02@teste.com / Senha@123

Limites: Diário 50 | Semanal 200 | Mensal 500

Apostas: 30 (ok), 10 (alerta 80%), 40 (bloqueio), 160 (para fechar semanal, se necessário)

Lista de TCs (títulos)

TC01 – Login válido

TC02 – Login inválido

TC03 – Salvar limites 50/200/500

TC04 – Aposta R$30 → restante diário R$20

TC05 – Alerta 80% (R$40/50)

TC06 – Bloqueio ao exceder limite diário

TC07 – Fechar limite semanal (R$200)

TC08 – Ativar autoexclusão 7 dias

TC09 – Apostar durante autoexclusão

TC10 – Relatório do mês atual

TC11 – Exportar CSV

TC12 – Segurança: acesso indevido por URL direta

Execução & Evidências

Discussion de cada TC contém RUN … — PASS/FAIL + referência às evidências/anexos.

Bugs abertos em caso de FAIL e relacionados ao TC e ao PBI.

🔗 Rastreabilidade (Feature → TCs & Automação)
Feature	Casos Manuais	Automação Postman
F1 Autenticação	TC01, TC02	Login (salva token)
F2 Limites	TC03	Definir limites (50/200/500)
F3 Registro & Restantes	TC04, TC07	Registrar aposta (OK) → remainingDaily=20
F4 Bloqueio & Autoexclusão	TC06, TC08, TC09	Registrar aposta (bloqueada)
F5 Alertas 80/100%	TC05	—
F6 Relatórios & CSV	TC10, TC11	—
🧭 Sprints & Release

Sprint 1: F1 (Login/Logout), F2 (Limites)

Sprint 2: F3 (Apostas/Restantes), F4 (Bloqueio/Autoexclusão)

Sprint 3: F5 (Alertas), F6 (Relatórios/CSV)

Todos os PBIs/TCs estão com Iteration coerente. (Links nas Queries do Boards.)

🗂 Estrutura do repositório
/tests/
  Postman_ControleApostasImpulsivas_Collection.json
README.md

🧰 Como reproduzir (resumo rápido)

API pronta em http://localhost:3333 (ou use a mini-API).

Postman: importar a collection → baseUrl configurado → Environment Local selecionado.

Runner: rodar a collection → ver Tests PASS.

Boards: abrir Queries (Testes Manuais / Bugs Abertos) para correção.

🆘 Troubleshooting

Aposta OK falhou com 422: a API já tinha aposta do mesmo dia (execuções anteriores).
→ Reinicie a API ou use timestamp dinâmico no Pre-request Script.

Token não salvo: selecione Environment Local antes de rodar o Login.

Campo diferente (ex.: remaining_daily): ajuste o script do teste para aceitar ambos.

Porta/URL diferente: atualize baseUrl na collection.

📝 Créditos

Equipe: Enzo Sartorelli / Eduardo Nistal / Rodrigo Viana / Kaue Pastori / Nicolas Boni
