// PyOrex HUB editorial triage v1.
// Rules use headlines ONLY: scores estimate review priority, not deposit prospectivity,
// article verification, confidence of a discovery, or investment quality.
const clean = value => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

const grade = /(?:\b\d+(?:[.,]\d+)?\s*(?:g\/t|grams?\s+per\s+tonne|ppm|oz\/t)\b|\b\d+(?:[.,]\d+)?\s*%)/i;
const interval = /\b\d+(?:[.,]\d+)?\s*(?:m|metres?|meters?|metros?)\b/i;
const drilling = /\b(?:drill(?:ed|ing|hole|holes|s)?|sondaj(?:e|es)|perforaci(?:on|ones)|barrenos?|assay(?:s)?|intercept(?:s|ed)?|intersecci(?:on|ones)|ensayos?)\b/i;
const assayResults = /\b(?:drill(?:ing)? results?|assay results?|intercepts?|intersections?|returns? assays?|resultados? (?:de )?(?:perforacion|sondajes?|ensayos?))\b/i;
const resource = /\b(?:mineral resources?|resource estimates?|resource updates?|reserve estimates?|mineral reserves?|indicated resources?|inferred resources?|measured resources?|jorc|ni\s*43[- ]101|recursos? minerales?|estimacion de recursos?|reservas? minerales?)\b/i;
const discovery = /\b(?:new\b.{0,60}\b(?:target|anomaly|zone)\b|discover(?:y|ies|ed)?|new mineralized zone|new mineralised zone|new copper zone|new gold zone|new porphyry|new target|significant anomaly|high.grade anomaly|descubrimient(?:o|os)|nueva zona mineralizada|nuevo objetivo|anomalia significativa)\b/i;
const transaction = /\b(?:joint venture|earn[- ]in|farm[- ]in|option agreement|option to acquire|acquisition|acquires?|divest(?:ment|s)?|asset sale|project sale|strategic alliance|jv agreement|acuerdo de opcion|empresa conjunta|adquisici(?:on|ones)|venta de proyecto|alianza estrategica)\b/i;
const study = /\b(?:prefeasibility|pre-feasibility|feasibility|scoping stud(?:y|ies)|economic assessment|pea\b|pfs\b|dfs\b|metallurg(?:y|ical)|recovery tests?|testwork|prefactibilidad|factibilidad|estudios? metalurgicos?|recuperacion metalurgica)\b/i;
const permit = /\b(?:environmental permit|drilling permit|permit approval|environmental approval|environmental impact assessment|eia approval|permitting|licencia ambiental|permiso(?:s)? de perforacion|aprobacion ambiental|evaluacion de impacto ambiental)\b/i;
const exploration = /\b(?:geophysic(?:s|al)|geochem(?:istry|ical)|ip survey|induced polarization|magnetic survey|soil sampl(?:e|ing)|rock chip|channel sampl(?:e|ing)|surface sampl(?:e|ing)|mapping program|exploration program|field program|geofisic[ao]|geoquimic[ao]|muestreo|cartografiado|polarizacion inducida|programa de exploracion)\b/i;
const financing = /\b(?:private placement|bought deal|financing|capital raise|fundraising|equity offering|share placement|financiacion|financiamiento|colocacion privada|ampliacion de capital)\b/i;
const administration = /\b(?:webinar|conference|presentation|annual general meeting|agm\b|board appointment|director appointment|appoints? (?:new )?(?:ceo|cfo|director)|investor webcast|trading halt|corporate update|newsletter|reunion anual|presentacion corporativa|nombra (?:a )?(?:director|gerente))\b/i;
const mineral = /\b(?:cu|au|ag|zn|pb|copper|gold|silver|zinc|lead|porphyry|epithermal|skarn|crd|lithocap|cobre|oro|plata|porfido|epitermal|mineraliz(?:ation|acion))\b/i;

// All cases are conservatively flagged for editorial verification before publication.
export function screenHeadline(headline) {
  const text = clean(headline);
  if (!text) return {
    classification: "needs_review", materiality_score: 0,
    priority: "unclassified", rationale: "No readable headline; manual review required.",
    method: "headline_rules_v1"
  };
  let classification = "general_update";
  let score = 20;
  let evidence = "No specific exploration event established by the headline.";

  if (resource.test(text)) {
    classification = "resource_update"; score = 88;
    evidence = "Headline mentions a mineral resource or reserve estimate.";
  } else if (drilling.test(text) && (grade.test(text) || assayResults.test(text) || /(?:intersection|intercept|results?|ensayos?)/.test(text))) {
    classification = "drilling_results"; score = 84;
    evidence = "Headline indicates drilling or assay results.";
  } else if (discovery.test(text)) {
    classification = "discovery_target"; score = 78;
    evidence = "Headline signals a discovery, mineralized zone, or exploration target.";
  } else if (transaction.test(text)) {
    classification = "project_transaction"; score = 76;
    evidence = "Headline signals an acquisition, option, joint venture or asset transaction.";
  } else if (study.test(text)) {
    classification = "technical_study"; score = 70;
    evidence = "Headline mentions a technical study or metallurgical testing.";
  } else if (permit.test(text)) {
    classification = "permit_milestone"; score = 62;
    evidence = "Headline references an environmental or exploration permit milestone.";
  } else if (drilling.test(text)) {
    classification = "drilling_program"; score = 60;
    evidence = "Headline mentions drilling; results not established.";
  } else if (exploration.test(text)) {
    classification = "exploration_program"; score = 57;
    evidence = "Headline reports exploration activities or survey methods.";
  } else if (financing.test(text)) {
    classification = "financing"; score = 34;
    evidence = "Headline primarily concerns financing, not a verified technical result.";
  } else if (administration.test(text)) {
    classification = "corporate_routine"; score = 9;
    evidence = "Headline appears to concern routine corporate communication.";
  }

  if (mineral.test(text) && score >= 50) score += 4;
  if (classification === "drilling_results" && grade.test(text) && interval.test(text)) score += 7;
  if (classification === "general_update" && administration.test(text)) {
    classification = "corporate_routine"; score = 9;
    evidence = "Headline appears to concern routine corporate communication.";
  }
  score = Math.min(100, score);
  const priority = score >= 75 ? "high" : score >= 50 ? "review" : "low";
  return {
    classification, materiality_score: score, priority,
    rationale: evidence + " Editorial screening based on headline only; source article has not been geologically validated.",
    method: "headline_rules_v1"
  };
}
