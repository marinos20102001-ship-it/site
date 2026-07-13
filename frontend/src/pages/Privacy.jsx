import React from "react";

import SEO from "@/components/SEO";

export default function Privacy() {
  return (
    <div data-testid="privacy-page" className="bg-white">
      <SEO
        title="Πολιτική Απορρήτου"
        description="Πολιτική απορρήτου του DM Accounting σύμφωνα με τον GDPR (ΕΕ 2016/679) και την ελληνική νομοθεσία (Ν. 4624/2019)."
        path="/privacy"
      />
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-20 md:py-28">
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-4">— Νομικά</div>
          <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            Πολιτική Απορρήτου
          </h1>
          <p className="mt-4 text-blue-100 text-sm">Τελευταία ενημέρωση: {new Date().toLocaleDateString("el-GR")}</p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="px-6 md:px-12 lg:px-20 max-w-[900px] mx-auto prose prose-slate">
          <Section title="1. Υπεύθυνος Επεξεργασίας">
            <p>
              <strong>Δελημιχάλης Μαρίνος Φώτιος</strong><br />
              ΑΦΜ: <strong>157279870</strong><br />
              Διεύθυνση: Πατέλες Μιλτιάδου 9<br />
              Email: <a href="mailto:marinosgr@yahoo.gr">marinosgr@yahoo.gr</a>
            </p>
            <p>
              Η παρούσα Πολιτική Απορρήτου περιγράφει τον τρόπο με τον οποίο συλλέγουμε,
              χρησιμοποιούμε και προστατεύουμε τα προσωπικά δεδομένα σας μέσω της ιστοσελίδας μας
              (εφεξής "Site"), σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR — ΕΕ 2016/679)
              και την ελληνική νομοθεσία (Ν. 4624/2019).
            </p>
          </Section>

          <Section title="2. Δεδομένα που Συλλέγουμε">
            <p>Συλλέγουμε τα ακόλουθα δεδομένα:</p>
            <ul>
              <li><strong>Στοιχεία επικοινωνίας</strong>: όνομα, email, τηλέφωνο, διεύθυνση εταιρείας, ΑΦΜ — όταν συμπληρώνετε αίτημα προσφοράς ή είστε πελάτης μας.</li>
              <li><strong>Στοιχεία λογαριασμού πελάτη</strong>: email, κωδικός πρόσβασης (κρυπτογραφημένος με bcrypt), στοιχεία επιχείρησης.</li>
              <li><strong>Οικονομικά δεδομένα</strong>: αρχεία ισοζυγίων, αποδείξεις, παραστατικά (xlsx, csv, pdf) που ανεβάζετε ή μας στέλνετε.</li>
              <li><strong>Τεχνικά δεδομένα</strong>: διεύθυνση IP κατά τη σύνδεση, ώρα/ημερομηνία πρόσβασης (αποθηκεύονται σε audit logs για λόγους ασφαλείας).</li>
              <li><strong>Cookies</strong>: ένα απολύτως απαραίτητο authentication cookie για να παραμένετε συνδεδεμένοι στο πελατειακό portal.</li>
            </ul>
          </Section>

          <Section title="3. Σκοπός Επεξεργασίας">
            <ul>
              <li>Παροχή λογιστικών και φοροτεχνικών υπηρεσιών (νομική υποχρέωση & εκπλήρωση σύμβασης).</li>
              <li>Λειτουργία του πελατειακού portal και πρόσβαση σε δεδομένα.</li>
              <li>Επικοινωνία σχετικά με αιτήματα προσφοράς και υπηρεσιών (έννομο συμφέρον).</li>
              <li>Αποστολή ενημερωτικών email όταν ενημερώνεται η εικόνα σας στο portal.</li>
              <li>Ασφάλεια συστήματος και πρόληψη απάτης (audit logs, brute-force protection).</li>
            </ul>
          </Section>

          <Section title="4. Νομική Βάση">
            <ul>
              <li><strong>Συναίνεση</strong> (άρθρο 6.1.α GDPR) — για αιτήματα προσφοράς και επικοινωνία.</li>
              <li><strong>Εκπλήρωση σύμβασης</strong> (άρθρο 6.1.β) — για παροχή λογιστικών υπηρεσιών.</li>
              <li><strong>Νομική υποχρέωση</strong> (άρθρο 6.1.γ) — για φορολογικές και ασφαλιστικές υποχρεώσεις (έως 10 έτη βάσει ΚΦΔ).</li>
              <li><strong>Έννομο συμφέρον</strong> (άρθρο 6.1.στ) — για ασφάλεια συστήματος και πρόληψη απάτης.</li>
            </ul>
          </Section>

          <Section title="5. Διατήρηση Δεδομένων">
            <ul>
              <li>Αιτήματα προσφοράς που δεν μετατράπηκαν σε πελάτες: <strong>12 μήνες</strong>.</li>
              <li>Οικονομικά δεδομένα πελατών: <strong>έως 10 έτη</strong> (νομική υποχρέωση Κώδικα Φορολογικής Διαδικασίας).</li>
              <li>Audit logs ασφαλείας: <strong>2 έτη</strong>.</li>
              <li>Login attempts: <strong>30 ημέρες</strong>.</li>
            </ul>
          </Section>

          <Section title="6. Παραλήπτες Δεδομένων">
            <p>Τα δεδομένα σας δεν διαβιβάζονται σε τρίτους εκτός από:</p>
            <ul>
              <li>Αρμόδιες δημόσιες αρχές (ΑΑΔΕ, ΕΦΚΑ, ΕΡΓΑΝΗ) — όπου απαιτείται από τον νόμο.</li>
              <li>Πάροχοι υποδομής cloud (hosting, βάση δεδομένων) εντός ΕΕ, με τις οποίες έχουμε υπογράψει συμβάσεις προστασίας δεδομένων.</li>
              <li>Πάροχος αποστολής email (Resend) — μόνο διεύθυνση email και περιεχόμενο μηνύματος.</li>
            </ul>
          </Section>

          <Section title="7. Τα Δικαιώματά σας">
            <p>Έχετε τα ακόλουθα δικαιώματα βάσει GDPR:</p>
            <ul>
              <li><strong>Πρόσβαση</strong> στα προσωπικά σας δεδομένα.</li>
              <li><strong>Διόρθωση</strong> ανακριβών ή ελλιπών δεδομένων.</li>
              <li><strong>Διαγραφή</strong> ("δικαίωμα στη λήθη"), εφόσον δεν υπάρχει νομική υποχρέωση διατήρησης.</li>
              <li><strong>Περιορισμός</strong> της επεξεργασίας.</li>
              <li><strong>Φορητότητα</strong> δεδομένων σε δομημένη μορφή.</li>
              <li><strong>Εναντίωση</strong> στην επεξεργασία.</li>
              <li><strong>Ανάκληση συναίνεσης</strong> ανά πάσα στιγμή.</li>
            </ul>
            <p>
              Για την άσκηση των δικαιωμάτων σας στείλτε email στο{" "}
              <a href="mailto:marinosgr@yahoo.gr">marinosgr@yahoo.gr</a>. Απαντάμε εντός 30 ημερών.
            </p>
          </Section>

          <Section title="8. Καταγγελία στην Αρχή">
            <p>
              Έχετε δικαίωμα υποβολής καταγγελίας στην <strong>Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα</strong>:
              <br />
              Λεωφ. Κηφισίας 1-3, Αθήνα · <a href="https://www.dpa.gr" target="_blank" rel="noreferrer">www.dpa.gr</a>
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>Χρησιμοποιούμε τα ακόλουθα cookies:</p>
            <table className="text-sm">
              <thead><tr><th align="left">Cookie</th><th align="left">Σκοπός</th><th align="left">Διάρκεια</th></tr></thead>
              <tbody>
                <tr><td><code>access_token</code></td><td>Authentication πελατειακού portal</td><td>8 ώρες</td></tr>
                <tr><td><code>refresh_token</code></td><td>Ανανέωση session</td><td>7 ημέρες</td></tr>
                <tr><td><code>dm_cookie_consent</code></td><td>Αποθήκευση επιλογής cookies</td><td>1 έτος (local storage)</td></tr>
                <tr><td><code>dm_theme</code></td><td>Προτίμηση Dark/Light mode</td><td>Μόνιμο (local storage)</td></tr>
              </tbody>
            </table>
            <p>Δεν χρησιμοποιούμε cookies παρακολούθησης ή διαφημίσεων.</p>
          </Section>

          <Section title="10. Ασφάλεια">
            <p>Λαμβάνουμε τα ακόλουθα τεχνικά μέτρα:</p>
            <ul>
              <li>HTTPS κρυπτογράφηση σε όλη την επικοινωνία.</li>
              <li>Κωδικοί κρυπτογραφημένοι με <strong>bcrypt</strong>.</li>
              <li>JWT tokens με httpOnly cookies (προστασία από XSS).</li>
              <li>Brute-force protection (lockout μετά από 5 αποτυχημένες προσπάθειες).</li>
              <li>Audit logs σε όλες τις διαχειριστικές ενέργειες.</li>
              <li>Απομόνωση δεδομένων ανά πελάτη.</li>
            </ul>
          </Section>

          <Section title="11. Τροποποιήσεις">
            <p>
              Διατηρούμε το δικαίωμα τροποποίησης της παρούσας Πολιτικής. Η τρέχουσα έκδοση
              αναρτάται πάντα στη συγκεκριμένη σελίδα με ημερομηνία τελευταίας ενημέρωσης.
            </p>
          </Section>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="font-serif-display text-2xl text-slate-900 mb-3 pb-2 border-b border-slate-200">{title}</h2>
      <div className="text-slate-700 text-[15px] leading-relaxed space-y-3 prose-section">{children}</div>
    </div>
  );
}
