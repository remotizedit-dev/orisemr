import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Helper to convert image file to base64 data URL
function toBase64Image(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    console.warn("Image file not found:", filePath);
    return "";
  }
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : "application/octet-stream";
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${data}`;
}

const assetsDir = path.join(process.cwd(), "public", "brochure-assets");

console.log("Loading screenshot assets...");
const imgDashboard = toBase64Image(path.join(assetsDir, "1-dashboard.png"));
const imgAppointment = toBase64Image(path.join(assetsDir, "2-appointment-booking.png"));
const imgQueue = toBase64Image(path.join(assetsDir, "3-live-queue.png"));
const imgRxBuilder = toBase64Image(path.join(assetsDir, "4-prescription-builder.png"));
const imgPrintableRx = toBase64Image(path.join(assetsDir, "5-printable-rx.png"));
const imgPatientLedger = toBase64Image(path.join(assetsDir, "6-patient-ledger.png"));
const imgBilling = toBase64Image(path.join(assetsDir, "7-billing-checkout.png"));
const imgPrintableInvoice = toBase64Image(path.join(assetsDir, "8-printable-invoice.png"));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ORIS EMR - Doctor & Clinic QuickStart Handover Brochure</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
      @bottom-right {
        content: "ORIS EMR • Doctor Onboarding Brochure";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 7pt;
        color: #94A3B8;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.4;
      font-size: 8.5pt;
      margin: 0;
      padding: 0;
    }

    .page {
      page-break-after: always;
      height: 275mm;
      max-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Top Nav / Running Header on Content Pages */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      margin-bottom: 8px;
      border-bottom: 1.5px solid #E2E8F0;
    }

    .page-header .brand {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .brand-logo-badge {
      width: 24px;
      height: 24px;
      border-radius: 7px;
      background: #2A5CAA;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 11pt;
    }

    .brand-name {
      font-size: 11pt;
      font-weight: 900;
      color: #0F172A;
      letter-spacing: -0.5px;
    }

    .brand-name span {
      color: #2A5CAA;
    }

    .page-header .module-tag {
      font-size: 7pt;
      font-weight: 800;
      background: #E8EEF7;
      color: #2A5CAA;
      padding: 3px 9px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Headings */
    h1.page-title {
      font-size: 17pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0F172A;
      line-height: 1.15;
      margin: 0 0 3px 0;
    }

    p.page-desc {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
      margin: 0 0 8px 0;
    }

    /* Cards & Containers */
    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 9px 11px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .card-highlight {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 3.5px solid #2A5CAA;
    }

    .card-success {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 3.5px solid #10B981;
    }

    .card-warning {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-left: 3.5px solid #F59E0B;
    }

    .card-danger {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-left: 3.5px solid #EF4444;
    }

    .card-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .card-body {
      font-size: 7.5pt;
      color: #475569;
      line-height: 1.35;
    }

    /* Screenshot Display Frames */
    .screenshot-frame {
      border: 1.5px solid #CBD5E1;
      border-radius: 9px;
      overflow: hidden;
      background: #F8FAFC;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      margin: 4px 0 8px 0;
      display: flex;
      flex-direction: column;
    }

    .screenshot-header {
      background: #F1F5F9;
      border-bottom: 1px solid #E2E8F0;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .window-dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-red { background: #EF4444; }
    .dot-yellow { background: #F59E0B; }
    .dot-green { background: #10B981; }

    .window-title {
      font-size: 6.5pt;
      font-family: 'JetBrains Mono', monospace;
      color: #64748B;
      font-weight: 600;
    }

    .screenshot-img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }

    .screenshot-crop-medium {
      width: 100%;
      height: 295px;
      object-fit: cover;
      object-position: top;
      display: block;
    }

    .screenshot-crop-short {
      width: 100%;
      height: 270px;
      object-fit: cover;
      object-position: top;
      display: block;
    }

    /* Grids */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    /* Badges & Pills */
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 6.8pt;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .pill-blue { background: #E8EEF7; color: #2A5CAA; }
    .pill-green { background: #ECFDF5; color: #047857; }
    .pill-amber { background: #FFFBEB; color: #B45309; }
    .pill-purple { background: #FAF5FF; color: #7E22CE; }

    /* Footer */
    .page-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      color: #94A3B8;
    }

    /* =========================================================================
       PAGE 1: COVER
       ========================================================================= */
    .cover-box {
      background: linear-gradient(145deg, #0A192F 0%, #0F2347 50%, #17386E 100%);
      color: #FFFFFF;
      border-radius: 14px;
      padding: 34px 28px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .cover-box::after {
      content: "";
      position: absolute;
      bottom: -60px;
      right: -60px;
      width: 260px;
      height: 260px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 70%);
      border-radius: 50%;
    }

    .cover-top-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #93C5FD;
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 5px 12px;
      border-radius: 20px;
      width: fit-content;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.8px;
      margin: 16px 0 10px 0;
      color: #FFFFFF;
    }

    .cover-title span {
      background: linear-gradient(90deg, #38BDF8, #34D399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-subtitle {
      font-size: 10.5pt;
      color: #CBD5E1;
      line-height: 1.5;
      max-width: 580px;
      margin-bottom: 20px;
    }

    .cover-stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 12px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .cover-stat-box .num {
      font-size: 15pt;
      font-weight: 900;
      color: #38BDF8;
      line-height: 1.1;
    }

    .cover-stat-box .label {
      font-size: 7pt;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }

    .cover-highlights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 18px;
    }

    .cover-pill-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 10px 12px;
      backdrop-filter: blur(4px);
    }

    .cover-pill-card h4 {
      margin: 0 0 3px 0;
      font-size: 9pt;
      font-weight: 800;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cover-pill-card p {
      margin: 0;
      font-size: 7.8pt;
      color: #CBD5E1;
      line-height: 1.35;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 8pt;
      color: #CBD5E1;
    }

    /* Flow Chart Elements */
    .flow-step-card {
      background: #FFFFFF;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      padding: 8px 10px;
      position: relative;
    }

    .flow-step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #2A5CAA;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .flow-step-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 2px;
    }

    .flow-step-desc {
      font-size: 7pt;
      color: #475569;
      line-height: 1.3;
    }

    /* Comparison Table */
    table.compare-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin: 6px 0;
    }

    table.compare-table th {
      background: #0F172A;
      color: #FFFFFF;
      text-align: left;
      padding: 6px 8px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table.compare-table th:first-child { border-radius: 6px 0 0 0; }
    table.compare-table th:last-child { border-radius: 0 6px 0 0; }

    table.compare-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      color: #334155;
    }

    table.compare-table tr:nth-child(even) td { background: #F8FAFC; }
    table.compare-table tr.highlight td { background: #EFF6FF; font-weight: 700; color: #1E40AF; }

    .tag-check { color: #16A34A; font-weight: 900; }
    .tag-cross { color: #DC2626; font-weight: 900; }

  </style>
</head>
<body>

  <!-- ========================================================================= -->
  <!-- PAGE 1: LUXURY EXECUTIVE COVER                                             -->
  <!-- ========================================================================= -->
  <div class="page">
    <div class="cover-box">
      <div>
        <div class="cover-top-badge">🦷 Clinical Practice Operating System &bull; Edition 2026-2027</div>
        <div class="cover-title">
          Dental Practice Made <span>Fast, Simple &amp; Stress-Free.</span>
        </div>
        <div class="cover-subtitle">
          Designed specifically for busy doctors and non-technical clinic staff.
          Issue digital prescriptions in under 30 seconds, automate follow-up visits with 1-click rewrites,
          eliminate reception chaos, and manage a 100% transparent patient financial ledger.
        </div>

        <div class="cover-stats-row">
          <div class="cover-stat-box">
            <div class="num">&lt; 30s</div>
            <div class="label">Bangla Rx Creation</div>
          </div>
          <div class="cover-stat-box">
            <div class="num">1 Click</div>
            <div class="label">Follow-up Rewrite</div>
          </div>
          <div class="cover-stat-box">
            <div class="num">৳0 Math</div>
            <div class="label">Doctor Fee Auto-Handoff</div>
          </div>
          <div class="cover-stat-box">
            <div class="num">100%</div>
            <div class="label">Whole-BDT Ledger</div>
          </div>
        </div>

        <div class="cover-highlights-grid">
          <div class="cover-pill-card">
            <h4>🩺 For the Busy Doctor</h4>
            <p>Interactive FDI tooth odontogram, 1-click Bangla dosage presets, and instant visit fee selection. No typing essays.</p>
          </div>
          <div class="cover-pill-card">
            <h4>🛎️ For Reception &amp; Staff</h4>
            <p>Smart schedule by chair minutes, instant walk-in lounge check-in, and automatic preloaded billing from doctor’s Rx.</p>
          </div>
          <div class="cover-pill-card">
            <h4>💰 Complete Payment Ledger</h4>
            <p>Real-time running balances, debit &amp; credit timelines, payment receipts (Cash/bKash/Card), and instant dues settlement.</p>
          </div>
          <div class="cover-pill-card">
            <h4>🔒 Private Chamber Security</h4>
            <p>Chamber isolation privacy mode ensures your patient records and earnings breakdown are 100% confidential.</p>
          </div>
        </div>
      </div>

      <div class="cover-footer">
        <div>
          <strong>ORIS EMR</strong> &bull; Non-Tech Doctor &amp; Clinic Onboarding Guide
        </div>
        <div style="color: #38BDF8; font-weight: 700;">
          Works on Any Device &bull; iPad, Laptop, PC, Phone &bull; No Installation Needed
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 2: THE 4-STEP STREAMLINED CLINICAL FLOW                              -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="brand">
          <div class="brand-logo-badge">O</div>
          <div class="brand-name">ORIS<span>EMR</span></div>
        </div>
        <div class="module-tag">Core Workflow Overview</div>
      </div>

      <h1 class="page-title">The Effortless 4-Step Patient Journey</h1>
      <p class="page-desc">
        Designed from the ground up to eliminate reception confusion, phone calls to the doctor's chamber, and manual price calculations.
      </p>

      <!-- 4-Step Diagram -->
      <div class="grid-4" style="margin-bottom: 8px;">
        <div class="flow-step-card">
          <div class="flow-step-num">1</div>
          <div class="flow-step-title">Patient Arrival</div>
          <div class="flow-step-desc">
            Reception scans card or registers patient. Direct walk-in check-in syncs patient to waiting lounge TV queue.
          </div>
        </div>

        <div class="flow-step-card" style="border-color: #2A5CAA; background: #F8FAFC;">
          <div class="flow-step-num" style="background: #2A5CAA;">2</div>
          <div class="flow-step-title">Doctor Exam &amp; Rx</div>
          <div class="flow-step-desc">
            Doctor clicks teeth on visual chart, adds Bangla medicines in seconds, and selects <strong>Amount to be Charged</strong> (e.g. ৳500 / ৳1,000 / ৳0).
          </div>
        </div>

        <div class="flow-step-card">
          <div class="flow-step-num" style="background: #047857;">3</div>
          <div class="flow-step-title">Instant Checkout</div>
          <div class="flow-step-desc">
            Reception opens billing — doctor’s fee is <strong>already loaded</strong>. Collect via Cash, bKash, or Card and print money receipt in 1 click.
          </div>
        </div>

        <div class="flow-step-card" style="border-color: #D97706; background: #FFFBEB;">
          <div class="flow-step-num" style="background: #D97706;">4</div>
          <div class="flow-step-title">Follow-up Rewrite</div>
          <div class="flow-step-desc">
            Returning patient? Doctor opens Rx and past complaints, teeth, and medicines <strong>pre-fill automatically</strong>. Modify in 10 seconds!
          </div>
        </div>
      </div>

      <!-- Dashboard Visual Screenshot -->
      <div class="screenshot-frame">
        <div class="screenshot-header">
          <div class="window-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="window-title">Live Chamber Overview &bull; Reception &amp; Doctor Dashboard</div>
          <div style="font-size: 6.5pt; color: #16A34A; font-weight: 700;">● REAL-TIME SYNC</div>
        </div>
        <img src="${imgDashboard}" class="screenshot-crop-short" alt="Chamber Dashboard">
      </div>

      <!-- Why Doctors Love This Section -->
      <div class="grid-3" style="margin-top: 6px;">
        <div class="card card-highlight">
          <div class="card-title">⚡ 30-Second Prescription</div>
          <div class="card-body">
            Preset Bangla advice, common dental generics, and FDI tooth picker. You finish writing before the patient leaves the chair.
          </div>
        </div>

        <div class="card card-success">
          <div class="card-title">💵 Zero Price Arguments</div>
          <div class="card-body">
            No rigid catalog procedure prices! Doctor sets the consultation/procedure fee right from the prescription canvas.
          </div>
        </div>

        <div class="card card-warning">
          <div class="card-title">📊 Zero Revenue Leakage</div>
          <div class="card-body">
            Every BDT billed is attributed to the attending doctor, tracked in the patient ledger, with instant dues alert at reception.
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Oris EMR Platform &bull; Handover Guide</span>
      <span>Page 2 of 6</span>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 3: MODULE 1 — DOCTOR'S RX CHAMBER & 30-SEC PRESCRIPTION               -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="brand">
          <div class="brand-logo-badge">O</div>
          <div class="brand-name">ORIS<span>EMR</span></div>
        </div>
        <div class="module-tag">Module 1: Doctor's Chamber</div>
      </div>

      <h1 class="page-title">Digital Prescriptions in 30 Seconds</h1>
      <p class="page-desc">
        Visual FDI tooth chart &bull; 1-click Bangla dosage presets &bull; Chairside visit fee selection &bull; 1-click follow-up rewrite mode.
      </p>

      <!-- Side-by-Side: Rx Builder Canvas & Official Printout -->
      <div class="grid-2">
        <div>
          <div style="font-size: 8pt; font-weight: 800; color: #1E293B; margin-bottom: 3px;">
            🖥️ Chairside Prescription Builder (Follow-Up Rewrite &amp; Fee Presets)
          </div>
          <div class="screenshot-frame">
            <div class="screenshot-header">
              <div class="window-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="window-title">Prescription Canvas &bull; Chamber View</div>
            </div>
            <img src="${imgRxBuilder}" class="screenshot-crop-medium" alt="Prescription Builder">
          </div>
        </div>

        <div>
          <div style="font-size: 8pt; font-weight: 800; color: #1E293B; margin-bottom: 3px;">
            📄 Official Printed Bangla Prescription (A4 / Thermal Ready)
          </div>
          <div class="screenshot-frame">
            <div class="screenshot-header">
              <div class="window-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="window-title">Printable Rx &bull; Barcode &bull; BMDC Reg</div>
            </div>
            <img src="${imgPrintableRx}" class="screenshot-crop-medium" alt="Printable Rx">
          </div>
        </div>
      </div>

      <!-- Feature Callout Grid -->
      <div class="grid-2" style="margin-top: 6px;">
        <div class="card">
          <div class="card-title">
            <span class="pill pill-blue">1-Click</span> Visual Tooth Chart &amp; Bangla Advice
          </div>
          <div class="card-body">
            Select tooth numbers (11 to 48) on interactive FDI chart. One click sets dosage (০+১+০, খাবারের পরে, ৭ দিন) and dental advice (কুসুম গরম পানি, শক্ত খাবার এড়ানো).
          </div>
        </div>

        <div class="card" style="border-left: 3px solid #D97706; background: #FFFBEB;">
          <div class="card-title" style="color: #B45309;">
            🔄 Follow-Up Visit Rewrite Mode
          </div>
          <div class="card-body">
            Returning patient? An amber banner shows previous Rx. Past diagnosis, tooth codes, and medicines <strong>prefill automatically</strong>. Modify in seconds, or click <strong>"+ Add a New Prescription"</strong> to start fresh!
          </div>
        </div>

        <div class="card" style="border-left: 3px solid #2A5CAA; background: #F8FAFC;">
          <div class="card-title" style="color: #1E40AF;">
            🏷️ Amount to be Charged (Chairside Fee)
          </div>
          <div class="card-body">
            Select visit fee directly on canvas: <strong>৳0 (Routine / Free Follow-up)</strong>, <strong>৳500</strong>, <strong>৳1,000</strong>, <strong>৳1,500</strong>, <strong>৳2,000</strong>, <strong>৳3,000</strong>, <strong>৳5,000</strong> or custom amount. Reception billing immediately receives this exact amount!
          </div>
        </div>

        <div class="card card-success">
          <div class="card-title">
            🛡️ Allergy &amp; Medical History Warnings
          </div>
          <div class="card-body">
            Real-time prominent red banners alert you to local anaesthetic allergies, diabetes, hypertension, or heart disease right above the Rx canvas before you prescribe.
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Oris EMR Platform &bull; Handover Guide</span>
      <span>Page 3 of 6</span>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 4: MODULE 2 — RECEPTION, SMART SCHEDULE & LIVE QUEUE                  -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="brand">
          <div class="brand-logo-badge">O</div>
          <div class="brand-name">ORIS<span>EMR</span></div>
        </div>
        <div class="module-tag">Module 2: Smart Reception &amp; Queue</div>
      </div>

      <h1 class="page-title">Front-Desk: Zero Overlaps &amp; Live Lounge TV</h1>
      <p class="page-desc">
        Calculate appointment slots by chair minutes, check in walk-ins with 1 click, and keep your waiting lounge calm with real-time TV displays.
      </p>

      <!-- 2 Screenshot side-by-side -->
      <div class="grid-2">
        <div>
          <div style="font-size: 8pt; font-weight: 800; color: #1E293B; margin-bottom: 3px;">
            📅 Smart Appointment Slot Reservation
          </div>
          <div class="screenshot-frame">
            <div class="screenshot-header">
              <div class="window-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="window-title">Procedure Chair Timing &bull; Slot Engine</div>
            </div>
            <img src="${imgAppointment}" class="screenshot-crop-medium" alt="Appointment Booking">
          </div>
        </div>

        <div>
          <div style="font-size: 8pt; font-weight: 800; color: #1E293B; margin-bottom: 3px;">
            📺 Live 5-Stage Chamber Queue Kanban
          </div>
          <div class="screenshot-frame">
            <div class="screenshot-header">
              <div class="window-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="window-title">Waiting Lounge &bull; In Chair &bull; Billing</div>
            </div>
            <img src="${imgQueue}" class="screenshot-crop-medium" alt="Queue Management">
          </div>
        </div>
      </div>

      <!-- Feature Breakdown Cards -->
      <div class="grid-3" style="margin-top: 6px;">
        <div class="card">
          <div class="card-title">⏱️ Chair Duration Allocation</div>
          <div class="card-body">
            Procedures specify clinical duration (e.g., Scaling 30m, Root Canal 45m). Our engine automatically detects free doctor windows and prevents double-bookings.
          </div>
        </div>

        <div class="card card-warning">
          <div class="card-title">🚶‍♂️ 1-Click Walk-In Check-In</div>
          <div class="card-body">
            Patient standing at desk? Check <strong>"Check-in to Waiting Lounge immediately"</strong>. Allocates the next Daily Serial # (SL) instantly and syncs to live TV queue.
          </div>
        </div>

        <div class="card card-success">
          <div class="card-title">📺 Waiting Room TV Display</div>
          <div class="card-body">
            Display live serial calls on a standard smart TV in your waiting lounge. Patients sit comfortably knowing exactly who is in the chair and who is next.
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Oris EMR Platform &bull; Handover Guide</span>
      <span>Page 4 of 6</span>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 5: MODULE 3 & 4 — BILLING & PATIENT FINANCIAL LEDGER                 -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="brand">
          <div class="brand-logo-badge">O</div>
          <div class="brand-name">ORIS<span>EMR</span></div>
        </div>
        <div class="module-tag">Module 3 &amp; 4: Billing &amp; Financial Ledger</div>
      </div>

      <h1 class="page-title">Transparent Billing &amp; Patient Payment Ledger</h1>
      <p class="page-desc">
        Doctor sets fee in Rx &bull; Reception collects payment in 1 click &bull; Complete chronological ledger with running balance under every patient profile.
      </p>

      <!-- Side-by-Side: Patient Ledger Profile + Printable Invoice -->
      <div class="grid-2">
        <div>
          <div style="font-size: 8pt; font-weight: 800; color: #1E293B; margin-bottom: 3px;">
            👤 Patient Profile &amp; Financial Payment Ledger
          </div>
          <div class="screenshot-frame">
            <div class="screenshot-header">
              <div class="window-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="window-title">Debits &bull; Credits &bull; Running Balance &bull; Due Settlement</div>
            </div>
            <img src="${imgPatientLedger}" class="screenshot-crop-medium" alt="Patient Financial Ledger">
          </div>
        </div>

        <div>
          <div style="font-size: 8pt; font-weight: 800; color: #1E293B; margin-bottom: 3px;">
            🧾 Itemized Money Receipt &amp; A4/Thermal Invoice
          </div>
          <div class="screenshot-frame">
            <div class="screenshot-header">
              <div class="window-dots">
                <span class="dot dot-red"></span>
                <span class="dot dot-yellow"></span>
                <span class="dot dot-green"></span>
              </div>
              <div class="window-title">Money Receipt &bull; Doctor Attribution &bull; Zero Math</div>
            </div>
            <img src="${imgPrintableInvoice}" class="screenshot-crop-medium" alt="Printable Invoice">
          </div>
        </div>
      </div>

      <!-- Financial Features Grid -->
      <div class="grid-2" style="margin-top: 6px;">
        <div class="card card-highlight">
          <div class="card-title">💳 Doctor-Prescribed Fee Auto-Handoff</div>
          <div class="card-body">
            Reception never has to guess or interrupt the doctor asking <em>"How much should I charge?"</em>. The exact amount chosen in the prescription automatically populates the invoice line item.
          </div>
        </div>

        <div class="card card-success">
          <div class="card-title">🧾 Multi-Method Payment Receipts</div>
          <div class="card-body">
            Take payments via <strong>Cash, bKash, Nagad, Card/POS</strong>, or Bank Transfer. Prints professional A4 invoices or thermal money receipts in 1 click.
          </div>
        </div>

        <div class="card">
          <div class="card-title">📖 Complete Ledger Statement</div>
          <div class="card-body">
            Under every patient's profile, view every billed charge (Debit), every payment received (Credit), transaction references, attending doctor, receiving staff, and net running balance.
          </div>
        </div>

        <div class="card card-danger">
          <div class="card-title" style="color: #991B1B;">
            ⚠️ Instant Outstanding Dues Settlement
          </div>
          <div class="card-body">
            If a patient has an unpaid balance from a previous sitting, an alert badge appears with an instant <strong>"Settle Due →"</strong> button. Stop revenue leakage permanently.
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Oris EMR Platform &bull; Handover Guide</span>
      <span>Page 5 of 6</span>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 6: DOCTOR PRIVACY, COMPARISON & 15-MINUTE ONBOARDING                 -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="brand">
          <div class="brand-logo-badge">O</div>
          <div class="brand-name">ORIS<span>EMR</span></div>
        </div>
        <div class="module-tag">Doctor Trust &amp; Clinic Onboarding</div>
      </div>

      <h1 class="page-title">Doctor Privacy, Earnings &amp; Easy Onboarding</h1>
      <p class="page-desc">
        Your chamber privacy is guaranteed. No complicated installations. Zero technical training required.
      </p>

      <!-- Comparison Table -->
      <div style="margin-bottom: 8px;">
        <div style="font-size: 8.5pt; font-weight: 800; color: #0F172A; margin-bottom: 4px;">
          📊 How Oris EMR Compares to Traditional Methods
        </div>
        <table class="compare-table">
          <thead>
            <tr>
              <th style="width: 28%;">Feature</th>
              <th style="width: 24%;">Paper &amp; Hand-Writing</th>
              <th style="width: 24%;">Generic Hospital Software</th>
              <th style="width: 24%; background: #2A5CAA;">Oris Dental EMR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Prescription Speed</strong></td>
              <td>Slow (hand-written, repetitive)</td>
              <td>Clunky (5+ screens, slow dropdowns)</td>
              <td class="highlight"><span class="tag-check">✔</span> &lt; 30s with Bangla Presets</td>
            </tr>
            <tr>
              <td><strong>Follow-up Visits</strong></td>
              <td>Lost files, search paper piles</td>
              <td>Must re-type everything again</td>
              <td class="highlight"><span class="tag-check">✔</span> 1-Click Rx Rewrite &amp; History</td>
            </tr>
            <tr>
              <td><strong>Visit Fee Setting</strong></td>
              <td>Verbally shouting to reception</td>
              <td>Rigid price catalogs causing errors</td>
              <td class="highlight"><span class="tag-check">✔</span> Chairside Presets (৳0 to ৳5k)</td>
            </tr>
            <tr>
              <td><strong>Patient Payment Ledger</strong></td>
              <td>Paper khata, untracked dues</td>
              <td>Confusing accounting modules</td>
              <td class="highlight"><span class="tag-check">✔</span> 100% Transparent Running Balance</td>
            </tr>
            <tr>
              <td><strong>Doctor Chamber Privacy</strong></td>
              <td>Anyone can read paper charts</td>
              <td>All doctors see each other's data</td>
              <td class="highlight"><span class="tag-check">✔</span> Isolated Mode (Strict Privacy)</td>
            </tr>
            <tr>
              <td><strong>Device Compatibility</strong></td>
              <td>Physical only</td>
              <td>Requires expensive server/desktop</td>
              <td class="highlight"><span class="tag-check">✔</span> iPad, Phone, Laptop, Any PC</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 15-Minute Onboarding Checklist -->
      <div class="card card-highlight" style="margin-bottom: 8px;">
        <div class="card-title">🚀 Ready in 15 Minutes — Zero Technical Setup</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 5px;">
          <div style="background: #FFFFFF; padding: 7px 9px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #2A5CAA;">STEP 1: Log In</div>
            <div style="font-size: 7pt; color: #475569; margin-top: 2px;">
              Open in your web browser. No download, no local server, no IT technician required.
            </div>
          </div>
          <div style="background: #FFFFFF; padding: 7px 9px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #2A5CAA;">STEP 2: Add Doctors</div>
            <div style="font-size: 7pt; color: #475569; margin-top: 2px;">
              Set doctor names, BMDC numbers, and chamber timings. Upload clinic logo in 2 minutes.
            </div>
          </div>
          <div style="background: #FFFFFF; padding: 7px 9px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div style="font-size: 7.8pt; font-weight: 800; color: #2A5CAA;">STEP 3: Start Seeing Patients</div>
            <div style="font-size: 7pt; color: #475569; margin-top: 2px;">
              Write your first prescription immediately. Staff can master reception in under 10 minutes!
            </div>
          </div>
        </div>
      </div>

      <!-- Direct Handover / Contact Box -->
      <div style="background: linear-gradient(135deg, #0F172A, #1E3A8A); color: #FFFFFF; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 7.5pt; color: #93C5FD; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
            Book a Live 10-Minute Chamber Demo
          </div>
          <div style="font-size: 12pt; font-weight: 900; color: #FFFFFF; margin-top: 2px;">
            📞 +880 1700-000000 &bull; ✉️ contact@orisemr.com
          </div>
          <div style="font-size: 7.5pt; color: #CBD5E1; margin-top: 2px;">
            We can set up your clinic today with complimentary staff training and custom Rx branding.
          </div>
        </div>
        <div style="text-align: right;">
          <div style="background: #38BDF8; color: #0F172A; font-weight: 900; font-size: 8.5pt; padding: 7px 14px; border-radius: 20px;">
            www.orisemr.com
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>Oris EMR Platform &bull; Handover Guide</span>
      <span>Page 6 of 6 &bull; End of Brochure</span>
    </div>
  </div>

</body>
</html>`;

const publicDir = path.join(process.cwd(), "public");
const htmlPath = path.join(publicDir, "oris-doctor-brochure.html");
const pdfPathRoot = path.join(process.cwd(), "ORIS_EMR_Doctor_Clinic_Brochure.pdf");
const pdfPathPublic = path.join(publicDir, "ORIS_EMR_Doctor_Clinic_Brochure.pdf");

fs.writeFileSync(htmlPath, htmlContent, "utf8");
console.log("✅ Written Doctor Brochure HTML to:", htmlPath);

// Locate Chrome or Edge
const chromePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const browserPath = chromePaths.find((p) => fs.existsSync(p));

if (!browserPath) {
  console.error("Neither Chrome nor Edge found on standard paths.");
  process.exit(1);
}

console.log("Using browser for PDF generation:", browserPath);

try {
  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const tempUserDir = path.join(process.env.TEMP || "C:\\Windows\\Temp", "brochure-chrome-session");
  const cmd = `"${browserPath}" --headless --disable-gpu --user-data-dir="${tempUserDir}" --no-pdf-header-footer --print-to-pdf="${pdfPathRoot}" "${fileUrl}"`;
  console.log("Generating PDF via command:", cmd);
  execSync(cmd, { stdio: "inherit" });

  // Copy to public directory as well
  fs.copyFileSync(pdfPathRoot, pdfPathPublic);
  console.log("🎉 Successfully generated Doctor Brochure PDF at:", pdfPathRoot);
  console.log("🎉 Successfully copied Doctor Brochure PDF to:", pdfPathPublic);
} catch (err) {
  console.error("Failed to generate Doctor Brochure PDF:", err);
  process.exit(1);
}
