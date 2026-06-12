import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const whatsapp = "595986523099";

window.saveLeadAndOpenWhatsapp = async (form, text) => {
  const data = new FormData(form);
  const status = form.querySelector(".form-status");
  try {
    status.textContent = "Registrando seu contato...";
    await addDoc(collection(db, "leads"), {
      name: String(data.get("nome") || "").trim(),
      phone: String(data.get("telefone") || "").trim(),
      email: "",
      origin: "Site",
      property: String(data.get("interesse") || "").trim(),
      contactDate: new Date().toISOString().slice(0, 10),
      status: "Novo Lead",
      notes: String(data.get("mensagem") || "").trim(),
      createdAt: serverTimestamp()
    });
    status.textContent = "Contato registrado. Abrindo o WhatsApp...";
  } catch {
    status.textContent = "Abrindo o WhatsApp...";
  }
  window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
};

async function loadPublishedProperties() {
  const grid = document.querySelector(".catalog-properties .property-grid");
  if (!grid) return;
  try {
    const snap = await getDocs(query(collection(db, "properties"), where("published", "==", true)));
    snap.forEach((propertyDoc) => {
      const item = propertyDoc.data();
      if (document.querySelector(`[data-firestore-id="${propertyDoc.id}"]`)) return;
      const photos = String(item.photoUrls || "").split(/\r?\n/).filter(Boolean);
      const article = document.createElement("article");
      article.className = "property-card reveal visible";
      article.dataset.firestoreId = propertyDoc.id;
      article.innerHTML = `
        <div class="property-image" style="background-image:url('${escapeUrl(photos[0] || "assets/hero-residencia.png")}')">
          <span class="tag">${escapeHtml(item.purpose || "Imóvel")}</span>
        </div>
        <div class="property-body">
          <p class="location">${escapeHtml([item.city, item.country].filter(Boolean).join(" · "))}</p>
          <h3>${escapeHtml(item.title || "Imóvel")}</h3>
          <p class="property-summary">${escapeHtml(item.description || "")}</p>
          <div class="features"><span>${Number(item.bedrooms || 0)} quartos</span><span>${Number(item.bathrooms || 0)} banheiros</span><span>${Number(item.parking || 0)} vagas</span></div>
          <details class="property-details"><summary>Ver informações completas <span>+</span></summary><div>
            <p>${escapeHtml(item.description || "")}</p>
            <p><strong>Endereço:</strong> ${escapeHtml(item.address || "")}</p>
            <p><strong>Área:</strong> ${escapeHtml(item.totalArea || "—")} m²</p>
          </div></details>
          <div class="property-footer"><strong>${formatMoney(item.value, item.currency)}</strong><a href="https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá, tenho interesse no imóvel ${item.code || ""} - ${item.title || ""}.`)}" target="_blank" rel="noreferrer">Tenho interesse →</a></div>
        </div>`;
      grid.appendChild(article);
    });
  } catch (error) {
    console.warn("Imóveis do Firebase indisponíveis.", error);
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
function escapeUrl(value) {
  return String(value ?? "").replace(/['"()]/g, "");
}
function formatMoney(value, currency = "BRL") {
  if (value === "" || value == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
}

loadPublishedProperties();
