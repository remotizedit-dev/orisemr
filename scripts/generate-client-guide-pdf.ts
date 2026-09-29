import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ORIS EMR - Dental Practice Management Platform | Client Product Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

    @page {
      size: A4;
      margin: 12mm 12mm 14mm 12mm;
      @bottom-right {
        content: "Page " counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #8E8E93;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1C1C1E;
      background: #FFFFFF;
      line-height: 1.45;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
    }

    .page {
      page-break-after: always;
      min-height: 96vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px 0;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Cover Page Styling */
    .cover-container {
      background: linear-gradient(145deg, #0F172A 0%, #1E293B 60%, #0F2347 100%);
      color: #FFFFFF;
      border-radius: 16px;
      padding: 44px 36px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(96, 165, 250, 0.15);
      color: #93C5FD;
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(96, 165, 250, 0.3);
      width: fit-content;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 900;
      line-height: 1.12;
      letter-spacing: -1px;
      margin: 22px 0 14px 0;
      color: #FFFFFF;
    }

    .cover-title span {
      background: linear-gradient(90deg, #60A5FA, #34D399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-subtitle {
      font-size: 13pt;
      color: #CBD5E1;
      line-height: 1.5;
      max-width: 600px;
      margin: 0 0 28px 0;
    }

    .value-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 18px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .value-box {
      text-align: left;
    }

    .value-box .stat {
      font-size: 16pt;
      font-weight: 900;
      color: #38BDF8;
      display: block;
      line-height: 1.1;
    }

    .value-box .stat-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94A3B8;
      margin-top: 4px;
      display: block;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 8.5pt;
      color: #94A3B8;
    }

    /* Headings & Section Styling */
    h2.section-header {
      font-size: 17pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0F172A;
      margin: 0 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h2.section-header span.tag {
      font-size: 8pt;
      font-weight: 700;
      background: #E8EEF7;
      color: #2A5CAA;
      padding: 3px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h3.sub-header {
      font-size: 11.5pt;
      font-weight: 800;
      margin: 14px 0 6px 0;
      color: #1E293B;
    }

    p {
      margin: 0 0 10px 0;
      color: #334155;
    }

    .lead-text {
      font-size: 10.5pt;
      font-weight: 500;
      color: #475569;
      line-height: 1.55;
      margin-bottom: 16px;
    }

    /* Cards & Grids */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .card-highlight {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 4px solid #2A5CAA;
    }

    .card-success {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #22C55E;
    }

    .card-danger {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-left: 4px solid #EF4444;
    }

    .card-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card-body {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.45;
    }

    /* Comparison Table */
    table.spec-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin: 12px 0;
    }

    table.spec-table th {
      background: #0F172A;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table.spec-table th:first-child {
      border-radius: 6px 0 0 0;
    }

    table.spec-table th:last-child {
      border-radius: 0 6px 0 0;
    }

    table.spec-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      color: #334155;
    }

    table.spec-table tr:nth-child(even) td {
      background: #F8FAFC;
    }

    table.spec-table tr.highlight td {
      background: #EFF6FF;
      font-weight: 600;
    }

    .badge-check {
      color: #16A34A;
      font-weight: 800;
    }

    .badge-cross {
      color: #DC2626;
      font-weight: 800;
    }

    /* ROI Highlights */
    .roi-strip {
      background: linear-gradient(90deg, #1E293B, #0F172A);
      color: #FFFFFF;
      border-radius: 12px;
      padding: 16px 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin: 14px 0;
    }

    .roi-item .num {
      font-size: 18pt;
      font-weight: 900;
      color: #34D399;
      line-height: 1;
    }

    .roi-item .desc {
      font-size: 7.5pt;
      color: #94A3B8;
      margin-top: 4px;
      line-height: 1.35;
    }

    /* Steps List */
    .step-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 10px 0;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #2A5CAA;
      color: #FFFFFF;
      font-size: 8pt;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      shrink: 0;
    }

    .step-content .step-title {
      font-size: 9pt;
      font-weight: 800;
      color: #0F172A;
    }

    .step-content .step-desc {
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- ========================================================================= -->
  <!-- PAGE 1: EXECUTIVE CLIENT COVER PAGE                                        -->
  <!-- ========================================================================= -->
  <div class="page">
    <div class="cover-container">
      <div>
        <div class="cover-badge">🇧🇩 Clinical Dental SaaS Platform &bull; Edition 2026-2027</div>
        <div class="cover-title">
          Elevate Your Dental Chamber to <span>Elite Standards.</span>
        </div>
        <div class="cover-subtitle">
          The all-in-one cloud operating system purpose-built for Bangladesh dental practices.
          Eliminate reception chaos, issue sub-60-second Bangla prescriptions, prevent chair double-bookings,
          and maximize whole-BDT revenue capture.
        </div>

        <div class="value-strip">
          <div class="value-box">
            <span class="stat">&lt; 60s</span>
            <span class="stat-label">Bangla Prescription</span>
          </div>
          <div class="value-box">
            <span class="stat">0</span>
            <span class="stat-label">Double-Bookings</span>
          </div>
          <div class="value-box">
            <span class="stat">0.2s</span>
            <span class="stat-label">Barcode Card Check-In</span>
          </div>
          <div class="value-box">
            <span class="stat">100%</span>
            <span class="stat-label">Whole-BDT Ledger</span>
          </div>
        </div>
      </div>

      <div>
        <div style="margin-bottom: 20px;">
          <div style="font-size: 9pt; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px;">
            Target Audience &amp; Applicability
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 8pt; color: #E2E8F0;">Private Dental Clinics</span>
            <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 8pt; color: #E2E8F0;">Multi-Doctor Dental Chains</span>
            <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 8pt; color: #E2E8F0;">Hospital Dentistry Units</span>
            <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 8pt; color: #E2E8F0;">Specialized Orthodontic Chambers</span>
          </div>
        </div>

        <div class="cover-footer">
          <div>
            <strong style="color: #FFFFFF;">ORIS EMR Software Suite</strong> &bull; Product Evaluation &amp; Buyer's Guide<br>
            Empowering dentists across Dhaka, Chittagong, Sylhet, and nationwide.
          </div>
          <div style="text-align: right;">
            <strong>Confidential Client Presentation</strong><br>
            www.orisemr.com
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 2: THE CLINIC PROBLEM & ORIS SOLUTION                                -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <h2 class="section-header">
        <span>The Problem with Traditional Practice</span>
        <span class="tag">Why Clinics Must Upgrade</span>
      </h2>

      <p class="lead-text">
        Most dental practices in Bangladesh operate on paper files, WhatsApp messages, or generic hospital software
        that wasn't built for dentistry. This results in daily friction, diagnostic blindspots, and lost revenue.
      </p>

      <div class="grid-2" style="margin-bottom: 16px;">
        <div class="card card-danger">
          <div class="card-title">❌ Problem 1: Handwritten Prescription Drag</div>
          <div class="card-body">
            Dentists spend 6 to 10 minutes per patient hand-writing repetitive drug doses. Handwriting is frequently
            misinterpreted by pharmacists, patient drug allergies are forgotten, and past visit notes are misplaced.
          </div>
        </div>

        <div class="card card-danger">
          <div class="card-title">❌ Problem 2: Overlapping &amp; Double Bookings</div>
          <div class="card-body">
            Front-desk assistants juggle phone calls, paper diaries, and walk-ins. Two patients end up booked for the
            same chair at 6:00 PM, causing angry waiting room arguments and dentist burnout.
          </div>
        </div>

        <div class="card card-danger">
          <div class="card-title">❌ Problem 3: Lost Radiographs &amp; Clinical History</div>
          <div class="card-body">
            Periapical X-rays and OPG films get buried in paper folders or forgotten on personal mobile phones.
            When a patient returns months later, the doctor has no immediate visual record of the root canal progress.
          </div>
        </div>

        <div class="card card-danger">
          <div class="card-title">❌ Problem 4: Financial Leakage &amp; Mixed bKash Cash</div>
          <div class="card-body">
            Split payments (partial cash, partial bKash/Nagad) lead to daily accounting headaches. Without an automated
            ledger, discounts, unpaid balances, and procedure fees slip through the cracks unnoticed.
          </div>
        </div>
      </div>

      <h3 class="sub-header">The ORIS EMR Transformation</h3>
      <p style="margin-bottom: 12px;">
        ORIS EMR was engineered from day one around the clinical reality of a fast-paced dental chamber:
      </p>

      <div class="grid-3">
        <div class="card card-success">
          <div class="card-title">⚡ 4x Faster Patient Turnaround</div>
          <div class="card-body">
            With 1-click Bangla dosages (১+০+১) and visual 2-digit FDI tooth charting, consultations finish in record time without compromising care.
          </div>
        </div>

        <div class="card card-success">
          <div class="card-title">🛡️ Absolute Schedule Certainty</div>
          <div class="card-body">
            Split operational shifts (e.g. 10 AM–2 PM &amp; 5 PM–9 PM) and automated buffer spacing guarantee zero double bookings.
          </div>
        </div>

        <div class="card card-success">
          <div class="card-title">📈 Unyielding Financial Clarity</div>
          <div class="card-body">
            Every procedure performed by the doctor instantly populates the billing invoice. Zero fractional paisa errors and instant receipt printing.
          </div>
        </div>
      </div>

      <div class="roi-strip">
        <div class="roi-item">
          <div class="num">2.5 hrs</div>
          <div class="desc">Doctor documentation time saved every single working day</div>
        </div>
        <div class="roi-item">
          <div class="num">0%</div>
          <div class="desc">Double-booking rate with PostgreSQL GIST scheduling locks</div>
        </div>
        <div class="roi-item">
          <div class="num">+35%</div>
          <div class="desc">Increase in on-time patient appointments and chair efficiency</div>
        </div>
        <div class="roi-item">
          <div class="num">100%</div>
          <div class="desc">Audit-proof billing and multi-channel bKash/Cash reconciliation</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 3: CORE CLINICAL FEATURES                                            -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <h2 class="section-header">
        <span>Clinical Excellence by Design</span>
        <span class="tag">6 Core Innovations</span>
      </h2>

      <p class="lead-text">
        Every button, dropdown, and interaction in ORIS EMR has been tuned for speed and precision.
      </p>

      <div class="grid-2">
        <div class="card card-highlight">
          <div class="card-title">🦷 1. Interactive 2-Digit FDI Tooth Chart</div>
          <div class="card-body">
            Full support for Adult (32 teeth: 11-48) and Pediatric (20 deciduous teeth: 51-85). One-click assignment of
            15+ clinical dental conditions: Caries, Pulpitis, Missing, Crown, Root Stump, Impacted, and Fracture.
            Generates visual dental status directly on the official printed prescription.
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">🇧🇩 2. Sub-60s Bangla Prescriptions</div>
          <div class="card-body">
            No typing required. Select medicines with intelligent auto-complete and apply 1-click Bangla instructions:
            <strong>১+০+১ (ভরা পেটে)</strong>, <strong>০+১+০ (খাবারের আগে)</strong>, with duration (৫ দিন, ৭ দিন).
            Patients understand their medications clearly, drastically improving treatment compliance.
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">🔒 3. Doctor-Only Private Clinical Notes</div>
          <div class="card-body">
            Dentists need to record confidential clinical observations (e.g. prognosis doubts, suspected pulp exposures,
            patient compliance history). ORIS EMR separates confidential doctor notes so they <strong>NEVER print on the patient prescription</strong>.
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">💳 4. Barcode Smart Cards (CR80 Standard)</div>
          <div class="card-body">
            Elevate your chamber brand by issuing personalized plastic identity cards. Front-desk staff scan the 1D
            barcode with any inexpensive USB handheld scanner to open the patient's entire medical record in 0.2 seconds.
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">📅 5. Smart Anti-Collision Slot Engine</div>
          <div class="card-body">
            Configurable operational shifts (e.g., 10:00 AM–2:00 PM and 5:00 PM–9:00 PM). Automatically prunes expired
            time slots, enforces procedure durations (e.g., 30m Biopsy), respects chair buffer intervals, and blocks double-booking.
          </div>
        </div>

        <div class="card card-highlight">
          <div class="card-title">📺 6. Live Queue &amp; TV Waiting Lounge Display</div>
          <div class="card-body">
            Transform clinic waiting rooms. Hook up any smart TV or tablet to display live token callouts (Token #A-104 &bull; Chair 1).
            Eliminates shouting in the reception area, calms anxious patients, and gives your clinic a modern hospital aesthetic.
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 14px; background: #F8FAFC; border: 1px solid #CBD5E1;">
        <div class="card-title" style="color: #2A5CAA;">🛡️ Active Clinical Allergy Safety Guardrail</div>
        <div class="card-body">
          If a doctor selects Amoxicillin or Augmentin for a patient with a recorded Penicillin allergy, ORIS EMR
          triggers an instant high-visibility alert with mandatory clinical override reasons and audit logging.
          Protects your clinic from catastrophic medical liability.
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 4: FINANCIAL & OPERATIONAL EXCELLENCE                                -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <h2 class="section-header">
        <span>Financial &amp; Operational Mastery</span>
        <span class="tag">Zero Revenue Leakage</span>
      </h2>

      <p class="lead-text">
        Dental procedures are high-ticket and multi-step. ORIS EMR ensures every root canal, crown, implant, and scaling
        is accurately tracked, invoiced, and collected.
      </p>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">💰 Whole-BDT Financial Ledger</div>
          <div class="card-body">
            Generic software often imports Western decimal logic that creates rounding errors. ORIS EMR operates
            on a strict whole-Bangladeshi-Taka (BDT) ledger. Zero fractional paisa errors, clean rounding, and exact cash balances.
          </div>
        </div>

        <div class="card">
          <div class="card-title">📱 Multi-Channel Split Settlement</div>
          <div class="card-body">
            Patients frequently split bills: e.g., ৳3,000 via bKash and ৳2,000 in cash. Front-desk staff record
            exact payment methods with bKash/Nagad Transaction IDs (TrxID) for seamless end-of-day bank reconciliation.
          </div>
        </div>

        <div class="card">
          <div class="card-title">🖨️ Professional Printed Receipts &amp; Pad</div>
          <div class="card-body">
            Instant 1-click printing on A4, A5, or pre-printed clinic letterheads. Automatically embeds your clinic logo,
            doctor BMDC registration numbers, barcodes, itemized procedural costs, and paid/due balances.
          </div>
        </div>

        <div class="card">
          <div class="card-title">🌐 Branded Public Booking Portal</div>
          <div class="card-body">
            Every clinic receives a dedicated online booking page: <code>orisemr.com/book/{clinic-slug}</code>.
            Patients view real-time open slots, book from their smartphones, and receive automated appointment confirmation emails.
          </div>
        </div>
      </div>

      <h3 class="sub-header" style="margin-top: 18px;">How ORIS EMR Compares to Alternatives</h3>

      <table class="spec-table">
        <thead>
          <tr>
            <th>Feature / Capability</th>
            <th>Paper Files &amp; Pads</th>
            <th>Generic Hospital EMR</th>
            <th>ORIS EMR Dental Cloud</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Dental 2-Digit FDI Tooth Chart</strong></td>
            <td><span class="badge-cross">❌ None</span></td>
            <td><span class="badge-cross">❌ Generic body chart</span></td>
            <td class="highlight"><span class="badge-check">✅ Adult &amp; Pediatric FDI</span></td>
          </tr>
          <tr>
            <td><strong>Native Bangla Dosage (১+০+১)</strong></td>
            <td><span class="badge-cross">❌ Hand-written</span></td>
            <td><span class="badge-cross">❌ English text only</span></td>
            <td class="highlight"><span class="badge-check">✅ 1-Click Bangla Presets</span></td>
          </tr>
          <tr>
            <td><strong>Split Shift Scheduling (10-2 &amp; 5-9)</strong></td>
            <td><span class="badge-cross">❌ Manual memory</span></td>
            <td><span class="badge-cross">❌ Single block only</span></td>
            <td class="highlight"><span class="badge-check">✅ Automated Anti-Collision</span></td>
          </tr>
          <tr>
            <td><strong>Hardware Barcode Smart Cards</strong></td>
            <td><span class="badge-cross">❌ Paper slips</span></td>
            <td><span class="badge-cross">❌ Costly hardware setup</span></td>
            <td class="highlight"><span class="badge-check">✅ 0.2s Plug-and-Play CR80</span></td>
          </tr>
          <tr>
            <td><strong>Doctor Private Clinical Notes</strong></td>
            <td><span class="badge-cross">❌ Visible to patient</span></td>
            <td><span class="badge-cross">❌ No print separation</span></td>
            <td class="highlight"><span class="badge-check">✅ Strictly Hidden on Print</span></td>
          </tr>
          <tr>
            <td><strong>bKash / Cash Split Settlement</strong></td>
            <td><span class="badge-cross">❌ Manual cash book</span></td>
            <td><span class="badge-cross">❌ Complex USD/EUR math</span></td>
            <td class="highlight"><span class="badge-check">✅ Native Whole-BDT + TrxID</span></td>
          </tr>
          <tr>
            <td><strong>Waiting Lounge TV Display Mode</strong></td>
            <td><span class="badge-cross">❌ Calling patient names</span></td>
            <td><span class="badge-cross">❌ Expensive add-on</span></td>
            <td class="highlight"><span class="badge-check">✅ Built-in Web TV Mode</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- PAGE 5: ONBOARDING, SECURITY & NEXT STEPS                                 -->
  <!-- ========================================================================= -->
  <div class="page">
    <div>
      <h2 class="section-header">
        <span>Zero-Friction Adoption</span>
        <span class="tag">Implementation Roadmap</span>
      </h2>

      <p class="lead-text">
        Transitioning your chamber to ORIS EMR requires zero downtime, zero local servers, and takes less than 48 hours.
      </p>

      <div class="step-list">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Day 1: Instant Chamber Activation &amp; Brand Setup</div>
            <div class="step-desc">
              We configure your clinic profile, upload your official logo, set dental chair counts, define doctor
              schedules (split shifts), and import your standard procedure price catalog.
            </div>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Day 2: 30-Minute Front-Desk &amp; Staff Training</div>
            <div class="step-desc">
              Your reception team learns how to scan patient smart cards, manage the live queue, schedule appointments,
              and process bKash/Cash payments. Dentists review the 60-second prescription builder.
            </div>
          </div>
        </div>

        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Day 3: Live Chamber Launch with On-Demand Support</div>
            <div class="step-desc">
              Start welcoming patients with custom branded smart cards, live TV lounge displays, and instant printed
              prescriptions. Our onboarding team provides real-time support throughout your first clinic week.
            </div>
          </div>
        </div>
      </div>

      <h3 class="sub-header" style="margin-top: 18px;">Enterprise Security &amp; Data Isolation</h3>
      <div class="grid-3" style="margin-bottom: 20px;">
        <div class="card">
          <div class="card-title">🔐 Multi-Tenant Isolation</div>
          <div class="card-body">
            Every clinic's patient records, billing ledgers, and clinical notes are cryptographically and logically isolated.
            No clinic can ever access another practice's data.
          </div>
        </div>

        <div class="card">
          <div class="card-title">☁️ AWS Encrypted Storage</div>
          <div class="card-body">
            Patient X-rays, intraoral photos, and clinic logos are securely uploaded to AWS S3 with CloudFront CDN
            acceleration for blazing fast image load times.
          </div>
        </div>

        <div class="card">
          <div class="card-title">⚡ 99.9% Cloud Availability</div>
          <div class="card-body">
            Access your chamber records anytime from clinic desktops, laptops at home, or your smartphone. Automatic
            nightly backups ensure zero data loss.
          </div>
        </div>
      </div>

      <div class="card card-highlight" style="padding: 20px; background: #0F172A; color: #FFFFFF; border: none; border-radius: 14px;">
        <div style="font-size: 14pt; font-weight: 900; margin-bottom: 6px; color: #38BDF8;">
          Ready to Modernize Your Dental Practice?
        </div>
        <p style="color: #CBD5E1; font-size: 9pt; margin-bottom: 16px;">
          Book an exclusive 1-on-1 live software walkthrough with our dental practice solutions team.
          See firsthand how ORIS EMR can save hours of daily documentation and elevate your clinic's patient experience.
        </p>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 14px;">
          <div>
            <div style="font-size: 8pt; color: #94A3B8; text-transform: uppercase; font-weight: 700;">Direct Inquiries &amp; Live Demos</div>
            <div style="font-size: 11pt; font-weight: 800; color: #FFFFFF; margin-top: 2px;">
              📞 +880 1700-000000 &bull; ✉️ contact@orisemr.com
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 8pt; color: #94A3B8; text-transform: uppercase; font-weight: 700;">Official Portal</div>
            <div style="font-size: 10pt; font-weight: 800; color: #34D399; margin-top: 2px;">
              www.orisemr.com
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;

const publicDir = path.join(process.cwd(), "public");
const htmlPath = path.join(publicDir, "oris-client-guide.html");
const pdfPathRoot = path.join(process.cwd(), "ORIS_EMR_Client_Product_Guide.pdf");
const pdfPathPublic = path.join(publicDir, "ORIS_EMR_Client_Product_Guide.pdf");

fs.writeFileSync(htmlPath, htmlContent, "utf8");
console.log("Written Client HTML to:", htmlPath);

// Locate Chrome or Edge
const chromePaths = [
  "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
  "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
  "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
  "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
];

const browserPath = chromePaths.find((p) => fs.existsSync(p));

if (!browserPath) {
  console.error("Neither Chrome nor Edge found on standard paths.");
  process.exit(1);
}

console.log("Using browser for PDF generation:", browserPath);

try {
  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const cmd = `"${browserPath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPathRoot}" "${fileUrl}"`;
  console.log("Running command:", cmd);
  execSync(cmd, { stdio: "inherit" });

  // Copy to public directory as well
  fs.copyFileSync(pdfPathRoot, pdfPathPublic);
  console.log("Successfully generated Client Guide PDF at:", pdfPathRoot);
  console.log("Successfully copied Client Guide PDF to:", pdfPathPublic);
} catch (err) {
  console.error("Failed to generate Client Guide PDF:", err);
  process.exit(1);
}
