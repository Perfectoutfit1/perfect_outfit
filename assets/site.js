// Shared by index.html and showcase.html: contact details, lead delivery and the "Book a meeting" dialog.
(function () {
  const PO = window.PO = {
    email: "perfectoutfitintl@gmail.com",
    whatsapp: "923246574840",          // international format, digits only
    whatsappDisplay: "+92 324 6574840",
    // FormSubmit relays form posts to the inbox above. The first post sends a one-time "Activate" email.
    formEndpoint: "https://formsubmit.co/ajax/perfectoutfitintl@gmail.com"
  };

  PO.waLink = text => "https://wa.me/" + PO.whatsapp + "?text=" + encodeURIComponent(text);

  // Opens WhatsApp in a new tab (falls back to the same tab if pop-ups are blocked).
  PO.openWhatsApp = text => {
    const url = PO.waLink(text);
    if (!window.open(url, "_blank", "noopener")) location.href = url;
  };

  // Emails a lead to the inbox. Resolves true when it was accepted.
  PO.sendLead = (subject, fields) =>
    fetch(PO.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ _subject: subject, _template: "table", "Sent from": location.href }, fields)),
      keepalive: true
    })
      .then(r => r.ok ? r.json() : { success: "false" })
      .then(j => String(j.success) === "true")
      .catch(() => false);

  /* ---------- Book a meeting ---------- */
  const dlg = document.createElement("dialog");
  dlg.className = "meet";
  dlg.setAttribute("aria-labelledby", "meetTitle");
  dlg.innerHTML = `
    <form class="meet-form" novalidate>
      <button type="button" class="meet-x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <span class="meet-eyebrow">Free 15-min video call</span>
      <h3 id="meetTitle">Book a meeting <span>with us</span></h3>
      <p class="meet-sub">Pick a time that suits you. We'll confirm on WhatsApp and send you the meeting link.</p>
      <div class="meet-grid">
        <label class="meet-full">Your name *<input name="name" required autocomplete="name"></label>
        <label class="meet-full">Brand name<input name="brand" autocomplete="organization"></label>
        <label>Preferred day *<input name="day" type="date" required></label>
        <label>Preferred time *<input name="time" type="time" required></label>
        <label class="meet-full">What would you like to discuss?
          <select name="topic">
            <option>Starting a new collection</option>
            <option>Samples &amp; pricing</option>
            <option>Bulk / reorder</option>
            <option>Team uniforms</option>
            <option>Something else</option>
          </select>
        </label>
      </div>
      <button type="submit" class="btn btn-primary meet-go">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2z"/></svg>
        Request meeting on WhatsApp
      </button>
      <p class="meet-msg" role="status"></p>
      <p class="meet-note">WhatsApp opens with your request ready to send to ${PO.whatsappDisplay}.</p>
    </form>`;
  document.body.appendChild(dlg);

  const form = dlg.querySelector("form"), msg = dlg.querySelector(".meet-msg");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  form.day.min = new Date().toISOString().slice(0, 10);

  PO.openMeeting = () => {
    msg.textContent = "";
    dlg.showModal();
    form.name.focus();
  };
  dlg.querySelector(".meet-x").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-meeting]");
    if (b) { e.preventDefault(); PO.openMeeting(); }
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (!d.name.trim() || !d.day || !d.time) { msg.textContent = "Please add your name and a preferred day and time."; return; }
    const when = new Date(d.day + "T" + d.time).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    const text = [
      "Hi Perfect Outfit Intl, I'd like to book a meeting.",
      "Name: " + d.name.trim(),
      d.brand.trim() && "Brand: " + d.brand.trim(),
      "Preferred time: " + when + (tz ? " (" + tz + ")" : ""),
      "Topic: " + d.topic,
      "Please share the meeting link."
    ].filter(Boolean).join("\n");
    PO.openWhatsApp(text);
    // Email copy so no request is lost if the visitor doesn't hit send in WhatsApp.
    PO.sendLead("Meeting request — " + (d.brand.trim() || d.name.trim()), {
      Name: d.name.trim(), Brand: d.brand.trim(), "Preferred time": when + (tz ? " (" + tz + ")" : ""), Topic: d.topic
    });
    msg.textContent = "WhatsApp opened — hit send and we'll reply with the meeting link.";
  });
})();
