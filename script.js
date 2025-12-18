// script.js — restored and complete
// - Video crossfade (9s)
// - Video modal (YouTube / MP4)
// - Calendar injection + time slots + confirm dialog
// - Contact form client-side validation
// - Logo slider (simple RAF) with pause on hover

(() => {
  // Configuration
  const SWITCH_INTERVAL_MS = 9000;
  const CROSSFADE_MS = 1000; // matches CSS transition for opacity
  const VIDEO_SOURCE = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // change to your video embed or mp4 link

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Expose logo click scroll
  window.scrollToHome = function() {
    const el = $("#home");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  document.addEventListener("DOMContentLoaded", () => {
    // ---------- Video crossfade ----------
    const vids = [$("#video1"), $("#video2")].filter(Boolean);
    let vidIndex = 0;
    if (vids.length) {
      vids.forEach((v,i) => v.classList.toggle("active", i===0));
      vids.forEach(v => { try { v.muted = true; v.playsInline = true; v.play().catch(()=>{}); } catch(e){} });
      if (vids.length > 1) {
        setInterval(() => {
          const next = (vidIndex + 1) % vids.length;
          vids[next].classList.add("active");
          setTimeout(() => { vids[vidIndex].classList.remove("active"); vidIndex = next; }, CROSSFADE_MS);
        }, SWITCH_INTERVAL_MS);
      }
    }

    // ---------- Logo slider (simple RAF) ----------
    const logoRoot = $("#logoSlider");
    if (logoRoot) {
      const tracks = logoRoot.querySelectorAll(".slider-track");
      if (tracks.length >= 2) {
        const first = tracks[0];
        let trackW = first.getBoundingClientRect().width;
        const recompute = () => { trackW = first.getBoundingClientRect().width; };
        window.addEventListener("resize", recompute);
        setTimeout(recompute, 300);
        let offset = 0;
        const speed = Math.max(40, trackW/20);
        let lastTs = null;
        let running = true;
        function step(ts) {
          if (!running) { lastTs = null; requestAnimationFrame(step); return; }
          if (!lastTs) lastTs = ts;
          const dt = ts - lastTs;
          lastTs = ts;
          offset += (speed * dt) / 1000;
          if (offset >= trackW) offset -= trackW;
          logoRoot.style.transform = `translateX(-${offset}px)`;
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        logoRoot.addEventListener("mouseenter", () => running = false);
        logoRoot.addEventListener("mouseleave", () => running = true);
      }
    }

    // ---------- Video modal ----------
    const videoModal = $("#videoModal");
    const videoContainer = videoModal ? videoModal.querySelector(".video-container") : null;
    const openVideoBtn = $("#openVideoBtn");
    const closeVideoBtn = $("#closeVideoBtn");

    window.openVideo = function(src) {
      if (!videoModal || !videoContainer) return;
      const prev = videoContainer.querySelector("iframe,video");
      if (prev) prev.remove();
      const url = src || VIDEO_SOURCE;
      if (/\.mp4(\?.*)?$/i.test(url)) {
        const v = document.createElement("video");
        v.src = url;
        v.controls = true; v.autoplay = true; v.playsInline = true;
        videoContainer.appendChild(v);
        v.play().catch(()=>{});
      } else {
        const ifr = document.createElement("iframe");
        ifr.src = url + (url.includes("?") ? "&" : "?") + "autoplay=1";
        ifr.allow = "autoplay; encrypted-media";
        ifr.setAttribute("allowfullscreen", "");
        videoContainer.appendChild(ifr);
      }
      videoModal.setAttribute("aria-hidden","false");
      videoModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    };

    window.closeVideo = function() {
      if (!videoModal || !videoContainer) return;
      const m = videoContainer.querySelector("iframe,video");
      if (m) { if (m.tagName === "IFRAME") m.src = ""; m.remove(); }
      videoModal.setAttribute("aria-hidden","true");
      videoModal.style.display = "none";
      document.body.style.overflow = "";
    };

    if (openVideoBtn) openVideoBtn.addEventListener("click", () => openVideo());
    if (closeVideoBtn) closeVideoBtn.addEventListener("click", () => closeVideo());
    if (videoModal) videoModal.addEventListener("click", (e) => { if (e.target === videoModal) closeVideo(); });

    // ---------- Booking calendar injection & logic ----------
    
const BB = document.querySelector("#bb-calendar");

if (BB) {
  BB.innerHTML = `
    <div class="bb-left">
      <h2 class="bb-title">Book a Meeting</h2>
      <p class="bb-desc">Choose your preferred date and time to schedule your session.</p>
    </div>
    <div class="bb-right">
      <div class="calendar-times-wrapper">
        <div class="calendar-section">
          <h3>Select a Date</h3>
          <div id="calendar" class="calendar" role="grid"></div>
        </div>
        <div class="times-section">
          <h3>Select a Time</h3>
          <div id="timeSlots" class="time-grid"></div>
        </div>
      </div>
    </div>
  `;
  
  const calendarEl = document.querySelector("#calendar");
  const timeSlotsEl = document.querySelector("#timeSlots");

  let today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let selectedDate = null;
  let selectedTime = null;

  function renderCalendar() {
    calendarEl.innerHTML = "";
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const el = document.createElement("div");
      el.className = "day";
      el.tabIndex = 0;
      el.textContent = d;
      el.addEventListener("click", () => {
        calendarEl.querySelectorAll(".day").forEach(x => x.classList.remove("active"));
        el.classList.add("active");
        selectedDate = new Date(currentYear, currentMonth, d);
        renderTimeSlots();
      });
      el.addEventListener("keydown", (e) => { 
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } 
      });
      calendarEl.appendChild(el);
    }
  }
  renderCalendar();

  const times = ["8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"];

  function renderTimeSlots() {
    timeSlotsEl.innerHTML = "";
    if (!selectedDate) return;
    times.forEach(t => {
      const s = document.createElement("div");
      s.className = "slot";
      s.tabIndex = 0;
      s.textContent = t;
      s.addEventListener("click", () => {
        selectedTime = t;
        window.location.href = `#contactFormSection`;
        const form = document.querySelector("#contactForm");
        if (form) {
          form.querySelector("input[name='bookingDate']").value = selectedDate.toDateString();
          form.querySelector("input[name='bookingTime']").value = selectedTime;
        }
      });
      s.addEventListener("keydown", (e) => { 
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.click(); } 
      });
      timeSlotsEl.appendChild(s);
    });
  }
}

// ---------------- Contact Form Handling ----------------
const contactForm = document.querySelector("#contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fm = new FormData(contactForm);
    if (!fm.get("name") || !fm.get("email") || !fm.get("phone") || !fm.get("service")) {
      alert("Please fill all fields.");
      return;
    }

    // WhatsApp notification to owner
    const ownerNumber = "923336311387"; // your number with country code
    const message = `New Booking:
Name: ${fm.get("name")}
Email: ${fm.get("email")}
Phone: ${fm.get("phone")}
Service: ${fm.get("service")}
Date: ${fm.get("bookingDate")}
Time: ${fm.get("bookingTime")}`;
    const whatsappUrl = `https://wa.me/${ownerNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    // Send email via Formspree
    fetch(contactForm.action, {
      method: "POST",
      body: fm,
      headers: { 'Accept': 'application/json' }
    }).then(response => {
      if (response.ok) alert("Booking confirmed! We will contact you shortly.");
      contactForm.reset();
    }).catch(error => {
      alert("Error submitting the form.");
      console.error(error);
    });
  });
}


  }); // DOMContentLoaded
})(); 
// Simple video popup
const openBtn = document.getElementById("openVideoBtn");
const modal = document.getElementById("videoModal");
const closeBtn = document.getElementById("closeVideoBtn");
const container = document.querySelector(".video-container");

// change this to your video link
const VIDEO_SOURCE = "https://www.youtube.com/embed/dQw4w9WgXcQ";

openBtn.onclick = () => {
  modal.style.display = "flex";
  container.innerHTML = `<iframe width="900" height="500" src="${VIDEO_SOURCE}" frameborder="0" allowfullscreen></iframe>`;
};

closeBtn.onclick = () => {
  modal.style.display = "none";
  container.innerHTML = "";
};
