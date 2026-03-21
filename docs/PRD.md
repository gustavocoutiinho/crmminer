# PRD — Growth CRM + Retention Engine + Atendimento Multicanal + Integração Suri

> Documento de produto completo. Referência para todas as fases de desenvolvimento.
> Criado: 2026-03-17

## Visão

Plataforma híbrida de CRM comercial + CRM de cliente + motor de automação de crescimento para operações de e-commerce, varejo, recompra e relacionamento.

## 3 resultados de negócio

1. Aumentar valor médio dos pedidos
2. Aumentar frequência de compra
3. Aumentar retenção, fidelização e recompra desde o primeiro mês

## 4 perfis de acesso

- **Miner** (super admin) — arquitetura, governança, multi-tenant
- **Dono da Loja** — operação completa da sua conta
- **Gerente** — tático-operacional
- **Vendedor** — linha de frente

## 5 macrocamadas

1. CRM Core
2. Growth Automation
3. Customer Intelligence
4. Omnichannel Support
5. Integration Layer

## Ciclo do sistema

captura dados → organiza cliente → segmenta comportamento → aciona automações → envia campanhas → suporta atendimento → mede resultado → realimenta segmentação → repete

---

## MVP (Fase 1)

- CRM core (contatos, empresas, pipeline, tarefas)
- Segmentação básica + RFM
- Timeline do cliente
- Automações essenciais (carrinho abandonado, pós-venda)
- Newsletter
- WhatsApp via Suri
- Inbox básica
- Relatórios principais
- Perfis de acesso (4 níveis)

## Fase 2

- Fidelidade + Indique um amigo
- Push web, SMS
- Camadas web / pop-ups
- Cross-sell inteligente
- IA na inbox
- Gerador de campanhas
- BI avançado

## Fase 3

- Orquestração omnichannel avançada
- Recomendação preditiva
- Score de churn / recompra
- Motor de próxima melhor ação
- Automação por coorte
- Benchmarking entre lojas

---

## Integração Suri

### API
- URL base: endpoint do chatbot + `/api`
- Auth: Bearer Token
- Usos: importar contato, listar contatos, enviar mensagem, listar mensagens

### Webhook
- Handshake: GET → responder HTTP 200 com ID do chatbot
- Eventos: POST na mesma URL
- Eventos: novo contato, troca de fila, fim de atendimento, mensagem recebida

### Flow
- Via dupla com chamadas HTTP
- Ativação de fluxos por gatilhos
- IA → serviço externo: Suri NÃO envia token no POST (proteger por domínio)

---

## Métricas de sucesso

- Redução abandono sem recuperação
- Aumento receita clientes recorrentes
- Melhora ticket médio
- Redução tempo operacional
- Melhora velocidade atendimento
- Uso real das automações
- Uso real WhatsApp integrado à régua
- Capacidade de segmentar e agir sobre base
