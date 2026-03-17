# ROADMAP — Growth CRM Miner

## Sprint 0 — Fundação (AGORA)
> Sem isso, nada funciona. Prioridade absoluta.

- [ ] **Supabase funcional** — criar novo projeto ou reativar
- [ ] **Rodar migration SQL** — 9 tabelas, RLS, triggers, RFM
- [ ] **Auth real** — login via Supabase Auth, 4 roles
- [ ] **Sync Shopify → Supabase** — clientes e pedidos reais persistidos
- [ ] **CRUD funcional** — clientes, pedidos salvam no banco
- [ ] **RFM automático** — calculado no banco, não só no frontend
- [ ] **Deploy com tudo conectado**

## Sprint 1 — CRM Core funcional
- [ ] Timeline do cliente (histórico unificado)
- [ ] Tarefas com persistência
- [ ] Perfis de acesso (Miner/Dono/Gerente/Vendedor) com RLS
- [ ] Dashboard com dados reais do banco
- [ ] Campanhas com persistência

## Sprint 2 — Suri + WhatsApp
- [ ] Suri Connector (config, test, sync)
- [ ] Webhook endpoint (handshake + events)
- [ ] Inbox básica (mensagens Suri no CRM)
- [ ] Envio de mensagem via API Suri
- [ ] Timeline: mensagens WhatsApp no perfil do cliente

## Sprint 3 — Automações essenciais
- [ ] Motor de automação (event → action)
- [ ] Carrinho abandonado → WhatsApp
- [ ] Pós-venda automático
- [ ] Reativação de inativos
- [ ] Templates de mensagem

## Sprint 4 — BI + Relatórios
- [ ] Dashboard executivo (LTV, recompra, cohort)
- [ ] Relatórios de campanha
- [ ] Relatórios de atendimento
- [ ] RFM visual com clusters

## Sprint 5+ — Growth
- [ ] Fidelidade
- [ ] Indique um amigo
- [ ] Cross-sell
- [ ] IA na inbox
- [ ] Gerador de campanhas
