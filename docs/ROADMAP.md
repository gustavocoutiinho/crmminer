# ROADMAP — Growth CRM Miner

## Sprint 0 — Fundação ✅ COMPLETO
- [x] PostgreSQL local funcional (11MB, 14 tabelas)
- [x] Auth real com bcrypt + sessions + Bearer token
- [x] Sync Shopify → Postgres (5126 clientes, 690 pedidos)
- [x] CRUD funcional em todas as tabelas
- [x] RFM automático calculado por quintis
- [x] Cloudflare Tunnel ativo

## Sprint 1 — CRM Core funcional ✅ COMPLETO
- [x] Timeline do cliente (histórico unificado)
- [x] Tarefas com persistência + CRUD
- [x] Perfis de acesso (Miner/Dono/Gerente/Vendedor)
- [x] Dashboard com dados reais do banco
- [x] Campanhas com persistência
- [x] Clientes com paginação, busca debounce, sort por coluna
- [x] Modal de detalhe do cliente (pedidos, timeline, notas editáveis)
- [x] Import de dados real (salva no banco)
- [x] Criar usuários via API
- [x] Owner dashboard com MRR real
- [x] Configurações salvam no banco

## Sprint 2 — Suri + WhatsApp ⚡ BACKEND PRONTO
- [x] Webhook Suri (handshake + events)
- [x] Endpoint de envio de mensagem
- [x] Inbox com conversas e thread
- [x] Templates de mensagem com CRUD
- [x] Integrações com config, test, status
- [ ] **PENDENTE:** Credenciais Suri para conectar

## Sprint 3 — Automações ✅ COMPLETO
- [x] Motor de automação (event → action)
- [x] 5 automações pré-configuradas
- [x] Preview: quantos clientes seriam impactados
- [x] Tela completa: listar, criar, editar, ativar/desativar
- [x] Webhook Shopify integrado (pedidos + carrinhos)
- [ ] Execução real das automações (precisa Suri/WhatsApp)

## Sprint 4 — BI + Relatórios ✅ COMPLETO
- [x] Dashboard executivo (LTV, recompra, cohort)
- [x] Segmentação RFM visual com recálculo
- [x] Receita por canal
- [x] Cohort de cadastro por mês

## Sprint 5 — Customer Intelligence ✅ COMPLETO
- [x] Churn score (0-100) por cliente
- [x] Score de engajamento
- [x] Próxima melhor ação sugerida (cross-sell, upsell, reengajar, reativar, win_back)
- [x] Tela de inteligência com distribuição e ações pendentes

## Sprint 6 — UX & Produtividade ✅ COMPLETO
- [x] Notificações in-app com sino
- [x] Activity log / auditoria
- [x] Busca global (Cmd+K)
- [x] Inbox / mensagens com thread
- [x] Integrações reais com test de conexão
- [x] Templates com categorias e preview

## Próximos
- [ ] Deploy Vercel (precisa token)
- [ ] Push GitHub (precisa token write)
- [ ] Domínio customizado (crm.minerbz.com.br)
- [ ] Conectar Suri (credenciais)
- [ ] Execução real de automações
- [ ] Fidelidade + Indique um amigo
- [ ] Push web, SMS
- [ ] IA na inbox
- [ ] Multi-tenant completo
