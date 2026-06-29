import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Linkedin } from "lucide-react";
import vougaLado from "@/assets/vougalado.png";
import sunMethodology from "@/assets/sun-methodology.svg";
import logoPreto from "@/assets/logopreto.png";

export const Route = createFileRoute("/_app/sobre")({
  component: SobrePage,
});

const HERO = {
  brand: "Vouga Agency · o que fazemos",
  lede: "A Vouga ajuda empresas a inovar e a modernizar-se. Lemos a empresa como um sistema, melhoramos o que já existe, construímos o que falta e formamos as pessoas que mantêm tudo a mover-se. Usamos as tecnologias e frameworks mais revolucionárias do momento, com a IA à cabeça, mas a nossa constante não é uma ferramenta, é o pensamento sistémico que metemos em todos os trabalhos.",
};

const PILLARS = [
  { word: "Intelligence", grad: "grad-int", body: "Melhora o que já existe. Modernização e otimização do trabalho que já move o negócio, com IA e outras tecnologias atuais: automatizar processos, ativar o conhecimento interno, dar deploy de copilotos, reduzir custos e libertar tempo." },
  { word: "Foundations", grad: "grad-found", body: "Cria o que ainda não existe. Da ideia ao sistema validado, construído só depois de percebermos o risco. É aqui que vive a investigação e os MVPs, com ou sem IA. Levamos uma ideia do conceito a um produto funcional e entregamos as chaves." },
  { word: "Academy", grad: "grad-acad", body: "Forma quem constrói. A ponte de talento e de formação, ligada à academia, que traz conhecimento real a quem vai trabalhar connosco e aproxima o tecido empresarial das pessoas que se estão a formar." },
];

const AREAS = [
  "Diagnóstico e auditoria de processos, para perceber onde se perde tempo, custo e oportunidade.",
  "Ativação do conhecimento interno, organizando documentos, processos e know-how disperso para responder com fonte, tipicamente com RAG.",
  "Automação e copilotos, que tiram fricção a tarefas e workflows do dia a dia.",
  "Capacitação de equipas, no trabalho real delas e não em formação genérica.",
  "Investigação, desenvolvimento de novos produtos e MVPs, da validação à construção.",
];

const AREA_TITLES = [
  "Diagnóstico",
  "Conhecimento interno",
  "Automação",
  "Capacitação",
  "Novos produtos",
];

const DISTINGUE: [string, string][] = [
  ["Visão sistémica", "Desenha para a raiz e não para o sintoma, e está em tudo o que fazemos."],
  ["AI natives", "Sem os vícios de quem só conheceu o trabalho antes destas tecnologias."],
  ["Velocidade e iniciativa", "Fechamos o ciclo depressa e damos deploy cedo."],
  ["Relação próxima", "Acompanhamento e aprendizagem contínua ao longo do projeto."],
  ["Proximidade ao território", "Conhecemos por dentro o tecido industrial que servimos."],
];

const FOUNDERS_LINKS: [string, string][] = [
  ["Miguel Correia", "https://www.linkedin.com/in/miguelsilvacorreia/"],
  ["Afonso Roque", "https://www.linkedin.com/in/afonso-roque-aa8b38325/?skipRedirect=true"],
  ["Inês Brandão", "https://www.linkedin.com/in/in%C3%AAs-santos-brand%C3%A3o/"],
];

type Block = { p: string } | { quote: string } | { list: string[] } | { pillars: true } | { steps: [string, string][] } | { note: string };

const SECTIONS: { n: string; heading: string; motif?: boolean; blocks: Block[] }[] = [
  {
    n: "01", heading: "O problema que resolvemos",
    blocks: [
      { p: "Entre a investigação, a IA e a mudança operacional, muitas empresas perdem momentum. Não por falta de potencial, mas porque o sistema não está preparado para validar, construir e transformar novas capacidades em operação." },
      { p: "Ajudamos as empresas a adotar processos novos e modernos, dos dois lados da moeda: na criação, na investigação e no desenvolvimento de novos produtos, e na redução de custos e otimização de processos que já existem. Fazemo-lo com tecnologias e frameworks revolucionárias, com destaque para a IA, mas não só. Quando faz sentido construir sem IA, construímos na mesma. O que não muda é a forma de pensar o problema." },
    ],
  },
  {
    n: "02", heading: "Como pensamos", motif: true,
    blocks: [
      { p: "O que nos atravessa, do mais pequeno MVP ao maior sistema de IA, é a visão sistémica. Não tratamos sintomas, procuramos a origem do problema. Olhamos para a empresa como aquilo que ela é, um sistema de pessoas, decisões, ferramentas, documentos e incentivos a moverem-se em conjunto, e só depois decidimos onde e como intervir. Em vez de moldar tudo à visão de uma só pessoa, juntamos a equipa, ouvimos as várias leituras e desenhamos a solução para a raiz. Chamamos-lhe a Sun methodology: find the origin of the problem." },
      { quote: "Nenhuma funcionalidade sem contexto, nenhuma automação sem compreender o sistema." },
      { p: "É este pensamento, e não uma tecnologia em concreto, que é transversal a tudo o que fazemos." },
    ],
  },
  {
    n: "03", heading: "Os três pilares",
    blocks: [
      { p: "A empresa organiza-se em três pilares, ligados no mesmo sistema." },
      { pillars: true },
      { p: "A leitura é simples: o Intelligence melhora o que existe, a Foundations cria o que não existe, a Academy forma quem o faz. E a visão sistémica está nos três." },
    ],
  },
  {
    n: "04", heading: "As nossas áreas de trabalho",
    blocks: [
      { p: "A oferta concreta evolui com o mercado, por isso descrevemo-la por áreas, não por um catálogo fechado. Trabalhamos sobretudo em:" },
      { list: AREAS },
      { p: "No arranque, concentramo-nos no tecido industrial da nossa região, onde temos encaixe e proximidade, sem nos fecharmos a outros setores quando o problema é o certo." },
    ],
  },
  {
    n: "05", heading: "Como trabalhamos",
    blocks: [
      { p: "Entramos sempre pela mesma porta: um diagnóstico. Antes de prometer o que quer que seja, percebemos a origem do problema e definimos com rigor o que deve ser construído à volta dele. A partir daí, o trabalho desenrola-se numa escada de três degraus: um sprint curto para perceber e priorizar, uma implementação inicial para pôr o primeiro sistema nas mãos da equipa, e uma fase de parceria contínua para manter, melhorar e acrescentar. Acompanhamos de perto do início ao fim, com versões cedo, feedback contínuo e aprendizagem embutida no projeto. Não desaparecemos depois da entrega." },
    ],
  },
  {
    n: "06", heading: "Porquê Vouga",
    blocks: [
      { p: "O nome vem do território. Os fundadores são do Entre Douro e Vouga, o eixo industrial que liga Santa Maria da Feira, Oliveira de Azeméis, São João da Madeira e Vale de Cambra. Escolhemos este mercado de propósito, porque é a nossa casa e porque é um dos territórios industriais mais densos do país." },
      { p: "Os números explicam a escolha. Somados, estes cinco concelhos têm cerca de 273 mil habitantes em 861 km², com perto de 115 mil pessoas ao serviço nas empresas, das quais cerca de 53,7 mil na indústria transformadora. São cerca de 34,5 mil empresas, com um volume de negócios de cerca de 11,9 mil milhões de euros e exportações de bens na ordem dos 3,9 mil milhões." },
      { p: "A leitura mais forte é esta: representam apenas cerca de 2,6% da população portuguesa e menos de 1% do território, mas concentram cerca de 7,1% do emprego nacional da indústria transformadora, 5,6% do volume de negócios industrial transformador e 5,1% das exportações nacionais de bens. É uma sobrerrepresentação industrial enorme." },
      { p: "E é uma indústria especializada: calçado, couro e marroquinaria, cortiça e madeira, moldes, plásticos e componentes automóveis, metalomecânica, maquinaria e aço inox, embalagem metálica, agroalimentar e lacticínios, e têxtil técnico. Um tecido de pequena e média indústria, exportadora e muito especializada, que precisa de inovar e modernizar processos mas raramente tem o sistema interno para o fazer." },
      { p: "É aqui que entra a Vouga. Falamos a língua destas empresas, estamos fisicamente perto e foi neste território que crescemos. É o nosso encaixe, e é uma vantagem que ninguém de fora copia." },
      { note: "Fonte dos indicadores: GEE/INE, 2023, por concelho. As percentagens face ao total nacional são cálculo próprio a partir desses dados." },
    ],
  },
  {
    n: "07", heading: "O que nos distingue",
    blocks: [
      { p: "Distinguimo-nos por cinco coisas, e a tecnologia por baixo não é nenhuma delas." },
      { steps: DISTINGUE },
      { p: "É isto que nos torna parceiros e não revendedores. A tecnologia por baixo é uma peça que se troca; o valor que fica, os dados, os processos, a avaliação e a memória da empresa, é do cliente. Trabalhamos para somar saber humano à inteligência da casa, não para criar dependência de uma ferramenta." },
    ],
  },
  {
    n: "08", heading: "Cultura e equipa",
    blocks: [
      { p: "A Vouga é construída por engenheiros com muita iniciativa e pensamento sistémico. Assumimos os problemas de ponta a ponta e estamos a construir uma casa para o melhor talento técnico jovem: pessoas que querem responsabilidade antes de títulos." },
      { p: "Não competimos por salário, competimos por ownership e por ambiente. Queremos ser o polo do melhor talento jovem do norte, com uma seletividade e um prestígio que se reforçam. A equipa é a marca, e o ownership ganha-se: quem se prova cresce em responsabilidade e em participação, por objetivos. É o oposto do modelo em que se enterra talento debaixo de títulos vazios e sem reconhecimento." },
      { p: "Os fundadores são o Miguel Correia, o Afonso Roque e a Inês Brandão, com perfis que combinam estratégia, produto, mercado, pessoas e engenharia, e raízes no mesmo território industrial que servimos." },
    ],
  },
];

// ---------- export ----------
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const GRAD_CSS = `.grad{background-image:linear-gradient(108deg,var(--ga),var(--gb) 55%,var(--gc));-webkit-background-clip:text;background-clip:text;color:transparent}.gi{--ga:#8a4fff;--gb:#c0531e;--gc:#c97800}.gf{--ga:#0d4a1a;--gb:#1d8a35;--gc:#1d8a35}.ga{--ga:#0d3a6a;--gb:#2f7ad0;--gc:#2f7ad0}`;
const GRAD_SHORT: Record<string, string> = { "grad-int": "gi", "grad-found": "gf", "grad-acad": "ga" };
const LINKEDIN_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>`;
function exportParagraphs(blocks: Block[]) {
  return blocks.filter((b): b is { p: string } => "p" in b);
}
function exportSectionBody(s: (typeof SECTIONS)[number]) {
  const ps = exportParagraphs(s.blocks);
  if (s.n === "01") {
    return `<div class="problem-grid"><div class="card beige"><span>Momentum</span><p>${esc(ps[0]?.p ?? "")}</p></div><div class="card cream"><span>Intervenção</span><p>${esc(ps[1]?.p ?? "")}</p></div></div><div class="mini-row"><b>validar</b><b>construir</b><b>operar</b></div>`;
  }
  if (s.n === "03") {
    return `<p>${esc(ps[0]?.p ?? "")}</p><div class="pillars">${PILLARS.map((p) => `<div class="pillar"><div class="pname">Vouga<br><span class="grad ${GRAD_SHORT[p.grad]}">${esc(p.word)}</span></div><p>${esc(p.body)}</p></div>`).join("")}</div><p>${esc(ps[1]?.p ?? "")}</p>`;
  }
  if (s.n === "04") {
    return `<p>${esc(ps[0]?.p ?? "")}</p><div class="area-grid">${AREAS.map((area, i) => `<div class="area"><span>0${i + 1}</span><h3>${esc(AREA_TITLES[i])}</h3><p>${esc(area)}</p></div>`).join("")}</div><p>${esc(ps[1]?.p ?? "")}</p>`;
  }
  if (s.n === "05") {
    return `<p>${esc(ps[0]?.p ?? "")}</p><div class="process">${["diagnóstico", "sprint curto", "implementação inicial", "parceria contínua"].map((step, i) => `<div><span>0${i + 1}</span><h3>${esc(step)}</h3></div>`).join("")}</div>`;
  }
  if (s.n === "06") {
    const note = s.blocks.find((b): b is { note: string } => "note" in b);
    const metrics = [["273 mil", "habitantes"], ["861 km²", "território"], ["115 mil", "pessoas ao serviço"], ["53,7 mil", "na indústria transformadora"], ["34,5 mil", "empresas"], ["11,9 mil M€", "volume de negócios"], ["3,9 mil M€", "exportações de bens"], ["7,1%", "emprego nacional industrial"]];
    return `<div class="vouga-grid"><div class="card cream"><span>Território</span><p>${esc(ps[0]?.p ?? "")}</p></div><div class="metrics">${metrics.map(([v, l]) => `<div><strong>${esc(v)}</strong><small>${esc(l)}</small></div>`).join("")}</div></div><div class="triple">${ps.slice(1, 4).map((p, i) => `<div><span>0${i + 1}</span><p>${esc(p.p)}</p></div>`).join("")}</div><div class="dark-card"><p>${esc(ps[4]?.p ?? "")}</p></div>${note ? `<p class="note">${esc(note.note)}</p>` : ""}`;
  }
  if (s.n === "08") {
    return `<div class="culture"><div class="dark-card big"><span>ownership antes de títulos</span><p>${esc(ps[0]?.p ?? "")}</p></div><div class="area"><span>ambiente</span><p>${esc(ps[1]?.p ?? "")}</p></div><div class="names">${FOUNDERS_LINKS.map(([name, href]) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${LINKEDIN_SVG}<span>${esc(name)}</span></a>`).join("")}</div><div class="card cream"><span>equipa fundadora</span><p>${esc(ps[2]?.p ?? "")}</p></div></div>`;
  }
  return s.blocks.map((b) => {
    if ("p" in b) return `<p>${esc(b.p)}</p>`;
    if ("quote" in b) return `<blockquote>${esc(b.quote)}</blockquote>`;
    if ("note" in b) return `<p class="note">${esc(b.note)}</p>`;
    if ("steps" in b) return `<ol class="steps">${b.steps.map(([t, d], i) => `<li><span>0${i + 1}</span><b>${esc(t)}</b><p>${esc(d)}</p></li>`).join("")}</ol>`;
    return "";
  }).join("");
}
function exportCss() {
  return `:root{--bg:#f6f1e6;--text:#1a1813;--dim:#4f4a41;--line:rgba(26,24,19,.12);--ring:#c97800;--beige:#ede4d2;--cream:#f4edde;--orange:#f8e8ca;--serif:"Instrument Serif",Georgia,serif;--mono:ui-monospace,Menlo,monospace;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 10% 4%,rgba(99,191,207,.22),transparent 24%),radial-gradient(circle at 92% 12%,rgba(201,120,0,.14),transparent 22%),linear-gradient(180deg,#f6f1e6 0%,#efe8dc 100%);color:var(--text);font-family:var(--sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:56px 52px 80px}
header{position:relative;min-height:78vh;border-bottom:1px solid var(--line);overflow:visible}.brand-logo{position:absolute;right:0;top:0;width:138px;height:auto;z-index:2}.hero-logo{position:absolute;right:-52px;top:50%;width:min(40vw,560px);transform:translateY(-50%);opacity:.22;mix-blend-mode:multiply}.hero-copy{position:relative;z-index:1;padding-top:22vh;max-width:920px}h1,h2,h3{font-family:var(--serif);font-weight:400;margin:0;letter-spacing:-.03em}h1{font-size:clamp(72px,8vw,126px);line-height:1.2;padding-bottom:.12em}h1 span{display:inline-block;padding-bottom:.22em;color:#c97800}h1 em{font-style:italic}.hero-copy p{margin-top:28px;max-width:760px;font-size:18px;line-height:1.7;color:#3a362f}
section{display:grid;grid-template-columns:minmax(260px,35vw) minmax(0,1fr);gap:40px;min-height:62vh;padding:80px 0;border-bottom:1px solid var(--line)}aside span,.card span,.area span,.dark-card span{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#9b762e}aside h2{max-width:10ch;margin-top:20px;font-size:72px;line-height:.9}section:first-of-type aside h2{max-width:13ch}main{position:relative;padding-top:40px}.sun{position:absolute;right:0;top:48px;width:144px;opacity:.35;mix-blend-mode:multiply}
p{margin:0 0 18px;max-width:920px;color:var(--dim);font-size:15px;line-height:1.72}blockquote{margin:22px 0 18px;max-width:920px;background:#e7e2d6;border:1px solid rgba(26,24,19,.08);padding:28px 32px;font-family:var(--serif);font-size:40px;line-height:1.08;letter-spacing:-.025em;color:var(--text)}.note{border-left:1px solid var(--ring);padding-left:14px;font-size:12px;color:#7a7468}.problem-grid,.vouga-grid,.culture{display:grid;gap:12px}.problem-grid{grid-template-columns:.85fr 1.15fr}.card,.area{border:1px solid rgba(26,24,19,.10);padding:20px}.beige{background:var(--beige)}.cream{background:var(--cream)}.mini-row,.process,.metrics{display:grid;border-left:1px solid rgba(26,24,19,.10);border-top:1px solid rgba(26,24,19,.10)}.mini-row{margin-top:12px;grid-template-columns:repeat(3,1fr)}.mini-row b,.process div,.metrics div{border-right:1px solid rgba(26,24,19,.10);border-bottom:1px solid rgba(26,24,19,.10);padding:16px;background:var(--orange);font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#8c5a13}.pillars,.area-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:28px 0}.pillar{min-height:260px;border:1px solid rgba(26,24,19,.10);background:var(--beige);padding:20px}.pname{font-family:var(--serif);font-size:42px;line-height:1.08}.pname span{display:inline-block;padding-bottom:.16em}.pillar p{margin-top:42px;font-size:14px}.area{min-height:160px;background:var(--orange)}.area h3,.process h3{margin:28px 0 18px;font-size:34px;line-height:1}.steps{list-style:none;padding:0;margin:0;max-width:980px;border-top:1px solid var(--line)}.steps li{display:grid;grid-template-columns:48px 1fr 1.4fr;gap:18px;padding:18px 0;border-bottom:1px solid var(--line)}.steps span{color:#c97800;font-family:var(--mono)}
.process{grid-template-columns:repeat(4,1fr)}.process div{min-height:160px;background:var(--beige);font-family:var(--sans);letter-spacing:0;text-transform:none;color:var(--text)}.vouga-grid{grid-template-columns:1.1fr 1fr}.metrics{grid-template-columns:repeat(2,1fr)}.metrics strong{display:block;font-family:var(--serif);font-size:42px;font-weight:400;line-height:1}.metrics small{display:block;margin-top:10px;color:#6b6255}.triple{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.triple div{border:1px solid rgba(26,24,19,.10);background:var(--beige);padding:20px}.dark-card{margin-top:12px;background:#1a1813;color:#f6f1e6;padding:24px}.dark-card p{color:rgba(246,241,230,.9)}.dark-card.big{margin-top:0}.dark-card.big p{font-family:var(--serif);font-size:38px;line-height:1.08;letter-spacing:-.02em}.culture{grid-template-columns:1.15fr .85fr}.culture .names{display:grid;border-left:1px solid rgba(26,24,19,.10);border-top:1px solid rgba(26,24,19,.10)}.names a{display:flex;align-items:center;gap:12px;background:var(--beige);border-right:1px solid rgba(26,24,19,.10);border-bottom:1px solid rgba(26,24,19,.10);padding:16px;font-family:var(--serif);font-size:32px;font-weight:400;line-height:1.1;letter-spacing:-.02em;text-transform:none;color:var(--text);text-decoration:none}.names svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8}
${GRAD_CSS}
@page{size:A4 portrait;margin:12mm}@media print{
.page{padding:0}
header{min-height:auto;height:235mm;padding:20mm 0 0;break-after:page;overflow:hidden}.brand-logo{right:0;top:0;width:34mm}
.hero-copy{padding-top:0}.hero-logo{right:0;left:auto;top:auto;bottom:14mm;transform:none;width:52%}
h1{font-size:60px;line-height:1.12}
section{display:block;min-height:auto;break-before:page;padding:0;border-bottom:0;gap:0}
section aside{margin-bottom:8mm}aside h2{font-size:40px;max-width:none}
main{padding-top:0}
	.sun{position:static;width:110px;margin:0 0 6mm auto;opacity:.3}
	blockquote{font-size:30px;padding:18px 22px;background:#e7e2d6}
.pillars,.area-grid,.process,.metrics,.triple,.problem-grid,.vouga-grid,.culture,.mini-row{break-inside:avoid}
.pillar,.area,.card,.triple>div,.metrics>div,.steps li,blockquote,.dark-card,.names a,.mini-row>b,.process>div,.note{break-inside:avoid}
.dark-card.big p{font-size:26px}
}`;
}
function buildDocument() {
  const sections = SECTIONS.map((s) => `<section><aside><span>${s.n}</span><h2>${s.n === "01" ? "O problema<br>que resolvemos" : esc(s.heading)}</h2></aside><main>${s.motif ? `<img class="sun" src="${sunMethodology}" alt="">` : ""}${exportSectionBody(s)}</main></section>`).join("");
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vouga Agency · o que fazemos</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>${exportCss()}</style></head>
<body><div class="page"><header><img class="brand-logo" src="${logoPreto}" alt="Vouga Agency"><img class="hero-logo" src="${vougaLado}" alt=""><div class="actions"></div><div class="hero-copy"><h1><span>Intelligence</span>, built<br>around <em>the business</em></h1><p>${esc(HERO.lede)}</p></div></header>${sections}</div></body></html>`;
}
function downloadHtml() {
  const blob = new Blob([buildDocument()], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "vouga-o-que-fazemos.html"; a.click();
  URL.revokeObjectURL(url);
}
function buildOnePager() {
  const SHORT: Record<string, string> = {
    Intelligence: "Melhora o que já existe. Automações, copilotos e conhecimento interno ativados com IA.",
    Foundations: "Cria o que ainda não existe. Da ideia ao sistema validado e entregue chave na mão.",
    Academy: "Forma quem constrói. Ponte de talento e de formação, ligada à academia.",
  };
  const WORK: [string, string][] = [
    ["Diagnóstico", "Percebemos a origem do problema antes de prometer."],
    ["Sprint", "Duas semanas a mapear e priorizar."],
    ["Implementação inicial", "O primeiro sistema nas mãos da equipa."],
    ["Parceria contínua", "Manter, melhorar e acrescentar, em contínuo."],
  ];
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Vouga Agency · one pager</title><link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"><style>
:root{--bg:#f6f1e6;--text:#1a1813;--dim:#4f4a41;--line:rgba(26,24,19,.12);--ring:#c97800;--beige:#ede4d2;--cream:#f4edde;--orange:#f8e8ca;--serif:"Instrument Serif",Georgia,serif;--mono:ui-monospace,Menlo,monospace;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{position:relative;display:flex;flex-direction:column;width:297mm;height:272mm;padding:13mm 16mm 18mm;overflow:hidden;background:radial-gradient(circle at 12% 8%,rgba(99,191,207,.16),transparent 22%),linear-gradient(180deg,#f6f1e6,#efe8dc)}
.logo{position:absolute;right:-20mm;top:9mm;width:86mm;opacity:.16;mix-blend-mode:multiply}
h1,h2,h3,h4{font-family:var(--serif);font-weight:400;margin:0;letter-spacing:-.03em}
h1{position:relative;z-index:1;width:190mm;font-size:38pt;line-height:1.2;padding-bottom:1mm}h1 span{display:inline-block;padding-bottom:.22em;color:var(--ring)}h1 em{font-style:italic}
.lede{position:relative;z-index:1;margin-top:6mm;width:150mm;font-size:10.5pt;line-height:1.5;color:#3a362f}
.seclabel{font-family:var(--mono);font-size:7pt;letter-spacing:.18em;text-transform:uppercase;color:#9b762e;margin:0 0 3mm}
.block{margin-top:8mm}
.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.pillar{border:1px solid var(--line);background:var(--beige);padding:5mm}.pillar h3{font-size:22pt;line-height:1.02}.pillar h3 span{display:inline-block;padding-bottom:.1em}.pillar p{margin-top:4mm;font-size:8.2pt;line-height:1.35;color:var(--dim)}
.work{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.step{border:1px solid var(--line);background:var(--cream);padding:4mm}.step .n{font-family:var(--mono);font-size:8pt;color:var(--ring)}.step h4{font-size:15pt;margin:2mm 0 1.5mm}.step p{margin:0;font-size:7.8pt;line-height:1.3;color:var(--dim)}
.dist{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--line)}.dist .d{border-bottom:1px solid var(--line);border-right:1px solid var(--line);padding:4mm}.dist .d:last-child{border-right:0}.dist .n{font-family:var(--mono);font-size:7.5pt;color:var(--ring)}.dist h4{font-size:14pt;margin:2mm 0 1.5mm}.dist p{margin:0;font-size:7.4pt;line-height:1.3;color:var(--dim)}
.cta{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid var(--line);padding-top:6mm}.cta h2{font-size:30pt;line-height:1}.contact{text-align:right;font-family:var(--mono);font-size:8pt;color:var(--dim);line-height:1.7}.contact-logo{display:block;width:34mm;height:auto;margin:0 0 2.5mm auto}
${GRAD_CSS}@page{size:297mm 272mm;margin:0}</style></head>
<body><div class="sheet">
<img class="logo" src="${vougaLado}" alt="">
<h1><span>Intelligence</span>, built<br>around <em>the business</em></h1>
<p class="lede">${esc(HERO.lede)}</p>
<div class="block"><p class="seclabel">Os três pilares</p><div class="pillars">${PILLARS.map((p) => `<div class="pillar"><h3>Vouga<br><span class="grad ${GRAD_SHORT[p.grad]}">${esc(p.word)}</span></h3><p>${esc(SHORT[p.word])}</p></div>`).join("")}</div></div>
<div class="block"><p class="seclabel">Como trabalhamos</p><div class="work">${WORK.map(([t, d], i) => `<div class="step"><span class="n">0${i + 1}</span><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("")}</div></div>
<div class="block"><p class="seclabel">O que nos distingue</p><div class="dist">${DISTINGUE.map(([t, d], i) => `<div class="d"><span class="n">0${i + 1}</span><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join("")}</div></div>
<div class="cta"><h2>Vamos construir o sistema.</h2><div class="contact"><img class="contact-logo" src="${logoPreto}" alt="Vouga Agency">geral@vouga.com · vouga.com</div></div>
</div></body></html>`;
}
function printDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1500); }, 400);
}
function downloadPdf() {
  printDocument(buildDocument());
}
function downloadOnePager() {
  printDocument(buildOnePager());
}

// ---------- page ----------
const HIGHLIGHTS = [
  "visão sistémica",
  "origem do problema",
  "IA",
  "modernizar",
  "otimização",
  "redução de custos",
  "diagnóstico",
  "sprint curto",
  "implementação inicial",
  "parceria contínua",
  "ownership",
  "melhor talento técnico jovem",
  "equipa é a marca",
  "Entre Douro e Vouga",
  "tecido industrial",
  "proximidade",
  "sobrerrepresentação industrial",
  "AI natives",
  "dados",
  "processos",
  "memória da empresa",
].sort((a, b) => b.length - a.length);

function HighlightText({ text }: { text?: string }) {
  if (!text) return null;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${HIGHLIGHTS.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return text.split(pattern).map((part, i) => {
    const match = HIGHLIGHTS.some((h) => h.toLowerCase() === part.toLowerCase());
    return match ? (
      <strong key={i} className="font-semibold text-current">
        {part}
      </strong>
    ) : (
      part
    );
  });
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("p" in b) return <p key={i} className="mb-5 max-w-4xl text-[15px] leading-[1.72] text-[#4f4a41] md:text-base"><HighlightText text={b.p} /></p>;
        if ("quote" in b)
          return (
            <blockquote key={i} className="my-9 max-w-5xl border-y border-[#1a1813]/15 py-7 text-center font-serif text-3xl leading-[1.08] tracking-tight text-[#1a1813] md:text-4xl">
              {b.quote === "Nenhuma funcionalidade sem contexto, nenhuma automação sem compreender o sistema." ? (
                <>
                  Nenhuma funcionalidade sem contexto,
                  <br className="hidden md:block" /> nenhuma automação sem compreender o sistema.
                </>
              ) : (
                b.quote
              )}
            </blockquote>
          );
        if ("note" in b) return <p key={i} className="mt-6 max-w-4xl border-l border-[#c97800] pl-4 text-xs leading-relaxed text-[#7a7468]">{b.note}</p>;
        if ("list" in b)
          return (
            <ul key={i} className="my-8 grid max-w-5xl gap-3 md:grid-cols-2 xl:grid-cols-3">
              {b.list.map((item, j) => (
                <li key={j} className="min-h-40 rounded-[6px] border border-[#c97800]/15 bg-[#f8e8ca] p-4 text-[13px] leading-relaxed text-[#1a1813] shadow-[0_10px_24px_-20px_rgba(0,0,0,0.45)]">
                  <span className="mb-7 block font-mono text-[10px] tracking-[0.16em] text-[#8c5a13]">0{j + 1}</span>
                  <strong className="mb-4 block font-serif text-3xl font-normal leading-none tracking-tight text-[#1a1813]">{AREA_TITLES[j]}</strong>
                  <span><HighlightText text={item} /></span>
                </li>
              ))}
            </ul>
          );
        if ("steps" in b)
          return (
            <ol key={i} className="mb-4 max-w-5xl divide-y divide-[#1a1813]/12 border-y border-[#1a1813]/12">
              {b.steps.map(([t, d], j) => (
                <li key={j} className="grid gap-4 py-5 md:grid-cols-[48px_1fr_1.4fr]">
                  <span className="font-mono text-sm text-[#c97800]">0{j + 1}</span>
                  <p className="text-lg font-medium leading-tight text-[#1a1813]">{t}</p>
                  <div>
                    <p className="text-sm leading-relaxed text-[#615e54]"><HighlightText text={d} /></p>
                  </div>
                </li>
              ))}
            </ol>
          );
        // pillars
        return (
          <div key={i} className="my-10 grid max-w-6xl gap-3 md:grid-cols-3">
            {PILLARS.map((p, j) => (
              <div key={p.word} className="min-h-64 rounded-[6px] border border-[#1a1813]/10 bg-[#ede4d2] p-5 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.5)]">
                <div className="font-serif text-4xl leading-[0.92] tracking-tight text-[#1a1813]">
                  Vouga<br />
                  <span className={`grad-text ${p.grad}`}>{p.word}</span>
                </div>
                <p className="mt-16 text-sm leading-relaxed text-[#343129]"><HighlightText text={p.body} /></p>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function WhyVouga({ blocks }: { blocks: Block[] }) {
  const paragraphs = blocks.filter((b): b is { p: string } => "p" in b);
  const note = blocks.find((b): b is { note: string } => "note" in b);
  const metrics = [
    ["273 mil", "habitantes"],
    ["861 km²", "território"],
    ["115 mil", "pessoas ao serviço"],
    ["53,7 mil", "na indústria transformadora"],
    ["34,5 mil", "empresas"],
    ["11,9 mil M€", "volume de negócios"],
    ["3,9 mil M€", "exportações de bens"],
    ["7,1%", "emprego nacional industrial"],
  ];

  return (
    <div className="max-w-6xl">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="border border-[#1a1813]/10 bg-[#f4edde] p-5">
          <span className="mb-10 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#9b762e]">Território</span>
          <p className="text-[15px] leading-[1.72] text-[#4f4a41] md:text-base"><HighlightText text={paragraphs[0]?.p} /></p>
        </div>

        <div className="grid grid-cols-2 border-l border-t border-[#1a1813]/10">
          {metrics.map(([value, label]) => (
            <div key={label} className="min-h-28 border-b border-r border-[#1a1813]/10 bg-[#f8e8ca] p-4">
              <strong className="block font-serif text-4xl font-normal leading-none tracking-tight text-[#1a1813]">{value}</strong>
              <span className="mt-3 block text-xs leading-snug text-[#6b6255]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {paragraphs.slice(1, 4).map((p, i) => (
          <div key={i} className="border border-[#1a1813]/10 bg-[#ede4d2] p-5">
            <span className="mb-8 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#9b762e]">0{i + 1}</span>
            <p className="text-sm leading-[1.72] text-[#4f4a41]"><HighlightText text={p.p} /></p>
          </div>
        ))}
      </div>

      {paragraphs[4] && (
        <div className="mt-3 border border-[#1a1813]/10 bg-[#1a1813] p-5 text-[#f6f1e6]">
          <p className="max-w-3xl text-[15px] leading-[1.72] text-[#f6f1e6]/90 md:text-base"><HighlightText text={paragraphs[4].p} /></p>
        </div>
      )}

      {note && (
        <p className="mt-5 max-w-4xl border-l border-[#c97800] pl-4 text-xs leading-relaxed text-[#7a7468]">{note.note}</p>
      )}
    </div>
  );
}

function ProblemSection({ blocks }: { blocks: Block[] }) {
  const paragraphs = blocks.filter((b): b is { p: string } => "p" in b);
  return (
    <div className="max-w-5xl">
      <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border border-[#1a1813]/10 bg-[#ede4d2] p-5">
          <span className="mb-10 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#9b762e]">Momentum</span>
          <p className="text-[15px] leading-[1.72] text-[#4f4a41] md:text-base"><HighlightText text={paragraphs[0]?.p} /></p>
        </div>
        <div className="border border-[#1a1813]/10 bg-[#f4edde] p-5">
          <span className="mb-10 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#9b762e]">Intervenção</span>
          <p className="text-[15px] leading-[1.72] text-[#4f4a41] md:text-base"><HighlightText text={paragraphs[1]?.p} /></p>
        </div>
      </div>
      <div className="mt-3 grid border-l border-t border-[#1a1813]/10 md:grid-cols-3">
        {["validar", "construir", "operar"].map((item) => (
          <div key={item} className="border-b border-r border-[#1a1813]/10 bg-[#f8e8ca] p-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8c5a13]">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkSection({ blocks }: { blocks: Block[] }) {
  const paragraph = blocks.find((b): b is { p: string } => "p" in b);
  const steps = ["diagnóstico", "sprint curto", "implementação inicial", "parceria contínua"];
  return (
    <div className="max-w-5xl">
      <p className="mb-8 max-w-4xl text-[15px] leading-[1.72] text-[#4f4a41] md:text-base"><HighlightText text={paragraph?.p} /></p>
      <div className="grid border-l border-t border-[#1a1813]/10 md:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step} className="min-h-40 border-b border-r border-[#1a1813]/10 bg-[#ede4d2] p-4">
            <span className="mb-10 block font-mono text-[10px] tracking-[0.18em] text-[#9b762e]">0{i + 1}</span>
            <strong className="block font-serif text-3xl font-normal leading-none tracking-tight text-[#1a1813]">{step}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function CultureSection({ blocks }: { blocks: Block[] }) {
  const paragraphs = blocks.filter((b): b is { p: string } => "p" in b);
  return (
    <div className="max-w-6xl">
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="bg-[#1a1813] p-6 text-[#f6f1e6]">
          <span className="mb-16 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#c97800]">ownership antes de títulos</span>
          <p className="max-w-3xl font-serif text-3xl leading-[1.08] tracking-tight text-[#f6f1e6] md:text-4xl">
            <HighlightText text={paragraphs[0]?.p} />
          </p>
        </div>

        <div className="border border-[#1a1813]/10 bg-[#f8e8ca] p-5">
          <span className="mb-10 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#9b762e]">ambiente</span>
          <p className="text-sm leading-[1.72] text-[#4f4a41]"><HighlightText text={paragraphs[1]?.p} /></p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid border-l border-t border-[#1a1813]/10 md:grid-cols-3 lg:grid-cols-1">
          {FOUNDERS_LINKS.map(([name, href]) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 border-b border-r border-[#1a1813]/10 bg-[#ede4d2] p-4 text-[#1a1813] transition-colors hover:bg-[#e5dac6]"
            >
              <Linkedin className="h-5 w-5 shrink-0 stroke-[1.6]" aria-hidden="true" />
              <span className="font-serif text-3xl font-normal leading-none tracking-tight">{name}</span>
            </a>
          ))}
        </div>

        <div className="border border-[#1a1813]/10 bg-[#f4edde] p-5">
          <span className="mb-10 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#9b762e]">equipa fundadora</span>
          <p className="text-sm leading-[1.72] text-[#4f4a41]"><HighlightText text={paragraphs[2]?.p} /></p>
        </div>
      </div>
    </div>
  );
}

function SectionBody({ section }: { section: (typeof SECTIONS)[number] }) {
  if (section.n === "01") return <ProblemSection blocks={section.blocks} />;
  if (section.n === "05") return <WorkSection blocks={section.blocks} />;
  if (section.n === "06") return <WhyVouga blocks={section.blocks} />;
  if (section.n === "08") return <CultureSection blocks={section.blocks} />;
  return <Blocks blocks={section.blocks} />;
}

function SobrePage() {
  return (
    <div
      className="-mb-32 -mt-24 min-h-screen w-screen bg-[#f6f1e6] px-5 pb-24 pl-6 pr-8 pt-28 text-[#1a1813] md:pl-8 md:pr-12 lg:pl-10 lg:pr-20"
      style={{
        marginLeft: "calc(50% - 50vw)",
        background:
          "radial-gradient(circle at 10% 4%, rgba(99, 191, 207, 0.22), transparent 24%), radial-gradient(circle at 92% 12%, rgba(201, 120, 0, 0.14), transparent 22%), linear-gradient(180deg, #f6f1e6 0%, #efe8dc 100%)",
      }}
    >
      <article className="relative w-full">
        <div className="pointer-events-none fixed inset-y-0 left-0 hidden w-2 bg-[#bfe7ef] lg:block" />
        <div className="relative">
          {/* hero */}
          <header className="relative grid min-h-[calc(92vh-7rem)] content-start gap-10 overflow-visible border-b border-[#1a1813]/12 pb-12">
            <img
              src={vougaLado}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-[-2rem] top-1/2 hidden w-[min(40vw,560px)] -translate-y-1/2 opacity-[0.22] mix-blend-multiply md:right-[-3rem] lg:right-[-5rem] lg:block"
            />
            <div className="flex items-start justify-between gap-4">
              <div />
              <div className="flex gap-2">
                <button onClick={downloadHtml} className="flex items-center gap-1.5 rounded-full border border-[#1a1813]/15 bg-white/35 px-3 py-1.5 text-xs text-[#1a1813]/80 transition-colors hover:bg-white/70 hover:text-[#1a1813]">
                  <Download className="h-3.5 w-3.5" /> HTML
                </button>
                <button onClick={downloadPdf} className="flex items-center gap-1.5 rounded-full border border-[#1a1813]/15 bg-white/35 px-3 py-1.5 text-xs text-[#1a1813]/80 transition-colors hover:bg-white/70 hover:text-[#1a1813]">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
                <button onClick={downloadOnePager} className="flex items-center gap-1.5 rounded-full border border-[#1a1813]/15 bg-white/35 px-3 py-1.5 text-xs text-[#1a1813]/80 transition-colors hover:bg-white/70 hover:text-[#1a1813]">
                  <FileText className="h-3.5 w-3.5" /> One pager
                </button>
              </div>
            </div>
            <div className="relative z-10 mt-24 md:mt-28">
              <h1 className="max-w-5xl font-serif text-[clamp(3rem,6.7vw,7.8rem)] leading-[0.98] tracking-[-0.032em]">
                <span className="hero-intelligence">Intelligence</span>, built <br className="hidden lg:block" />
                around <em className="italic">the business</em>
              </h1>
              <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[#3a362f]">{HERO.lede}</p>
            </div>
          </header>

          {SECTIONS.map((s) => (
            <section key={s.n} className="relative grid min-h-[62vh] gap-10 border-b border-[#1a1813]/12 py-14 md:grid-cols-[minmax(240px,32vw)_minmax(0,1fr)] md:py-20 xl:grid-cols-[minmax(320px,35vw)_minmax(0,1fr)]">
              <div className="md:sticky md:top-8 md:self-start">
                <span className="font-mono text-[11px] tracking-[0.16em] text-[#9b762e]">{s.n}</span>
                <h2 className={`mt-5 font-serif text-5xl leading-[0.9] tracking-[-0.03em] text-[#1a1813] md:text-6xl lg:text-7xl ${s.n === "01" ? "max-w-[13ch]" : "max-w-[10ch]"}`}>
                  {s.n === "01" ? (
                    <>
                      O problema<br />que resolvemos
                    </>
                  ) : (
                    s.heading
                  )}
                </h2>
              </div>
              <div className="relative min-w-0 pt-1 md:pt-10">
                {s.motif && (
                  <img
                    src={sunMethodology}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-2 top-12 hidden h-36 w-36 opacity-35 mix-blend-multiply lg:block"
                  />
                )}
                <SectionBody section={s} />
              </div>
            </section>
          ))}

          <footer className="pt-8" />
        </div>
      </article>
    </div>
  );
}
