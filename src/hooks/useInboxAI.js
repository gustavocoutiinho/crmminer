// ── Inbox AI Hook ────────────────────────────────────────────────────────────
// Provides AI-powered suggestions for inbox conversations using keyword-based rules

import { useState, useCallback, useMemo } from "react";

const KEYWORD_RULES = [
  {
    keywords: ["preço", "valor", "quanto custa", "quanto é", "preços", "tabela", "orçamento"],
    intencao: "compra",
    sentimento: "positivo",
    acao: "Enviar catálogo de produtos com preços atualizados",
    respostas: [
      "Oi {nome_cliente}! Que bom que se interessou! Vou te enviar nosso catálogo atualizado com todos os preços. Posso ajudar a escolher? 😊",
      "Olá {nome_cliente}! O valor é {valor}. Temos condições especiais de parcelamento. Quer saber mais? 💙",
      "Oi! Tenho uma condição especial pra você hoje. Posso te mostrar as opções? 🎁",
    ],
  },
  {
    keywords: ["problema", "defeito", "trocar", "troca", "reclamação", "quebrou", "descascando", "estragou", "insatisfeita", "insatisfeito"],
    intencao: "reclamacao",
    sentimento: "negativo",
    acao: "Escalar para gerente e oferecer solução imediata (troca/reembolso)",
    respostas: [
      "Oi {nome_cliente}, sinto muito por isso! Vou resolver pra você agora. Pode me enviar uma foto do problema? 🔍",
      "{nome_cliente}, peço desculpas pelo inconveniente. Já estou encaminhando para nosso time de qualidade. Vamos resolver isso rapidamente! 🙏",
      "Sinto muito por essa experiência, {nome_cliente}. Temos política de troca garantida. Vou te orientar no processo agora! ✅",
    ],
  },
  {
    keywords: ["obrigado", "obrigada", "gostei", "amei", "adorei", "excelente", "maravilhoso", "perfeito", "parabéns", "incrível"],
    intencao: "elogio",
    sentimento: "positivo",
    acao: "Agradecer e sugerir cross-sell ou programa de indicação",
    respostas: [
      "Que maravilha saber disso, {nome_cliente}! Ficamos muito felizes! Já conhece nossa coleção nova? Acho que vai amar! 😍",
      "Obrigada pelo carinho, {nome_cliente}! Sabia que você pode ganhar pontos indicando amigos? Quer saber mais? ⭐",
      "Adoramos ouvir isso! {nome_cliente}, como cliente especial, tenho uma novidade exclusiva pra te mostrar! 🎁",
    ],
  },
  {
    keywords: ["cancelar", "cancelamento", "devolver", "devolução", "reembolso", "desistir", "não quero mais"],
    intencao: "cancelamento",
    sentimento: "urgente",
    acao: "Acionar retenção: oferecer desconto especial ou benefício exclusivo",
    respostas: [
      "Oi {nome_cliente}, entendo! Antes de prosseguir, posso te oferecer uma condição especial? Temos um desconto exclusivo de 15% pra você! 💙",
      "{nome_cliente}, sinto que algo não saiu como esperado. Posso entender melhor o que aconteceu? Quero muito ajudar! 🤝",
      "Oi {nome_cliente}! Vou processar sua solicitação. Mas antes, posso te mostrar uma alternativa que pode te interessar? 🎯",
    ],
  },
  {
    keywords: ["parcelamento", "parcela", "parcelas", "cartão", "pagar", "pagamento", "pix", "boleto", "comprar"],
    intencao: "compra",
    sentimento: "positivo",
    acao: "Informar condições de pagamento e facilitar a compra",
    respostas: [
      "Oi {nome_cliente}! Temos parcelamento em até 10x sem juros no cartão e 5% de desconto no PIX! Qual prefere? 💳",
      "{nome_cliente}, ótima escolha! Posso finalizar seu pedido agora. Prefere cartão, PIX ou boleto? 🛍",
      "Claro! Temos ótimas condições. Vou te enviar o link de pagamento agora! 🔗",
    ],
  },
  {
    keywords: ["dúvida", "como funciona", "pode me explicar", "não entendi", "informação", "saber mais"],
    intencao: "duvida",
    sentimento: "neutro",
    acao: "Responder dúvida com clareza e oferecer ajuda adicional",
    respostas: [
      "Claro, {nome_cliente}! Vou te explicar direitinho. {resposta_especifica} Ficou alguma dúvida? 😊",
      "Oi {nome_cliente}! Com prazer! {resposta_especifica} Posso ajudar com mais alguma coisa? 💙",
      "{nome_cliente}, ótima pergunta! {resposta_especifica} Se precisar de mais detalhes, é só chamar! 📞",
    ],
  },
];

const DEFAULT_RESPOSTAS = [
  "Olá {nome_cliente}! Como posso te ajudar hoje? Estou à disposição! 😊",
  "Oi {nome_cliente}! Obrigada por entrar em contato. Em que posso ajudar? 💙",
  "Olá! Seja bem-vindo(a)! Estou aqui pra te ajudar no que precisar. 🙏",
];

function analyzeSentiment(text) {
  const lower = (text || "").toLowerCase();
  const negativeWords = ["problema", "defeito", "insatisfeita", "insatisfeito", "péssimo", "horrível", "reclamação", "ruim", "terrível"];
  const urgentWords = ["cancelar", "devolver", "urgente", "reembolso", "cancelamento", "advogado", "procon"];
  const positiveWords = ["obrigado", "amei", "adorei", "perfeito", "gostei", "maravilhoso", "excelente", "parabéns", "incrível"];

  if (urgentWords.some((w) => lower.includes(w))) return "urgente";
  if (negativeWords.some((w) => lower.includes(w))) return "negativo";
  if (positiveWords.some((w) => lower.includes(w))) return "positivo";
  return "neutro";
}

function detectIntention(text) {
  const lower = (text || "").toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.intencao;
    }
  }
  return "geral";
}

export default function useInboxAI() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem("inbox_ai_enabled") !== "false"; } catch { return true; }
  });

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("inbox_ai_enabled", String(next)); } catch {}
      return next;
    });
  }, []);

  const analyze = useCallback(
    (mensagens, clienteNome = "Cliente") => {
      if (!enabled || !mensagens || mensagens.length === 0) {
        return {
          sentimento: "neutro",
          intencao: "geral",
          sugestoes: DEFAULT_RESPOSTAS.map((r) => r.replace(/{nome_cliente}/g, clienteNome)),
          acao: "Responder normalmente",
        };
      }

      // Analyze last incoming messages
      const incoming = mensagens.filter((m) => m.direcao === "entrada");
      const lastMsg = incoming[incoming.length - 1];
      const allIncomingText = incoming.map((m) => m.conteudo || "").join(" ");

      const sentimento = analyzeSentiment(allIncomingText);
      const intencao = detectIntention(allIncomingText);

      // Find matching rule
      const lower = allIncomingText.toLowerCase();
      let matchedRule = null;
      for (const rule of KEYWORD_RULES) {
        if (rule.keywords.some((kw) => lower.includes(kw))) {
          matchedRule = rule;
          break;
        }
      }

      const sugestoes = matchedRule
        ? matchedRule.respostas.map((r) => r.replace(/{nome_cliente}/g, clienteNome).replace(/{resposta_especifica}/g, ""))
        : DEFAULT_RESPOSTAS.map((r) => r.replace(/{nome_cliente}/g, clienteNome));

      const acao = matchedRule ? matchedRule.acao : "Responder normalmente e entender a necessidade do cliente";

      return { sentimento, intencao, sugestoes, acao };
    },
    [enabled]
  );

  const classifyMessage = useCallback((text) => {
    return {
      sentimento: analyzeSentiment(text),
      intencao: detectIntention(text),
    };
  }, []);

  return { enabled, toggleEnabled, analyze, classifyMessage };
}
