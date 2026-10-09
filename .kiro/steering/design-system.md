---
inclusion: always
---

# Design System — Módulo 6 (Dashboard, Notificações e Chat)

Guia de identidade visual obrigatório para toda a interface do Módulo 6. Estas regras
valem para o front-end React e para qualquer HTML gerado pelo serviço.

> Fonte: "Guia de Identidade Visual — Módulo 6 · v1.0 · outubro/2026".

## Princípios

1. **A cor indica prioridade; o ícone + rótulo indicam a origem** (Code Review, GitHub,
   Curadoria, Artefatos, RAG, Relatórios, Backlog). Nunca crie uma cor por módulo — o hub
   viraria um arco-íris e a prioridade se perderia.
2. **Vermelho é exclusivo de alertas críticos.** A cor de ação (botões, links, item ativo
   do menu) é o azul-marinho `--color-primary`. O vermelho Mackenzie `--color-brand-accent`
   aparece **somente no logo**.
3. **Acessível por padrão.** Todo texto sobre fundos neutros passa em WCAG AA nos modos
   claro e escuro. Laranja (Alta) e verde (Sucesso) têm contraste menor: use-os apenas em
   bordas, ícones e selos com texto em **negrito**, nunca em texto corrido.
4. **Sempre via token.** Referencie `var(--color-...)` ou a classe Tailwind mapeada. Nunca
   escreva o hex direto no componente.

## Tokens (CSS variables)

Copie para `tokens.css` (ou `index.css`) na raiz dos estilos do front-end:

```css
:root {
  /* Marca */
  --color-primary: #1E2A5A;        /* botões, links, navbar, item ativo */
  --color-primary-hover: #2F3F7F;
  --color-brand-accent: #C8102E;   /* SOMENTE logo e detalhes de marca */

  /* Neutros (claro) */
  --color-bg: #F6F7FA;
  --color-surface: #FFFFFF;
  --color-border: #E2E5EC;
  --color-text: #1A1D29;
  --color-text-muted: #5B6275;

  /* Prioridade */
  --color-priority-critical: #DC2626;
  --color-priority-high: #EA580C;
  --color-priority-medium: #B45309;
  --color-priority-low: #64748B;
  --color-success: #16A34A;

  /* Gráficos (use nesta ordem) */
  --chart-1: #3B5BDB;
  --chart-2: #0EA5A4;
  --chart-3: #8B5CF6;
  --chart-4: #F59E0B;
  --chart-5: #EC4899;

  /* Tipografia */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 32px;
}

[data-theme="dark"] {
  --color-bg: #0F1220;
  --color-surface: #181C2E;
  --color-border: #2A2F45;
  --color-text: #E8EAF2;
  --color-text-muted: #9AA0B4;
}

.metric { font-variant-numeric: tabular-nums; }
```

## Mapeamento no Tailwind (`theme.extend`)

```ts
// tailwind.config.ts
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "brand-accent": "var(--color-brand-accent)",
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "priority-critical": "var(--color-priority-critical)",
        "priority-high": "var(--color-priority-high)",
        "priority-medium": "var(--color-priority-medium)",
        "priority-low": "var(--color-priority-low)",
        success: "var(--color-success)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        md: "var(--text-md)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
      },
    },
  },
};
```

## Mapa de prioridade ↔ cor

A prioridade vinda da IA (`critical | high | medium | low`) define a cor da borda e do selo.
O MVP usa estes quatro níveis (o README cita P1–P4; `critical=P1`, `high=P2`, `medium=P3`,
`low=P4`).

| Prioridade | Token                        | Hex       | Uso                                  |
|------------|------------------------------|-----------|--------------------------------------|
| critical   | `--color-priority-critical`  | `#DC2626` | Falha de segurança, build quebrado   |
| high       | `--color-priority-high`      | `#EA580C` | Review pedindo mudanças, PR bloqueado|
| medium     | `--color-priority-medium`    | `#B45309` | Comentário em PR, gargalo detectado  |
| low        | `--color-priority-low`       | `#64748B` | Notícias e sugestões da curadoria    |
| (sucesso)  | `--color-success`            | `#16A34A` | Review aprovado, deploy concluído    |

## Card de notificação (anatomia obrigatória)

- Borda esquerda de **4px** na cor da prioridade.
- **Selo** de prioridade (texto em negrito, maiúsculas).
- **Origem** com ícone + rótulo em `--color-text-muted` (texto secundário).
- **Título** (peso 600) e **resumo** (peso 400).
- **Horário relativo** (ex.: "há 5 minutos") em `--color-text-muted`, 12px.

## Tipografia

- **Inter** para toda a interface. Pesos: 400 (corpo), 500 (botões/rótulos), 600 (títulos/números).
- **JetBrains Mono** só para código, nomes de branch e hashes de commit — nunca em texto corrido.
- Escala: 32 (display) · 24 (H1) · 20 (H2) · 16 (corpo destacado/botões) · 14 (corpo) · 12 (legenda).
- Nunca use peso abaixo de 400 nem texto menor que 12px.
- Aplique `font-variant-numeric: tabular-nums` (classe `.metric`) em **todo número que se
  atualiza em tempo real** no dashboard.

## Gráficos

- Use `--chart-1..5` na ordem para séries de métricas (commits, PRs, reviews, User Stories).
- **Não** use cores de gráfico para comunicar status, nem cores de prioridade em gráficos.

## Faça / Evite

**Faça**
- Azul-marinho `#1E2A5A` em todas as ações primárias.
- Cores de prioridade só para urgência: borda do card, selo e contador de não lidas.
- Identifique a origem com ícone + rótulo em texto secundário.
- Suporte a modo claro e escuro, layout responsivo e contraste WCAG AA.

**Evite**
- Botões ou destaques em vermelho (vermelho = crítico).
- Uma cor diferente por módulo.
- Laranja/verde em texto corrido.
- Hex direto no componente.
