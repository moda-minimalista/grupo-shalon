import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig, storageEnabled } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (s) => document.querySelector(s);
const state = { user: null, profile: null, route: "dashboard", records: [], editId: null, bootstrapping: false };

const defaultPermissions = {
  administrador: ["dashboard","properties","clients","leads","agenda","documents","finance","brokers","services","users","reports","settings"],
  gerente: ["dashboard","properties","clients","leads","agenda","documents","finance","brokers","services","reports"],
  corretor: ["dashboard","properties","clients","leads","agenda","documents"],
  atendente: ["dashboard","clients","leads","agenda","services"]
};

const modules = {
  dashboard: { label:"Dashboard", icon:"▦" },
  properties: { label:"Imóveis", icon:"⌂", collection:"properties", singular:"Imóvel", fields:[
    ["code","Código do imóvel","text",true],["title","Título","text",true],["type","Tipo","select",true,["Casa","Apartamento","Terreno","Sala comercial","Kitnet","Outro"]],["purpose","Finalidade","select",true,["Venda","Aluguel","Temporada"]],
    ["value","Valor","number",true],["currency","Moeda","select",true,["BRL","PYG","USD"]],["condo","Condomínio","number"],["iptu","IPTU","number"],["status","Status","select",true,["Disponível","Reservado","Vendido","Alugado"]],
    ["description","Descrição","textarea",true,"full"],["address","Endereço completo","text",true,"full"],["city","Cidade","text",true],["country","País","select",true,["Paraguai","Brasil"]],["mapUrl","Localização no mapa (URL)","url",false,"full"],
    ["bedrooms","Quartos","number"],["bathrooms","Banheiros","number"],["parking","Vagas","number"],["totalArea","Área total (m²)","number"],["builtArea","Área construída (m²)","number"],
    ["owner","Proprietário","text"],["broker","Corretor responsável","text"],["photoUrls","Fotos (uma URL por linha)","textarea",false,"full"],["videoUrls","Vídeos (uma URL por linha)","textarea",false,"full"],["virtualTour","Tour virtual (URL)","url",false,"full"],["internalNotes","Observações internas","textarea",false,"full"],["published","Publicado no site","checkbox"]
  ], filters:["type","city","status","broker","purpose"] },
  clients: { label:"Clientes (CRM)", icon:"◎", collection:"clients", singular:"Cliente", fields:[
    ["name","Nome completo","text",true],["document","CPF/CNPJ","text"],["phone","Telefone","tel"],["whatsapp","WhatsApp","tel"],["email","E-mail","email"],["address","Endereço","text",false,"full"],["serviceHistory","Histórico de atendimento","textarea",false,"full"],["interests","Imóveis de interesse","textarea",false,"full"],["documentUrls","Documentos (URLs)","textarea",false,"full"],["notes","Observações internas","textarea",false,"full"]
  ]},
  leads: { label:"Leads", icon:"◇", collection:"leads", singular:"Lead", fields:[
    ["name","Nome","text",true],["phone","Telefone","tel"],["email","E-mail","email"],["origin","Origem","select",true,["Google","Facebook","Instagram","Site","Indicação","Outro"]],["property","Imóvel visualizado","text"],["contactDate","Data de contato","date"],["status","Status do atendimento","select",true,["Novo Lead","Contato Feito","Visita Agendada","Proposta","Fechado"]],["notes","Observações","textarea",false,"full"]
  ]},
  agenda: { label:"Agenda", icon:"□", collection:"events", singular:"Compromisso", fields:[
    ["title","Título","text",true],["type","Tipo","select",true,["Visita","Reunião","Assinatura","Vistoria","Lembrete"]],["date","Data","date",true],["time","Horário","time"],["client","Cliente","text"],["property","Imóvel","text"],["responsible","Responsável","text"],["notes","Observações","textarea",false,"full"]
  ]},
  documents: { label:"Documentos", icon:"▤", collection:"documents", singular:"Documento", fields:[
    ["title","Nome do documento","text",true],["type","Tipo","select",true,["Contrato","Escritura","Matrícula","RG/CPF","Comprovante","Outro"]],["client","Cliente","text"],["property","Imóvel","text"],["url","URL do arquivo","url",true,"full"],["notes","Observações","textarea",false,"full"]
  ]},
  finance: { label:"Financeiro", icon:"$", collection:"finance", singular:"Lançamento", fields:[
    ["description","Descrição","text",true],["type","Tipo","select",true,["Comissão","Recebimento","Pagamento","Taxa"]],["status","Status","select",true,["Pendente","Recebido","Pago","Cancelado"]],["value","Valor","number",true],["currency","Moeda","select",true,["BRL","PYG","USD"]],["dueDate","Vencimento","date"],["negotiation","Negociação","text"],["broker","Corretor","text"],["notes","Observações","textarea",false,"full"]
  ]},
  brokers: { label:"Corretores", icon:"♙", collection:"brokers", singular:"Corretor", fields:[
    ["name","Nome","text",true],["phone","Telefone","tel"],["email","E-mail","email"],["creci","CRECI","text"],["commission","Comissão (%)","number"],["properties","Imóveis sob responsabilidade","textarea",false,"full"],["salesHistory","Histórico de vendas","textarea",false,"full"],["active","Ativo","checkbox"]
  ]},
  services: { label:"Serviços extras", icon:"＋", collection:"services", singular:"Serviço", fields:[
    ["title","Serviço","text",true],["category","Categoria","text"],["client","Cliente","text"],["country","País","select",true,["Paraguai","Brasil"]],["status","Status","select",true,["Novo","Em andamento","Aguardando documentos","Concluído","Cancelado"]],["value","Valor","number"],["currency","Moeda","select",false,["BRL","PYG","USD"]],["responsible","Responsável","text"],["deadline","Prazo","date"],["notes","Observações","textarea",false,"full"]
  ]},
  users: { label:"Usuários", icon:"♜", collection:"users", singular:"Usuário", fields:[
    ["name","Nome completo","text",true],["email","E-mail","email",true],["initialPassword","Senha inicial","password"],["phone","Telefone","tel"],["jobTitle","Cargo/função","text"],["role","Nível de acesso","select",true,["administrador","gerente","corretor","atendente"]],["active","Ativo","checkbox"]
  ]},
  reports: { label:"Relatórios", icon:"▥" },
  settings: { label:"Configurações", icon:"⚙", collection:"settings", singular:"Configuração" }
};

const loginScreen=$("#login-screen"), shell=$("#admin-shell"), nav=$("#admin-nav"), content=$("#admin-content"), dialog=$("#editor-dialog"), editorForm=$("#editor-form");
const bootstrapRef=doc(db,"settings","bootstrap");

function normalize(v){ return String(v ?? "").trim(); }
function canAccess(route){ return state.profile?.role === "administrador" || (state.profile?.permissions || defaultPermissions[state.profile?.role] || []).includes(route); }
function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); }
function formatValue(value,currency){ if(value==null||value==="")return "—"; return new Intl.NumberFormat("pt-BR",{style:"currency",currency:currency||"BRL",maximumFractionDigits:0}).format(Number(value)); }
function dateText(v){ if(!v)return "—"; return new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR"); }
function initials(name){ return normalize(name).split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "GS"; }

async function checkBootstrap(){
  try{
    const snap=await getDoc(bootstrapRef),available=!snap.exists();
    $("#setup-toggle").hidden=!available;
    if(!available)toggleBootstrap(false);
  }catch{
    $("#setup-toggle").hidden=true;
  }
}

function toggleBootstrap(show){
  $("#bootstrap-box").hidden=!show;
  $("#login-fields").hidden=show;
  $("#login-fields").querySelectorAll("input,button").forEach(el=>el.disabled=show);
  $("#bootstrap-box").querySelectorAll("input,button").forEach(el=>el.disabled=!show);
  $("#setup-toggle").textContent=show?"Voltar ao login":"Criar primeiro administrador";
  $("#login-message").textContent="";
}

$("#setup-toggle").addEventListener("click",()=>toggleBootstrap($("#bootstrap-box").hidden));
$("#create-first-admin").addEventListener("click",async()=>{
  const form=$("#login-form"),name=normalize(form.elements.adminName.value),email=normalize(form.elements.adminEmail.value),phone=normalize(form.elements.adminPhone.value),password=form.elements.adminPassword.value,confirmPassword=form.elements.adminPasswordConfirm.value;
  if(!name||!email||!password)return $("#login-message").textContent="Preencha nome, e-mail e senha.";
  if(password.length<8)return $("#login-message").textContent="A senha deve ter pelo menos 8 caracteres.";
  if(password!==confirmPassword)return $("#login-message").textContent="As senhas não coincidem.";
  $("#login-message").textContent="Criando administrador...";
  let credential;
  try{
    const bootstrap=await getDoc(bootstrapRef);
    if(bootstrap.exists())throw new Error("O primeiro administrador já foi criado.");
    state.bootstrapping=true;
    credential=await createUserWithEmailAndPassword(auth,email,password);
    const uid=credential.user.uid,batch=writeBatch(db);
    batch.set(doc(db,"users",uid),{
      name,email,phone,jobTitle:"Administrador",role:"administrador",active:true,
      permissions:defaultPermissions.administrador,createdAt:serverTimestamp(),createdBy:uid
    });
    batch.set(bootstrapRef,{adminUid:uid,createdAt:serverTimestamp()});
    await batch.commit();
    state.bootstrapping=false;
    $("#login-message").textContent="Administrador criado. Abrindo o painel...";
    await activateSession(credential.user);
  }catch(error){
    state.bootstrapping=false;
    if(credential?.user)try{await deleteUser(credential.user);}catch{}
    $("#login-message").textContent=error.code==="auth/email-already-in-use"?"Este e-mail já possui uma conta.":(error.message||"Não foi possível criar o administrador.");
    await signOut(auth).catch(()=>{});
    await checkBootstrap();
  }
});

async function loadProfile(user){
  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) throw new Error("Seu usuário ainda não possui um perfil de acesso.");
  const profile=snap.data();
  if(profile.active===false) throw new Error("Este acesso está inativo.");
  return {id:snap.id,...profile};
}

async function activateSession(user){
  state.user=user;state.profile=await loadProfile(user);
  loginScreen.hidden=true;shell.hidden=false;
  $("#user-name").textContent=state.profile.name||user.email;
  $("#user-role").textContent=state.profile.role||"usuário";
  $("#user-avatar").textContent=initials(state.profile.name);
  buildNav();navigate(location.hash.slice(1)||"dashboard");
}

onAuthStateChanged(auth,async user=>{
  if(!user){ state.user=null;state.profile=null;loginScreen.hidden=false;shell.hidden=true;await checkBootstrap();return; }
  if(state.bootstrapping)return;
  try{
    await activateSession(user);
  }catch(e){ await signOut(auth);$("#login-message").textContent=e.message; }
});

$("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();$("#login-message").textContent="Entrando...";
  try{ const f=new FormData(e.currentTarget);await signInWithEmailAndPassword(auth,normalize(f.get("email")),f.get("password")); }
  catch(err){ $("#login-message").textContent="Não foi possível entrar. Confira e-mail, senha e o perfil do usuário."; }
});
$("#reset-password").addEventListener("click",async()=>{
  const email=normalize($("#login-form [name=email]").value);
  if(!email)return $("#login-message").textContent="Informe seu e-mail primeiro.";
  try{await sendPasswordResetEmail(auth,email);$("#login-message").textContent="E-mail de recuperação enviado.";}catch{$("#login-message").textContent="Não foi possível enviar a recuperação.";}
});
$("#logout-btn").addEventListener("click",()=>signOut(auth));
$("#mobile-nav-btn").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));

function buildNav(){
  nav.innerHTML=Object.entries(modules).filter(([key])=>canAccess(key)).map(([key,m])=>`<button class="nav-item" data-route="${key}"><span class="nav-icon">${m.icon}</span>${m.label}</button>`).join("");
  nav.querySelectorAll("button").forEach(b=>b.onclick=()=>{location.hash=b.dataset.route;$(".sidebar").classList.remove("open");});
}
window.addEventListener("hashchange",()=>navigate(location.hash.slice(1)||"dashboard"));

async function navigate(route){
  if(!modules[route]||!canAccess(route))route="dashboard";
  state.route=route;state.editId=null;
  nav.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===route));
  $("#page-title").textContent=modules[route].label;
  const action=$("#primary-action");
  action.hidden=!modules[route].collection||route==="settings";
  action.textContent=route==="users"?"Novo usuário":`Novo ${modules[route].singular||"registro"}`;
  action.onclick=()=>openEditor();
  content.innerHTML='<div class="empty-state">Carregando dados...</div>';
  if(route==="dashboard")return renderDashboard();
  if(route==="reports")return renderReports();
  if(route==="settings")return renderSettings();
  await renderModule(route);
}

async function fetchCollection(name, max=300){
  try{ const snap=await getDocs(query(collection(db,name),orderBy("createdAt","desc"),limit(max)));return snap.docs.map(d=>({id:d.id,...d.data()})); }
  catch{ const snap=await getDocs(collection(db,name));return snap.docs.map(d=>({id:d.id,...d.data()})); }
}

async function renderDashboard(){
  const [properties,clients,leads,events,finance]=await Promise.all(["properties","clients","leads","events","finance"].map(fetchCollection));
  const available=properties.filter(x=>x.status==="Disponível").length;
  const reserved=properties.filter(x=>x.status==="Reservado").length;
  const completed=properties.filter(x=>["Vendido","Alugado"].includes(x.status)).length;
  const negotiations=leads.filter(x=>!["Novo Lead","Fechado"].includes(x.status)).length;
  const today=new Date().toISOString().slice(0,10);
  const agenda=events.filter(x=>x.date===today).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  content.innerHTML=`
    <div class="metric-grid">
      ${metric("Imóveis cadastrados",properties.length,"Total no portfólio")}
      ${metric("Disponíveis",available,`${reserved} reservados`)}
      ${metric("Vendidos / alugados",completed,"Negociações concluídas")}
      ${metric("Clientes e leads",clients.length+leads.length,`${negotiations} em andamento`)}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><p class="overline">Desempenho</p><h2>Vendas e locações</h2></div></div>${chartMarkup(finance)}</section>
      <section class="panel"><div class="panel-header"><div><p class="overline">Hoje</p><h2>Agenda do dia</h2></div></div>${agenda.length?`<ul class="agenda-list">${agenda.map(x=>`<li><span><strong>${x.time||"--:--"} · ${x.title}</strong><small>${x.type||""} ${x.client?`· ${x.client}`:""}</small></span></li>`).join("")}</ul>`:'<div class="empty-state"><strong>Agenda livre</strong>Nenhum compromisso para hoje.</div>'}</section>
    </div>`;
}
function metric(label,value,small){return `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${small}</small></article>`;}
function chartMarkup(finance){
  const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-5+i);return {key:d.toISOString().slice(0,7),label:d.toLocaleDateString("pt-BR",{month:"short"})};});
  const vals=months.map(m=>finance.filter(x=>(x.dueDate||"").startsWith(m.key)&&["Recebido","Pago"].includes(x.status)).reduce((s,x)=>s+Number(x.value||0),0));
  const max=Math.max(...vals,1);
  return `<div class="chart">${months.map((m,i)=>`<div class="bar-group"><div class="bar" style="height:${Math.max(4,vals[i]/max*90)}%"></div><span class="bar-label">${m.label}</span></div>`).join("")}</div>`;
}

async function renderModule(route){
  const mod=modules[route];state.records=await fetchCollection(mod.collection);
  if(route==="leads")return renderKanban();
  if(route==="agenda")return renderCalendar();
  renderTable(route);
}
function renderTable(route){
  const mod=modules[route], cols=tableColumns(route);
  content.innerHTML=`<div class="toolbar"><div class="filters-row"><input id="search-records" placeholder="Buscar...">${(mod.filters||[]).map(f=>filterControl(mod,f)).join("")}</div><span>${state.records.length} registros</span></div>
  <div class="data-table-wrap">${state.records.length?`<table class="data-table"><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join("")}<th>Ações</th></tr></thead><tbody id="table-body">${rowsMarkup(route,state.records,cols)}</tbody></table>`:'<div class="empty-state"><strong>Nenhum registro</strong>Use o botão no topo para começar.</div>'}</div>`;
  $("#search-records")?.addEventListener("input",applyFilters);
  content.querySelectorAll("[data-filter]").forEach(x=>x.addEventListener("change",applyFilters));
  bindRows();
}
function tableColumns(route){
  const map={
    properties:[["code","Código"],["title","Imóvel"],["city","Cidade"],["purpose","Finalidade"],["value","Valor"],["status","Status"]],
    clients:[["name","Cliente"],["phone","Telefone"],["email","E-mail"],["whatsapp","WhatsApp"]],
    documents:[["title","Documento"],["type","Tipo"],["client","Cliente"],["property","Imóvel"]],
    finance:[["description","Descrição"],["type","Tipo"],["value","Valor"],["dueDate","Vencimento"],["status","Status"]],
    brokers:[["name","Corretor"],["creci","CRECI"],["phone","Telefone"],["commission","Comissão"],["active","Status"]],
    services:[["title","Serviço"],["client","Cliente"],["country","País"],["responsible","Responsável"],["status","Status"]],
    users:[["name","Usuário"],["email","E-mail"],["jobTitle","Cargo"],["role","Acesso"],["active","Status"]]
  };return (map[route]||[]).map(([key,label])=>({key,label}));
}
function rowsMarkup(route,records,cols){
  return records.map(r=>`<tr>${cols.map(c=>`<td>${cell(route,c.key,r)}</td>`).join("")}<td><div class="row-actions"><button class="table-btn" data-edit="${r.id}">Editar</button><button class="table-btn danger" data-delete="${r.id}">${route==="users"?"Desativar":"Excluir"}</button></div></td></tr>`).join("");
}
function cell(route,key,r){
  if(key==="value")return `<strong>${formatValue(r.value,r.currency)}</strong>`;
  if(key==="dueDate")return dateText(r[key]);
  if(key==="status"||key==="active")return `<span class="status ${String(key==="active"?(r.active!==false?"ativo":"inativo"):r[key]).toLowerCase()}">${key==="active"?(r.active!==false?"Ativo":"Inativo"):(r[key]||"—")}</span>`;
  if(key==="commission")return `${r[key]||0}%`;
  return key==="title"||key==="name"?`<strong>${r[key]||"—"}</strong>`:(r[key]||"—");
}
function filterControl(mod,key){
  const f=mod.fields.find(x=>x[0]===key);if(!f)return "";
  const options=Array.isArray(f[4])?f[4]:(f[5]||[]);
  if(f[2]==="select")return `<select data-filter="${key}"><option value="">${f[1]}: todos</option>${options.map(v=>`<option>${v}</option>`).join("")}</select>`;
  return `<input data-filter="${key}" placeholder="${f[1]}">`;
}
function applyFilters(){
  const term=normalize($("#search-records").value).toLowerCase();
  const filters=[...content.querySelectorAll("[data-filter]")].filter(x=>x.value).map(x=>[x.dataset.filter,x.value.toLowerCase()]);
  const filtered=state.records.filter(r=>Object.values(r).join(" ").toLowerCase().includes(term)&&filters.every(([k,v])=>String(r[k]||"").toLowerCase().includes(v)));
  const cols=tableColumns(state.route);$("#table-body").innerHTML=rowsMarkup(state.route,filtered,cols);bindRows();
}
function bindRows(){
  content.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEditor(state.records.find(x=>x.id===b.dataset.edit)));
  content.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>removeRecord(b.dataset.delete));
}

function renderKanban(){
  const statuses=["Novo Lead","Contato Feito","Visita Agendada","Proposta","Fechado"];
  content.innerHTML=`<div class="kanban">${statuses.map(s=>`<section class="kanban-column"><h3>${s} · ${state.records.filter(x=>x.status===s).length}</h3>${state.records.filter(x=>x.status===s).map(x=>`<article class="lead-card" data-edit="${x.id}"><strong>${x.name}</strong><small>${x.phone||x.email||""}</small><small>${x.origin||""} ${x.property?`· ${x.property}`:""}</small></article>`).join("")}</section>`).join("")}</div>`;
  content.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>openEditor(state.records.find(r=>r.id===x.dataset.edit)));
}
function renderCalendar(){
  const now=new Date(), year=now.getFullYear(),month=now.getMonth(),first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),padding=first.getDay();
  const cells=Array.from({length:padding},()=>`<div class="calendar-day"></div>`).concat(Array.from({length:days},(_,i)=>{const day=i+1,key=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,events=state.records.filter(x=>x.date===key);return `<div class="calendar-day"><strong>${day}</strong>${events.map(e=>`<div class="calendar-event" data-edit="${e.id}">${e.time||""} ${e.title}</div>`).join("")}</div>`;}));
  content.innerHTML=`<div class="panel"><div class="panel-header"><div><p class="overline">Calendário visual</p><h2>${now.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h2></div></div><div class="calendar">${cells.join("")}</div></div>`;
  content.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>openEditor(state.records.find(r=>r.id===x.dataset.edit)));
}

async function renderReports(){
  const [properties,leads,brokers,finance]=await Promise.all(["properties","leads","brokers","finance"].map(fetchCollection));
  const closed=leads.filter(x=>x.status==="Fechado").length, conversion=leads.length?Math.round(closed/leads.length*100):0;
  content.innerHTML=`<div class="metric-grid">${metric("Leads gerados",leads.length,"Todos os canais")}${metric("Conversão",`${conversion}%`,`${closed} negócios fechados`)}${metric("Vendas e locações",properties.filter(x=>["Vendido","Alugado"].includes(x.status)).length,"Imóveis concluídos")}${metric("Corretores",brokers.length,"Equipe cadastrada")}</div>
  <div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><p class="overline">Financeiro</p><h2>Movimentação por período</h2></div></div>${chartMarkup(finance)}</section><section class="panel"><div class="panel-header"><div><p class="overline">Portfólio</p><h2>Status dos imóveis</h2></div></div><ul class="activity-list">${["Disponível","Reservado","Vendido","Alugado"].map(s=>`<li><strong>${s}</strong><span>${properties.filter(x=>x.status===s).length}</span></li>`).join("")}</ul></section></div>`;
}
async function renderSettings(){
  const snap=await getDoc(doc(db,"settings","company")), data=snap.exists()?snap.data():{};
  content.innerHTML=`<div class="dashboard-grid"><form class="panel" id="company-form"><div class="panel-header"><div><p class="overline">Empresa</p><h2>Dados institucionais</h2></div></div><div style="margin-top:24px">
    ${fieldHtml(["name","Nome da empresa","text",true],data.name||"Grupo Shalom")}
    ${fieldHtml(["email","E-mail","email"],data.email||"assessoriagruposhalom@outlook.com")}
    ${fieldHtml(["whatsapp","WhatsApp","tel"],data.whatsapp||"+595 986 523099")}
    ${fieldHtml(["logoUrl","URL da logo","url"],data.logoUrl||"")}
    ${fieldHtml(["socialNetworks","Redes sociais","textarea"],data.socialNetworks||"")}
    ${fieldHtml(["emailSettings","Configurações de e-mail","textarea"],data.emailSettings||"")}
    <button class="primary-btn">Salvar configurações</button></div></form>
    <section class="panel"><div class="panel-header"><div><p class="overline">Integrações</p><h2>Status dos serviços</h2></div></div><ul class="activity-list"><li><strong>Firebase Authentication</strong><span class="status ativo">Ativo</span></li><li><strong>Cloud Firestore</strong><span class="status ativo">Ativo</span></li><li><strong>Firebase Storage</strong><span class="status ${storageEnabled?"ativo":"pendente"}">${storageEnabled?"Ativo":"Desativado"}</span></li><li><strong>Mídia e documentos</strong><small>Cadastro por URL enquanto o Storage estiver desativado.</small></li></ul></section></div>
    ${state.profile.role==="administrador"?permissionsMarkup(data.rolePermissions||defaultPermissions):""}`;
  $("#company-form").onsubmit=async e=>{e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget));await setDoc(doc(db,"settings","company"),{...payload,updatedAt:serverTimestamp()},{merge:true});toast("Configurações salvas.");};
  $("#permissions-form")?.addEventListener("submit",savePermissions);
}
function permissionsMarkup(saved){
  const roles=["gerente","corretor","atendente"], access=Object.keys(modules);
  return `<form class="panel" id="permissions-form" style="margin-top:20px"><div class="panel-header"><div><p class="overline">Controle de acesso</p><h2>Permissões por função</h2></div><button class="primary-btn">Salvar permissões</button></div><div class="permission-grid" style="margin-top:20px">${roles.map(role=>`<div class="permission-card"><h3>${role}</h3>${access.map(key=>`<label><input type="checkbox" name="${role}" value="${key}" ${(saved[role]||defaultPermissions[role]||[]).includes(key)?"checked":""}>${modules[key].label}</label>`).join("")}</div>`).join("")}</div></form>`;
}
async function savePermissions(e){
  e.preventDefault();const fd=new FormData(e.currentTarget), rolePermissions={administrador:defaultPermissions.administrador};
  ["gerente","corretor","atendente"].forEach(r=>rolePermissions[r]=fd.getAll(r));
  await setDoc(doc(db,"settings","company"),{rolePermissions,updatedAt:serverTimestamp()},{merge:true});
  const users=await getDocs(collection(db,"users")),batch=writeBatch(db);
  users.forEach(userDoc=>{const user=userDoc.data();if(user.role!=="administrador")batch.update(userDoc.ref,{permissions:rolePermissions[user.role]||[],updatedAt:serverTimestamp()});});
  await batch.commit();toast("Permissões atualizadas para todos os usuários.");
}

function openEditor(record=null){
  const mod=modules[state.route];state.editId=record?.id||null;
  $("#dialog-overline").textContent=record?"Edição":"Novo cadastro";$("#dialog-title").textContent=`${record?"Editar":"Novo"} ${mod.singular}`;
  $("#editor-fields").innerHTML=mod.fields.map(f=>fieldHtml(f,record?.[f[0]])).join("");
  $("#editor-message").textContent="";
  dialog.showModal();
}
function fieldHtml(field,value=""){
  const [name,label,type,required]=field;
  const layout=Array.isArray(field[4])?field[5]:field[4],options=Array.isArray(field[4])?field[4]:(field[5]||[]);
  const cls=`field ${layout==="full"?"full":""} ${type==="checkbox"?"checkbox":""}`;
  if(type==="checkbox")return `<label class="${cls}"><input type="checkbox" name="${name}" ${value!==false&&value!==""?"checked":""}>${label}</label>`;
  if(type==="select")return `<label class="${cls}">${label}<select name="${name}" ${required?"required":""}><option value="">Selecione</option>${(options||[]).map(o=>`<option ${String(value)===o?"selected":""}>${o}</option>`).join("")}</select></label>`;
  if(type==="textarea")return `<label class="${cls}">${label}<textarea name="${name}" ${required?"required":""}>${value||""}</textarea>${name.toLowerCase().includes("url")?'<span class="help">Sem Storage: informe uma URL pública por linha.</span>':""}</label>`;
  return `<label class="${cls}">${label}<input type="${type}" name="${name}" value="${value??""}" ${required?"required":""}></label>`;
}
$("#close-dialog").onclick=$("#cancel-dialog").onclick=()=>dialog.close();
editorForm.addEventListener("submit",async e=>{
  e.preventDefault();const mod=modules[state.route],fd=new FormData(e.currentTarget),payload={};
  mod.fields.forEach(([name,,,])=>{const input=e.currentTarget.elements[name];if(!input)return;payload[name]=input.type==="checkbox"?input.checked:normalize(fd.get(name));});
  payload.updatedAt=serverTimestamp();
  try{
    if(state.route==="users"&&!state.editId){
      if(!payload.initialPassword||payload.initialPassword.length<6)throw new Error("A senha inicial deve ter ao menos 6 caracteres.");
      const secondary=initializeApp(firebaseConfig,`user-create-${Date.now()}`),secondaryAuth=getAuth(secondary);
      let credential;
      try{
        credential=await createUserWithEmailAndPassword(secondaryAuth,payload.email,payload.initialPassword);
        delete payload.initialPassword;payload.createdAt=serverTimestamp();payload.createdBy=state.user.uid;
        const company=await getDoc(doc(db,"settings","company"));const perms=company.data()?.rolePermissions?.[payload.role]||defaultPermissions[payload.role]||[];
        payload.permissions=perms;
        await setDoc(doc(db,"users",credential.user.uid),payload);
      }catch(error){
        if(credential?.user)try{await deleteUser(credential.user);}catch{}
        throw error;
      }finally{
        await signOut(secondaryAuth).catch(()=>{});
        await deleteApp(secondary).catch(()=>{});
      }
    }else{
      delete payload.initialPassword;
      if(state.editId)await updateDoc(doc(db,mod.collection,state.editId),payload);
      else await addDoc(collection(db,mod.collection),{...payload,createdAt:serverTimestamp(),createdBy:state.user.uid});
    }
    dialog.close();toast("Registro salvo com sucesso.");await navigate(state.route);
  }catch(err){$("#editor-message").textContent=err.message||"Não foi possível salvar.";}
});
async function removeRecord(id){
  const mod=modules[state.route],record=state.records.find(x=>x.id===id);
  if(!confirm(state.route==="users"?`Desativar o acesso de ${record?.name||"este usuário"}?`:`Excluir este ${mod.singular.toLowerCase()}?`))return;
  if(state.route==="users")await updateDoc(doc(db,"users",id),{active:false,updatedAt:serverTimestamp()});
  else await deleteDoc(doc(db,mod.collection,id));
  toast(state.route==="users"?"Usuário desativado.":"Registro excluído.");await navigate(state.route);
}
