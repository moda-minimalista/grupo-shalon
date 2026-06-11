const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 30);
});

menuButton.addEventListener("click", () => {
  const open = menuButton.classList.toggle("active");
  nav.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.classList.remove("active");
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
  revealObserver.observe(element);
});

document.querySelectorAll(".favorite").forEach((button) => {
  button.addEventListener("click", () => {
    const active = button.classList.toggle("active");
    button.textContent = active ? "♥" : "♡";
    button.setAttribute("aria-label", active ? "Remover dos favoritos" : "Favoritar imóvel");
  });
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const text = [
    "Olá, Grupo Shalom!",
    `Meu nome é ${data.get("nome")}.`,
    `Meu interesse: ${data.get("interesse")}.`,
    `Meu WhatsApp: ${data.get("telefone")}.`,
    data.get("mensagem") ? `Mensagem: ${data.get("mensagem")}` : ""
  ].filter(Boolean).join("\n");

  document.querySelector(".form-status").textContent = "Abrindo uma conversa no WhatsApp...";
  window.open(`https://wa.me/595971131739?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
});
