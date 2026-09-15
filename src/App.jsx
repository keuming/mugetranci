import React, { useState, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Car, User, Users, Bell, Plus, X, Check, AlertTriangle, CreditCard,
  Camera, Printer, Search, Home, FileText, Phone, Mail, MapPin,
  BadgeCheck, Calendar, ChevronRight, ChevronLeft, RotateCw, Trash2, Building2, QrCode, Fuel, Pencil, LogOut, Settings, Route, Menu
} from "lucide-react";

/* ============================================================
   TOKENS — Ivorian palette, reinterpreted for a civic/admin tool
   ============================================================ */
const C = {
  green: "#0B6E4F",
  greenDark: "#07422F",
  greenLight: "#E4F1EC",
  orange: "#E07A1F",
  orangeDark: "#B35F14",
  orangeLight: "#FBEADA",
  cream: "#FAF8F3",
  paper: "#FFFFFF",
  ink: "#20241F",
  slate: "#69726B",
  border: "#E4E0D6",
  red: "#B93B2E",
  redLight: "#F8E7E4",
  amber: "#A9740B",
  amberLight: "#FBF0D8",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.font-display { font-family: 'Fraunces', serif; }
.font-body { font-family: 'IBM Plex Sans', sans-serif; }
.font-mono { font-family: 'IBM Plex Mono', monospace; }

.print-card-duo { display: none; }

/* ---------- Mise en page adaptative (PWA mobile) ---------- */
.comix-main { padding: 32px; }
.comix-page-title { font-size: 24px; }
.comix-drawer { transition: transform 0.22s ease; }

.comix-modal-overlay { padding: 24px; }

/* Rien ne doit deborder lateralement : la page ne doit defiler que
   verticalement. */
html, body { overflow-x: hidden; max-width: 100%; }
#root { overflow-x: hidden; }

/* ---------- Tenue sur iPhone ----------
   Sans ces regles la fenetre "flotte" : rebond elastique en fin de
   defilement, zoom au double-tap, et surtout agrandissement automatique
   a chaque focus sur un champ. */
html, body {
  overscroll-behavior: none;          /* supprime le rebond elastique */
  -webkit-text-size-adjust: 100%;     /* pas de reajustement auto du texte */
  text-size-adjust: 100%;
}
body { touch-action: manipulation; }  /* supprime le zoom au double-tap */

/* Tout champ saisissable reste a 16px : en dessous, iOS zoome. */
input, select, textarea { font-size: 16px !important; }

/* Respect de l'encoche et de la barre gestuelle */
.comix-safe-top { padding-top: env(safe-area-inset-top); }
.comix-safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

@media (max-width: 1023px) {
  /* La barre latérale devient un tiroir qui glisse par-dessus le contenu */
  .comix-drawer {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    box-shadow: 0 0 40px rgba(0,0,0,0.35);
  }
  .comix-drawer-open { transform: translateX(0); }

  .comix-main { padding: 16px; max-width: 100% !important; }
  .comix-page-title { font-size: 19px; }

  /* Grilles de cartes : une seule colonne sur téléphone.
     .comix-grid-2 en est exclue : certains groupes de boutons courts
     restent plus lisibles sur deux colonnes que empiles. */
  .grid.grid-cols-3, .grid.grid-cols-2 { grid-template-columns: 1fr !important; }
  .comix-grid-2 { grid-template-columns: 1fr 1fr !important; }

  /* Rangées de statistiques : passent à la ligne au lieu de déborder */
  .comix-stats-row { flex-wrap: wrap; }
  .comix-stats-row > * { flex: 1 1 calc(50% - 8px); min-width: calc(50% - 8px); }

  /* Les formulaires en 2 colonnes passent en 1 colonne */
  .comix-modal .grid { grid-template-columns: 1fr !important; }

  /* Tableaux larges : défilement horizontal plutôt que débordement */
  table { display: block; overflow-x: auto; white-space: nowrap; }
}

@media (max-width: 640px) {
  .comix-main { padding: 12px; }
  .comix-modal-overlay { padding: 10px; }
}
.print-card-sheet { display: none; }

@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .fiche-modal-scroll, .modal-box { overflow: visible !important; max-height: none !important; }
  .print-area {
    position: absolute; top: 0; left: 0; width: 100%;
    margin: 0; padding: 0; box-shadow: none; border: none;
    max-height: none !important; overflow: visible !important;
  }
  .print-card-duo { display: flex !important; }
  .print-card-sheet { display: block !important; }
  .card-sheet-page { break-after: page; page-break-after: always; }
  .card-sheet-page:last-child { break-after: auto; page-break-after: auto; }
  .no-print { display: none !important; }
  @page { margin: 8mm; }
}
`;

const TODAY = new Date("2026-07-27");
const TRANSPORT_CATEGORIES = ["VTC", "Minibus", "Taxi brousse", "Taxi compteur"];
// Communes d'Abidjan + principales villes de Côte d'Ivoire — liste par
// défaut proposée à la création d'un collectif (syndicat).
const COMMUNES = [
  "ABOBO", "ADJAMÉ", "ATTÉCOUBÉ", "COCODY", "KOUMASSI", "MARCORY", "PLATEAU", "PORT-BOUËT", "TREICHVILLE", "YOPOUGON",
  "YAMOUSSOUKRO", "BOUAKÉ", "KORHOGO", "FERKESSÉDOUGOU", "DALOA", "MAN", "GUIGLO", "DUÉKOUÉ", "ISSIA", "GAGNOA",
  "SAN-PÉDRO", "DIVO", "DABOU", "AGBOVILLE", "GRAND-BASSAM", "BONOUA", "ABOISSO", "ABENGOUROU", "BONDOUKOU", "KATIOLA", "GRAND-LAHOU",
];
const SYNDICAT_TYPES = [
  { value: "transporteurs", label: "Collectif des syndicats des transporteurs" },
  { value: "chauffeurs", label: "Collectif des syndicats des chauffeurs" },
];

/* ============================================================
   HELPERS
   ============================================================ */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.round((d - TODAY) / (1000 * 60 * 60 * 24));
}
function statusOf(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { key: "inconnu", label: "Non renseigné", color: C.slate, bg: "#F1F0EC" };
  if (days < 0) return { key: "expire", label: `Expiré depuis ${Math.abs(days)} j`, color: C.red, bg: C.redLight };
  if (days <= 30) return { key: "alerte", label: `Expire dans ${days} j`, color: C.amber, bg: C.amberLight };
  return { key: "valide", label: `Valide (${days} j)`, color: C.green, bg: C.greenLight };
}
function fmt(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8);
}
function initials(nom, prenoms) {
  return `${(prenoms || "?")[0] || ""}${(nom || "?")[0] || ""}`.toUpperCase();
}
function ficheUrl(vehicleId) {
  return `${window.location.origin}${window.location.pathname}?vehicule=${vehicleId}`;
}
function transporteurFicheUrl(ownerId) {
  return `${window.location.origin}${window.location.pathname}?transporteur=${ownerId}`;
}
// Résout l'entité (commission mixte, syndicat ou gare routière) qui a créé
// un transporteur donné — utilisé pour personnaliser l'entête de la fiche
// et de la carte transporteur.
function getCreatorEntity(owner, commissionsMixtes, syndicats, garesRoutieres) {
  if (!owner) return null;
  if (owner.creatorType === "commission_mixte") return commissionsMixtes.find((c) => c.id === owner.creatorId) || null;
  if (owner.creatorType === "syndicat") return syndicats.find((s) => s.id === owner.creatorId) || null;
  if (owner.creatorType === "gare") return garesRoutieres.find((g) => g.id === owner.creatorId) || null;
  return null;
}
// Résout à la fois le syndicat et sa commission mixte parente pour un
// transporteur — la carte de membre affiche les deux logos ensemble.
function getMemberHierarchy(owner, commissionsMixtes, syndicats) {
  if (!owner) return { syndicat: null, commission: null };
  const syndicat = owner.syndicatId ? syndicats.find((s) => s.id === owner.syndicatId) || null : null;
  const commission = syndicat
    ? commissionsMixtes.find((c) => c.id === syndicat.commissionMixteId) || null
    : (owner.creatorType === "commission_mixte" ? commissionsMixtes.find((c) => c.id === owner.creatorId) || null : null);
  return { syndicat, commission };
}

/* Les QR codes de la fiche véhicule et de la carte de membre sont désormais
   générés avec la librairie `qrcode.react` (voir cardUrl/ficheUrl ci-dessus). */

/* Les données de démonstration sont désormais insérées directement en base
   via `npm run db:seed` (voir db/seed.js) plutôt que codées en dur ici. */

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function Badge({ status, small }) {
  if (small) {
    return (
      <span
        className="font-body inline-flex items-center gap-1 rounded-full font-semibold"
        style={{ color: status.color, background: status.bg, padding: "1.5px 6px", fontSize: 7.5, whiteSpace: "nowrap" }}
      >
        <span style={{ width: 4, height: 4, borderRadius: 999, background: status.color, flexShrink: 0 }} />
        {status.label}
      </span>
    );
  }
  return (
    <span
      className="font-body inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: status.color, background: status.bg }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: status.color }} />
      {status.label}
    </span>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="font-body flex flex-col gap-1.5">
      <span className="text-xs tracking-wide" style={{ color: C.ink, fontWeight: 800 }}>{label}</span>
      {children}
      {hint && <span className="text-[11px]" style={{ color: C.slate }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  padding: "10px 11px",
  // 16px minimum : en dessous, iOS zoome automatiquement a la prise de
  // focus et fait sauter toute la mise en page.
  fontSize: 16,
  fontWeight: 600,
  background: "#fff",
  color: C.ink,
  outline: "none",
  width: "100%",
};
// Un champ desactive doit se voir : sans cela l'utilisateur tape dessus
// et croit l'interface bloquee.
const inputDisabledStyle = {
  ...inputStyle,
  background: "#EFEDE6",
  borderStyle: "dashed",
  color: C.slate,
  fontWeight: 500,
  cursor: "not-allowed",
};

function TextInput(props) {
  return <input {...props} className="font-body" style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function DateInput(props) {
  return <input type="date" {...props} className="font-mono" style={{ ...inputStyle, ...(props.style || {}) }} />;
}

/* Lit un fichier image et le redimensionne/compresse avant de le convertir
   en data URL : une photo prise au telephone pese souvent plusieurs Mo, ce
   qui saturerait la base et le reseau. Cote 1200 px max, JPEG qualite 0.82.
   Les QR codes gardent une compression plus douce pour rester lisibles. */
function readImageFile(file, { maxSide = 1200, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => resolve(ev.target.result); // repli : on garde l'original
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 400 * 1024) return resolve(ev.target.result);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch { resolve(ev.target.result); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function PhotoUpload({ value, onChange, label, shape = "circle" }) {
  const ref = useRef(null);       // galerie / fichiers
  const camRef = useRef(null);    // appareil photo
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // permet de reprendre la meme photo deux fois de suite
    if (!f) return;
    onChange(await readImageFile(f));
  };
  const radius = shape === "circle" ? "9999px" : "10px";
  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => ref.current?.click()}
        style={{
          width: 64, height: 64, borderRadius: radius, cursor: "pointer",
          border: `1.5px dashed ${C.border}`, display: "flex", alignItems: "center",
          justifyContent: "center", overflow: "hidden", background: C.cream, flexShrink: 0,
        }}
        title="Ajouter une photo"
      >
        {value ? (
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Camera size={20} color={C.slate} />
        )}
      </div>
      <div className="flex flex-col gap-1.5" style={{ minWidth: 0 }}>
        <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>{label}</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="font-body text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ background: C.greenLight, color: C.greenDark }}
          >
            <Camera size={13} /> Appareil photo
          </button>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="font-body text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
            style={{ background: C.orangeLight, color: C.orangeDark }}
          >
            <FileText size={13} /> Galerie
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="font-body text-xs font-semibold px-2 py-1.5" style={{ color: C.red }}>
              Retirer
            </button>
          )}
        </div>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </div>
  );
}

/* Bouton compact déclenchant un import de fichier immédiat (upload direct,
   pas de formulaire). Utilisé pour le QR de paiement d'un chauffeur existant. */
function FileUploadButton({ label, icon, onUpload, style }) {
  const ref = useRef(null);
  const camRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setMenu(false);
    if (!f) return;
    setBusy(true);
    try {
      // Qualite preservee : un QR trop compresse devient illisible.
      await onUpload(await readImageFile(f, { maxSide: 1400, quality: 0.92 }));
    } catch (err) {
      alert(err.message || "Échec de l'envoi du fichier.");
    } finally { setBusy(false); }
  };
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setMenu((m) => !m)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={style}>
        {icon} {busy ? "Envoi…" : label}
      </button>
      {menu && (
        <span style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 20px rgba(0,0,0,0.12)", zIndex: 40, display: "flex", flexDirection: "column", minWidth: 150 }}>
          <button type="button" onClick={() => camRef.current?.click()} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-2" style={{ color: C.greenDark }}>
            <Camera size={13} /> Appareil photo
          </button>
          <button type="button" onClick={() => ref.current?.click()} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-2" style={{ color: C.orangeDark, borderTop: `1px solid ${C.border}` }}>
            <FileText size={13} /> Galerie
          </button>
        </span>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </span>
  );
}

/* Avatar circulaire cliquable : clic → sélection d'image → upload immédiat
   via onUpload(dataUrl). Utilisé pour ajouter/changer la photo d'une
   personne déjà créée (ex. chauffeur) directement depuis sa fiche/liste. */
function AvatarUpload({ photo, nom, prenoms, size = 48, onUpload, shape = "circle", fallbackIcon = null }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    setUploading(true);
    readImageFile(f)
      .then((dataUrl) => onUpload(dataUrl))
      .catch((err) => alert(err.message || "Échec de l'envoi de la photo. Vérifiez la connexion à la base."))
      .finally(() => setUploading(false));
  };
  return (
    <div
      onClick={(e) => { e.stopPropagation(); ref.current?.click(); }}
      title="Cliquer pour ajouter/changer la photo"
      style={{
        width: size, height: size, borderRadius: shape === "circle" ? 999 : 8, overflow: "hidden", background: C.cream,
        border: `1px solid ${C.border}`, flexShrink: 0, position: "relative", cursor: "pointer",
      }}
    >
      {photo ? (
        <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : fallbackIcon ? (
        <div className="w-full h-full flex items-center justify-center">{fallbackIcon}</div>
      ) : (
        <div className="w-full h-full flex items-center justify-center font-semibold text-sm" style={{ color: C.slate }}>{initials(nom, prenoms)}</div>
      )}
      <div
        className="flex items-center justify-center"
        style={{ position: "absolute", inset: 0, background: "rgba(20,24,20,0.45)", opacity: uploading ? 1 : 0, transition: "opacity .15s" }}
      >
        <Camera size={16} color="#fff" />
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </div>
  );
}

function SectionCard({ accent, title, icon, children, right }) {
  return (
    <div style={{ background: C.paper, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1.5px solid ${C.border}`, borderLeft: `6px solid ${accent}`, background: accent + "0D" }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ width: 30, height: 30, borderRadius: 9, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
          <h3 className="font-display" style={{ fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>{title}</h3>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TricolorRule() {
  return (
    <div className="flex" style={{ height: 4, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ flex: 1, background: C.green }} />
      <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.border}` }} />
      <div style={{ flex: 1, background: C.orange }} />
    </div>
  );
}

/* ============================================================
   ADD / EDIT VEHICLE FORM
   ============================================================ */
const STEPS = [
  { key: "vehicule", label: "Véhicule", icon: <Car size={15} /> },
  { key: "documents", label: "Documents", icon: <FileText size={15} /> },
  { key: "proprietaire", label: "Propriétaire", icon: <User size={15} /> },
  { key: "chauffeurs", label: "Chauffeur(s)", icon: <Users size={15} /> },
  { key: "affectation", label: "Affectation", icon: <MapPin size={15} /> },
];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center mb-6">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 30, height: 30, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: i < step ? C.green : i === step ? C.orange : "#fff",
                color: i <= step ? "#fff" : C.slate,
                border: i === step ? `2px solid ${C.orange}` : `1px solid ${C.border}`,
              }}
            >
              {i < step ? <Check size={14} /> : s.icon}
            </div>
            <span className="font-body text-xs font-semibold hidden sm:inline" style={{ color: i === step ? C.ink : C.slate }}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? C.green : C.border, margin: "0 10px" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function VehicleForm({ auth, owners, drivers, syndicats, associations, garesRoutieres, commissionsMixtes, lignes, onCancel, onSave, addOwner, addDriver, affecterVehicule }) {
  const [step, setStep] = useState(0);
  const isAdmin = auth?.role === "admin";
  const [syndicatIdSel, setSyndicatIdSel] = useState(isAdmin ? "" : (auth?.syndicatId || ""));

  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [categorie, setCategorie] = useState("");
  const [nombrePlaces, setNombrePlaces] = useState("");
  const [commune, setCommune] = useState("");
  const [commissionMixteId, setCommissionMixteId] = useState("");
  const [chassis, setChassis] = useState("");
  const [carteGrise, setCarteGrise] = useState("");
  const [nomCarteGrise, setNomCarteGrise] = useState("");
  const [immatriculation, setImmatriculation] = useState("");
  const [dateMiseCirculation, setDateMiseCirculation] = useState("");
  const [photo, setPhoto] = useState(null);
  const [docs, setDocs] = useState({ visiteTechnique: "", assuranceAuto: "", vignette: "", carteStationnement: "" });

  const [ownerMode, setOwnerMode] = useState(owners.length ? "existing" : "new"); // existing | new
  const [ownerId, setOwnerId] = useState(owners[0]?.id || "");
  const [newOwner, setNewOwner] = useState({ nom: "", prenoms: "", cni: "", numeroPermis: "", contact1: "", contact2: "", contact3: "", email: "", ville: "", quartier: "", photo: null, qrPaiement: null, logo1Type: "", logo1Id: "", logo2Type: "", logo2Id: "" });

  const [driverRows, setDriverRows] = useState([{ mode: drivers.length ? "existing" : "new", id: drivers[0]?.id || "", draft: { nom: "", prenoms: "", cni: "", permisNumero: "", permisDateFin: "", contact1: "", contact2: "", contact3: "", email: "", photo: null, qrPaiement: null, logo1Type: "", logo1Id: "", logo2Type: "", logo2Id: "" } }]);

  const addDriverRow = () => setDriverRows((r) => r.length >= 3 ? r : [...r, { mode: "existing", id: drivers[0]?.id || "", draft: { nom: "", prenoms: "", cni: "", permisNumero: "", permisDateFin: "", contact1: "", contact2: "", contact3: "", email: "", photo: null, qrPaiement: null, logo1Type: "", logo1Id: "", logo2Type: "", logo2Id: "" } }]);
  const removeDriverRow = (i) => setDriverRows((r) => r.filter((_, idx) => idx !== i));
  const updateDriverRow = (i, patch) => setDriverRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const updateDriverDraft = (i, patch) => setDriverRows((r) => r.map((row, idx) => (idx === i ? { ...row, draft: { ...row.draft, ...patch } } : row)));

  // Affectation (étape 5, optionnelle)
  const isSyndicatAccount = auth?.role === "syndicat";
  const communes = [...new Set(commissionsMixtes.map((c) => c.commune))].sort();
  const [communeSel, setCommuneSel] = useState("");
  const [commissionId, setCommissionId] = useState(isSyndicatAccount ? auth.commissionMixteId : "");
  const [ligneId, setLigneId] = useState("");
  const [gareRoutiereId, setGareRoutiereId] = useState("");
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().slice(0, 10));
  const gareOwnerSyndicatId = isSyndicatAccount ? auth.syndicatId : syndicatIdSel;
  const garesDeMonSyndicat = garesRoutieres.filter((g) => g.syndicatId === gareOwnerSyndicatId);
  const lignesDeLaGareChoisie = lignes.filter((l) => l.gareRoutiereId === gareRoutiereId);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const stepValid = [
    !!(carteGrise && immatriculation) && (!isAdmin || !!syndicatIdSel),
    true, // documents are optional at creation time
    ownerMode === "none" ? true : ownerMode === "existing" ? !!ownerId : !!(newOwner.nom && newOwner.prenoms && newOwner.cni),
    driverRows.every((row) => row.mode === "existing" ? true : !!(row.draft.nom && row.draft.prenoms && row.draft.cni && row.draft.permisNumero && row.draft.permisDateFin)),
    true, // affectation is optional
  ];
  const canSave = stepValid.every(Boolean) && !saving;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let finalOwnerId = ownerMode === "existing" ? ownerId : "";
      if (ownerMode === "new") {
        const base = { ...newOwner, commune, commissionMixteId, associationId: newOwner.logo1Id || null, syndicatId: newOwner.logo2Id || null };
        const payload = isAdmin && syndicatIdSel ? { ...base, syndicatId: syndicatIdSel } : base;
        const created = await addOwner(payload); // POST /api/proprietaires — id réel renvoyé par Neon
        finalOwnerId = created.id;
      }

      const finalDriverIds = [];
      for (const row of driverRows) {
        if (row.mode === "existing") {
          if (row.id) finalDriverIds.push(row.id);
        } else {
          const draftBase = { ...row.draft, commune, commissionMixteId, associationId: row.draft.logo1Id || null, syndicatId: row.draft.logo2Id || null };
          const draftPayload = isAdmin && syndicatIdSel ? { ...draftBase, syndicatId: syndicatIdSel } : draftBase;
          const created = await addDriver(draftPayload); // POST /api/chauffeurs
          finalDriverIds.push(created.id);
        }
      }

      const createdVehicle = await onSave({
        marque, modele, categorie, nombrePlaces, commune, commissionMixteId, chassis, carteGrise, nomCarteGrise, immatriculation, dateMiseCirculation, photo,
        documents: docs,
        proprietaireId: finalOwnerId || null,
        chauffeurIds: finalDriverIds,
        ...(isAdmin && syndicatIdSel ? { syndicatId: syndicatIdSel } : {}),
      }); // POST /api/vehicules

      if (commissionId && ligneId && createdVehicle?.id) {
        await affecterVehicule({ vehiculeId: createdVehicle.id, ligneId, gareRoutiereId, dateAffectation });
      }
    } catch (err) {
      setSaveError(err.message || "Erreur lors de l'enregistrement. Vérifiez la connexion à la base.");
      setSaving(false);
    }
  };

  const isLast = step === STEPS.length - 1;
  const goNext = () => stepValid[step] && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex flex-col" style={{ height: "76vh" }}>
      <StepIndicator step={step} />

      <div className="flex-1 overflow-y-auto pr-1">
        {step === 0 && (
          <SectionCard accent={C.green} icon={<Car size={18} />} title="Véhicule">
            {isAdmin && (
              <div className="mb-5 px-3 py-3 rounded-lg" style={{ background: C.orangeLight }}>
                <Field label="Collectif (Syndicat) gestionnaire" hint="Obligatoire : détermine à quel collectif (syndicat) ce véhicule, son transporteur et ses chauffeurs seront rattachés">
                  <select style={inputStyle} className="font-body" value={syndicatIdSel} onChange={(e) => setSyndicatIdSel(e.target.value)}>
                    <option value="">— Sélectionner un syndicat —</option>
                    {syndicats.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </Field>
                {syndicats.length === 0 && <p className="font-body text-xs mt-1.5" style={{ color: C.red }}>Aucun collectif (syndicat) enregistré — créez-en un depuis la page "Commissions Mixtes" avant d'ajouter un véhicule.</p>}
              </div>
            )}
            <PhotoUpload value={photo} onChange={setPhoto} label="Photo du véhicule" shape="square" />
            <div className="mt-5">
              <CommuneCommissionSelector commune={commune} onChange={(cm, cid) => { setCommune(cm); setCommissionMixteId(cid); }} commissionsMixtes={commissionsMixtes} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-1">
              <Field label="Marque (optionnel)"><TextInput value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Toyota" /></Field>
              <Field label="Modèle (optionnel)"><TextInput value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Hiace 18 places" /></Field>
              <Field label="Secteur / catégorie de transport">
                <select style={inputStyle} className="font-body" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {TRANSPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Nombre de places"><TextInput value={nombrePlaces} onChange={(e) => setNombrePlaces(e.target.value.replace(/\D/g, ""))} placeholder="18" /></Field>
              <Field label="Numéro de châssis (optionnel)"><TextInput value={chassis} onChange={(e) => setChassis(e.target.value)} placeholder="JT731HB0900123456" /></Field>
              <Field label="Numéro carte grise *"><TextInput value={carteGrise} onChange={(e) => setCarteGrise(e.target.value)} placeholder="CG-2024-000000" /></Field>
              <Field label="Nom sur la carte grise" hint="Peut différer du propriétaire actuel"><TextInput value={nomCarteGrise} onChange={(e) => setNomCarteGrise(e.target.value)} placeholder="Nom du titulaire inscrit sur le document" /></Field>
              <Field label="Numéro d'immatriculation *"><TextInput value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} placeholder="CI 1234 AB 01" /></Field>
              <Field label="1ère mise en circulation"><DateInput value={dateMiseCirculation} onChange={(e) => setDateMiseCirculation(e.target.value)} /></Field>
            </div>
            <p className="font-body text-xs mt-3" style={{ color: C.slate }}>* Champs obligatoires pour créer le dossier — tout le reste peut être complété plus tard.</p>
          </SectionCard>
        )}

        {step === 1 && (
          <SectionCard accent={C.amber} icon={<FileText size={18} />} title="Documents administratifs — dates de fin de validité">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Visite technique"><DateInput value={docs.visiteTechnique} onChange={(e) => setDocs({ ...docs, visiteTechnique: e.target.value })} /></Field>
              <Field label="Assurance auto"><DateInput value={docs.assuranceAuto} onChange={(e) => setDocs({ ...docs, assuranceAuto: e.target.value })} /></Field>
              <Field label="Vignette"><DateInput value={docs.vignette} onChange={(e) => setDocs({ ...docs, vignette: e.target.value })} /></Field>
              <Field label="Carte de stationnement"><DateInput value={docs.carteStationnement} onChange={(e) => setDocs({ ...docs, carteStationnement: e.target.value })} /></Field>
            </div>
            <p className="font-body text-xs mt-4 px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
              💡 Le permis de conduire est suivi au niveau de la fiche de chaque chauffeur (étape suivante) et apparaît automatiquement dans les alertes de ce véhicule.
            </p>
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard accent={C.orange} icon={<User size={18} />} title="Propriétaire">
            <p className="font-body text-xs mb-4 px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
              💡 Étape optionnelle — le transporteur peut être ajouté plus tard depuis la fiche du véhicule.
            </p>
            <div className="flex gap-2 mb-5">
              <button type="button" onClick={() => setOwnerMode("none")} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: ownerMode === "none" ? C.orangeLight : "transparent", color: ownerMode === "none" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "none" ? C.orange : C.border}` }}>Sans transporteur pour l'instant</button>
              <button type="button" onClick={() => setOwnerMode("existing")} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: ownerMode === "existing" ? C.orangeLight : "transparent", color: ownerMode === "existing" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "existing" ? C.orange : C.border}` }}>Propriétaire existant</button>
              <button type="button" onClick={() => setOwnerMode("new")} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: ownerMode === "new" ? C.orangeLight : "transparent", color: ownerMode === "new" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "new" ? C.orange : C.border}` }}>+ Nouveau propriétaire</button>
            </div>

            {ownerMode === "none" ? null : ownerMode === "existing" ? (
              owners.length ? (
                <Field label="Sélectionner un propriétaire">
                  <select style={inputStyle} className="font-body" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.prenoms} {o.nom} — {o.quartier}</option>)}
                  </select>
                </Field>
              ) : (
                <p className="font-body text-sm" style={{ color: C.slate }}>Aucun propriétaire enregistré pour le moment — utilisez "+ Nouveau propriétaire".</p>
              )
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <PhotoUpload value={newOwner.photo} onChange={(v) => setNewOwner({ ...newOwner, photo: v })} label="Photo du propriétaire" />
                  <PhotoUpload value={newOwner.qrPaiement} onChange={(v) => setNewOwner({ ...newOwner, qrPaiement: v })} label="QR code Mobile Money (compte marchand)" shape="square" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CollectifSelector collectifId={newOwner.logo2Id} onChange={(v) => setNewOwner({ ...newOwner, logo2Type: v ? "syndicat" : "", logo2Id: v, logo1Type: "", logo1Id: "" })} syndicats={syndicats} commune={commune} />
                  <AssociationSelector associationId={newOwner.logo1Id} onChange={(v) => setNewOwner({ ...newOwner, logo1Type: v ? "association" : "", logo1Id: v })} associations={associations} collectifId={newOwner.logo2Id} syndicats={syndicats} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nom"><TextInput value={newOwner.nom} onChange={(e) => setNewOwner({ ...newOwner, nom: e.target.value })} /></Field>
                  <Field label="Prénoms"><TextInput value={newOwner.prenoms} onChange={(e) => setNewOwner({ ...newOwner, prenoms: e.target.value })} /></Field>
                  <Field label="Numéro CNI"><TextInput value={newOwner.cni} onChange={(e) => setNewOwner({ ...newOwner, cni: e.target.value })} /></Field>
                  <Field label="Numéro permis de conduire"><TextInput value={newOwner.numeroPermis} onChange={(e) => setNewOwner({ ...newOwner, numeroPermis: e.target.value })} /></Field>
                  <Field label="Adresse email"><TextInput value={newOwner.email} onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })} /></Field>
                  <Field label="Contact 1"><TextInput value={newOwner.contact1} onChange={(e) => setNewOwner({ ...newOwner, contact1: e.target.value })} /></Field>
                  <Field label="Contact 2"><TextInput value={newOwner.contact2} onChange={(e) => setNewOwner({ ...newOwner, contact2: e.target.value })} /></Field>
                  <Field label="Contact 3"><TextInput value={newOwner.contact3} onChange={(e) => setNewOwner({ ...newOwner, contact3: e.target.value })} /></Field>
                  <Field label="Ville de résidence"><TextInput value={newOwner.ville} onChange={(e) => setNewOwner({ ...newOwner, ville: e.target.value })} /></Field>
                  <Field label="Quartier"><TextInput value={newOwner.quartier} onChange={(e) => setNewOwner({ ...newOwner, quartier: e.target.value })} /></Field>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {step === 3 && (
          <SectionCard
            accent={C.greenDark}
            icon={<Users size={18} />}
            title={`Chauffeur(s) — ${driverRows.length}/3`}
            right={
              <button
                type="button"
                onClick={addDriverRow}
                disabled={driverRows.length >= 3}
                className="font-body flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: driverRows.length >= 3 ? "#E4E1D8" : C.greenLight, color: driverRows.length >= 3 ? C.slate : C.greenDark, cursor: driverRows.length >= 3 ? "not-allowed" : "pointer" }}
              >
                <Plus size={14} /> {driverRows.length >= 3 ? "Maximum atteint (3)" : "Ajouter un chauffeur"}
              </button>
            }
          >
            <p className="font-body text-xs mb-4 px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
              💡 Étape optionnelle — un ou plusieurs chauffeurs peuvent être ajoutés plus tard depuis la fiche du véhicule.
            </p>
            {driverRows.length === 0 && (
              <p className="font-body text-sm mb-4" style={{ color: C.slate }}>Aucun chauffeur pour l'instant — utilisez "Ajouter un chauffeur" si besoin, ou passez à l'étape suivante.</p>
            )}
            <div className="flex flex-col gap-5">
              {driverRows.map((row, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateDriverRow(i, { mode: "existing" })} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: row.mode === "existing" ? C.greenLight : "transparent", color: row.mode === "existing" ? C.greenDark : C.slate, border: `1px solid ${row.mode === "existing" ? C.green : C.border}` }}>Chauffeur existant</button>
                      <button type="button" onClick={() => updateDriverRow(i, { mode: "new" })} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: row.mode === "new" ? C.greenLight : "transparent", color: row.mode === "new" ? C.greenDark : C.slate, border: `1px solid ${row.mode === "new" ? C.green : C.border}` }}>+ Nouveau chauffeur</button>
                    </div>
                    {driverRows.length > 0 && (
                      <button type="button" onClick={() => removeDriverRow(i)} style={{ color: C.red }} title="Retirer"><Trash2 size={16} /></button>
                    )}
                  </div>

                  {row.mode === "existing" ? (
                    drivers.length ? (
                      <Field label="Sélectionner un chauffeur">
                        <select style={inputStyle} className="font-body" value={row.id} onChange={(e) => updateDriverRow(i, { id: e.target.value })}>
                          {drivers.map((d) => <option key={d.id} value={d.id}>{d.prenoms} {d.nom} — permis {d.permisNumero}</option>)}
                        </select>
                      </Field>
                    ) : (
                      <p className="font-body text-sm" style={{ color: C.slate }}>Aucun chauffeur enregistré — utilisez "+ Nouveau chauffeur".</p>
                    )
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-6">
                        <PhotoUpload value={row.draft.photo} onChange={(v) => updateDriverDraft(i, { photo: v })} label="Photo du chauffeur" />
                        <PhotoUpload value={row.draft.qrPaiement} onChange={(v) => updateDriverDraft(i, { qrPaiement: v })} label="QR code de paiement (wallet Mobile Money)" shape="square" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <CollectifSelector collectifId={row.draft.logo2Id} onChange={(v) => updateDriverDraft(i, { logo2Type: v ? "syndicat" : "", logo2Id: v, logo1Type: "", logo1Id: "" })} syndicats={syndicats} commune={commune} />
                        <AssociationSelector associationId={row.draft.logo1Id} onChange={(v) => updateDriverDraft(i, { logo1Type: v ? "association" : "", logo1Id: v })} associations={associations} collectifId={row.draft.logo2Id} syndicats={syndicats} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Nom"><TextInput value={row.draft.nom} onChange={(e) => updateDriverDraft(i, { nom: e.target.value })} /></Field>
                        <Field label="Prénoms"><TextInput value={row.draft.prenoms} onChange={(e) => updateDriverDraft(i, { prenoms: e.target.value })} /></Field>
                        <Field label="Numéro CNI"><TextInput value={row.draft.cni} onChange={(e) => updateDriverDraft(i, { cni: e.target.value })} /></Field>
                        <Field label="Numéro permis de conduire"><TextInput value={row.draft.permisNumero} onChange={(e) => updateDriverDraft(i, { permisNumero: e.target.value })} /></Field>
                        <Field label="Fin de validité du permis"><DateInput value={row.draft.permisDateFin} onChange={(e) => updateDriverDraft(i, { permisDateFin: e.target.value })} /></Field>
                        <Field label="Adresse email"><TextInput value={row.draft.email} onChange={(e) => updateDriverDraft(i, { email: e.target.value })} /></Field>
                        <Field label="Contact 1"><TextInput value={row.draft.contact1} onChange={(e) => updateDriverDraft(i, { contact1: e.target.value })} /></Field>
                        <Field label="Contact 2"><TextInput value={row.draft.contact2} onChange={(e) => updateDriverDraft(i, { contact2: e.target.value })} /></Field>
                        <Field label="Contact 3"><TextInput value={row.draft.contact3} onChange={(e) => updateDriverDraft(i, { contact3: e.target.value })} /></Field>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {step === 4 && (
          <SectionCard accent={C.orangeDark} icon={<MapPin size={18} />} title="Affectation (gare routière & ligne)">
            <p className="font-body text-xs mb-4 px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
              💡 Étape optionnelle. Un véhicule peut être affecté plus tard, ou réaffecté depuis la liste des véhicules. La commission mixte est déduite automatiquement de la gare routière choisie.
            </p>
            {garesDeMonSyndicat.length === 0 ? (
              <p className="font-body text-sm" style={{ color: C.slate }}>Aucune gare routière enregistrée pour ce collectif (syndicat) — créez-en une depuis la page "Gares Routières", puis revenez affecter ce véhicule.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Gare routière (lieu d'opération)">
                  <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => { setGareRoutiereId(e.target.value); setLigneId(""); }}>
                    <option value="">— Sélectionner —</option>
                    {garesDeMonSyndicat.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
                  </select>
                </Field>
                <Field label="Ligne">
                  <select style={gareRoutiereId ? inputStyle : inputDisabledStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!gareRoutiereId}>
                    <option value="">— Sélectionner —</option>
                    {lignesDeLaGareChoisie.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
                  </select>
                </Field>
                <Field label="Date d'affectation">
                  <DateInput value={dateAffectation} onChange={(e) => setDateAffectation(e.target.value)} />
                </Field>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 mt-2" style={{ borderTop: `1px solid ${C.border}` }}>
        <button onClick={step === 0 ? onCancel : goBack} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5" style={{ color: C.slate }}>
          {step === 0 ? "Annuler" : (<><ChevronLeft size={15} /> Précédent</>)}
        </button>
        <div className="flex items-center gap-3">
          {saveError && <span className="font-body text-xs" style={{ color: C.red }}>{saveError}</span>}
          {!isLast ? (
            <button
              onClick={goNext}
              disabled={!stepValid[step]}
              className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-1.5"
              style={{ background: stepValid[step] ? C.green : "#B9C4BE", color: "#fff", cursor: stepValid[step] ? "pointer" : "not-allowed" }}
            >
              Suivant <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
              style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}
            >
              <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer le véhicule"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FICHE VÉHICULE COMMERCIAL
   ============================================================ */
function FicheVehicule({ vehicle, owners, drivers, commissionsMixtes, syndicats, associations = [], garesRoutieres, onClose }) {
  const owner = owners.find((o) => o.id === vehicle.proprietaireId);
  const vDrivers = vehicle.chauffeurIds.map((id) => drivers.find((d) => d.id === id)).filter(Boolean);

  // Entête personnalisé — même logique que la carte de membre (logos
  // explicitement choisis, avec repli sur le rattachement syndicat/
  // commission), peu importe qui a créé ce transporteur.
  const { syndicat: autoSyndicat, commission: autoCommission } = getMemberHierarchy(owner, commissionsMixtes, syndicats);
  const logo1 = resolveLogoEntity(owner?.logo1Type, owner?.logo1Id, commissionsMixtes, syndicats, associations) || autoSyndicat;
  const logo2 = resolveLogoEntity(owner?.logo2Type, owner?.logo2Id, commissionsMixtes, syndicats, associations) || autoCommission;
  const headerEntity = logo1 || logo2;
  const headerFallbackLabel = "Commissions Mixtes de Côte d'Ivoire — COMIX-CI";
  const headerTitle = headerEntity ? (headerEntity.sigle ? `${headerEntity.nom} — ${headerEntity.sigle}` : headerEntity.nom) : headerFallbackLabel;

  return (
    <div className="fiche-modal-scroll flex flex-col gap-4">
      <div className="print-area" style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(120deg, ${C.green} 0%, ${C.greenDark} 75%)`, padding: "20px 28px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 8, background: C.orange }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {headerEntity?.logoUrl ? <img src={headerEntity.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={20} color="#fff" />}
              </div>
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{headerTitle}</div>
                <div className="font-body" style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>Fiche d'Identification du Transporteur — Réf. {vehicle.id}</div>
              </div>
            </div>
            <button onClick={() => window.print()} className="no-print font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ border: `1px solid rgba(255,255,255,0.4)`, color: "#fff", background: "rgba(255,255,255,0.1)" }}>
              <Printer size={14} /> Imprimer
            </button>
          </div>
        </div>
        <TricolorRule />

        <div style={{ padding: "16px 22px 14px" }}>

        {/* Transporteur (ex-Propriétaire) — première section de la fiche */}
        <div className="mb-3">
          <div className="font-display flex items-center gap-1.5 mb-2" style={{ fontSize: 12.5, fontWeight: 700, color: C.orangeDark }}>
            <User size={13} /> Transporteur
          </div>
          {owner ? (
            <div className="flex gap-3">
              <div style={{ width: 44, height: 44, borderRadius: 999, overflow: "hidden", background: C.cream, flexShrink: 0, border: `1px solid ${C.border}` }}>
                {owner.photo ? <img src={owner.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-semibold" style={{ color: C.slate, fontSize: 11 }}>{initials(owner.nom, owner.prenoms)}</div>}
              </div>
              <div className="font-body grid grid-cols-4 gap-x-3 gap-y-1 flex-1" style={{ color: C.ink, fontSize: 10.5 }}>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Nom & prénoms</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.prenoms} {owner.nom}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>CNI</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.cni}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>N° Carte transporteur</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.carteTransporteurNumero || "—"}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Permis de conduire</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.numeroPermis || "—"}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Contacts</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{[owner.contact1, owner.contact2, owner.contact3].filter(Boolean).join(" · ")}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Email</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.email || "—"}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Ville</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.ville}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Quartier</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.quartier}</div></div>
              </div>
            </div>
          ) : <div className="font-body text-xs" style={{ color: C.slate }}>Aucun transporteur enregistré.</div>}
          {vehicle.historiqueProprietaires.length > 1 && (
            <div className="font-body" style={{ fontSize: 8.5, marginTop: 6, color: C.slate }}>
              Historique : {vehicle.historiqueProprietaires.map((h, i) => {
                const o = owners.find((x) => x.id === h.proprietaireId);
                return `${o ? o.prenoms + " " + o.nom : "?"} (depuis ${fmt(h.depuis)})`;
              }).join("  →  ")}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Véhicule */}
        <div className="my-3">
          <div className="font-display flex items-center gap-1.5 mb-2" style={{ fontSize: 12.5, fontWeight: 700, color: C.green }}>
            <Car size={13} /> Véhicule
          </div>
          <div className="flex gap-3">
            <div style={{ width: 54, height: 54, borderRadius: 8, overflow: "hidden", background: C.cream, flexShrink: 0, border: `1px solid ${C.border}` }}>
              {vehicle.photo ? <img src={vehicle.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center"><Car size={18} color={C.slate} /></div>}
            </div>
            <div className="font-body grid grid-cols-4 gap-x-3 gap-y-1 flex-1" style={{ color: C.ink, fontSize: 10.5 }}>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Marque</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{vehicle.marque}</div></div>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Modèle</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{vehicle.modele}</div></div>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Immatriculation</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{vehicle.immatriculation}</div></div>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Châssis</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{vehicle.chassis}</div></div>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Carte grise n°</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{vehicle.carteGrise || "—"}</div></div>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Nom sur carte grise</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{vehicle.nomCarteGrise || "—"}</div></div>
              <div><span style={{ color: C.slate, fontSize: 8.5 }}>Mise en circulation</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{fmt(vehicle.dateMiseCirculation)}</div></div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[["Visite technique", vehicle.documents.visiteTechnique], ["Assurance auto", vehicle.documents.assuranceAuto], ["Vignette", vehicle.documents.vignette], ["Carte stationnement", vehicle.documents.carteStationnement]].map(([label, date]) => {
              const s = statusOf(date);
              return (
                <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 7px" }}>
                  <div className="font-body" style={{ fontSize: 8, marginBottom: 2, color: C.slate }}>{label}</div>
                  <div className="font-mono" style={{ fontSize: 9.5, marginBottom: 3, color: C.ink }}>{fmt(date)}</div>
                  <Badge status={s} small />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Secteur / Catégorie de transport */}
        <div className="my-3">
          <div className="font-display flex items-center gap-1.5 mb-1.5" style={{ fontSize: 12.5, fontWeight: 700, color: C.orangeDark }}>
            <BadgeCheck size={13} /> Secteur / Catégorie de transport
          </div>
          <div className="font-body" style={{ fontSize: 10.5, color: C.ink }}>
            {vehicle.categorie || "—"}
          </div>
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Chauffeurs — tableau compact, jusqu'à 3 par véhicule */}
        <div className="mt-3">
          <div className="font-display flex items-center gap-1.5 mb-2" style={{ fontSize: 12.5, fontWeight: 700, color: C.greenDark }}>
            <Users size={13} /> Chauffeur{vDrivers.length > 1 ? "s" : ""} ({vDrivers.length}/3)
          </div>
          {vDrivers.length === 0 ? (
            <div className="font-body text-xs" style={{ color: C.slate }}>Aucun chauffeur affecté.</div>
          ) : (
            <table className="w-full font-body" style={{ borderCollapse: "collapse", fontSize: 9.5 }}>
              <thead>
                <tr style={{ color: C.slate, fontSize: 8 }}>
                  <th className="text-left" style={{ paddingBottom: 3, fontWeight: 500 }}></th>
                  <th className="text-left" style={{ paddingBottom: 3, fontWeight: 500 }}>Nom & prénoms</th>
                  <th className="text-left" style={{ paddingBottom: 3, fontWeight: 500 }}>CNI</th>
                  <th className="text-left" style={{ paddingBottom: 3, fontWeight: 500 }}>Permis n°</th>
                  <th className="text-left" style={{ paddingBottom: 3, fontWeight: 500 }}>Fin validité</th>
                  <th className="text-left" style={{ paddingBottom: 3, fontWeight: 500 }}>Contacts</th>
                </tr>
              </thead>
              <tbody>
                {vDrivers.map((d) => {
                  const s = statusOf(d.permisDateFin);
                  return (
                    <tr key={d.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "4px 6px 4px 0" }}>
                        <div style={{ width: 26, height: 26, borderRadius: 999, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}` }}>
                          {d.photo ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-semibold" style={{ color: C.slate, fontSize: 7.5 }}>{initials(d.nom, d.prenoms)}</div>}
                        </div>
                      </td>
                      <td className="font-medium" style={{ padding: "4px 6px" }}>{d.prenoms} {d.nom}</td>
                      <td className="font-mono" style={{ padding: "4px 6px" }}>{d.cni}</td>
                      <td className="font-mono" style={{ padding: "4px 6px" }}>{d.permisNumero}</td>
                      <td style={{ padding: "4px 6px" }}>
                        <div className="flex items-center gap-1.5">{fmt(d.permisDateFin)} <Badge status={s} small /></div>
                      </td>
                      <td style={{ padding: "4px 6px" }}>{[d.contact1, d.contact2].filter(Boolean).join(" · ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Signature & authentification */}
        <div className="mt-4 pt-3" style={{ borderTop: `1.5px dashed ${C.border}` }}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col items-center">
              <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 6, padding: 5 }}>
                <QRCodeSVG value={ficheUrl(vehicle.id)} size={100} bgColor="#ffffff" fgColor={C.ink} level="M" />
              </div>
              <div className="font-body text-center" style={{ fontSize: 8.5, color: C.slate, marginTop: 4 }}>
                Scanner pour ouvrir cette fiche en ligne
              </div>
              <div className="font-body text-center" style={{ fontSize: 8.5, color: C.slate }}>
                Fait à Abidjan, le {fmt(new Date().toISOString().slice(0, 10))}
              </div>
            </div>

            <div className="flex flex-col items-center" style={{ minWidth: 170 }}>
              <div
                style={{
                  width: 50, height: 50, borderRadius: 999, border: `1.5px dashed ${C.slate}`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6,
                  color: C.slate, fontSize: 7, textAlign: "center", lineHeight: 1.2,
                }}
                className="font-body"
              >
                CACHET<br />COMIX-CI
              </div>
              <div style={{ width: 170, borderBottom: `1px solid ${C.ink}`, height: 22 }} />
              <div className="font-body text-center" style={{ fontSize: 9.5, color: C.ink, marginTop: 4 }}>
                <div style={{ fontWeight: 700 }}>Le Président de la Mutuelle</div>
                <div style={{ color: C.slate, fontSize: 8.5 }}>COMIX-CI</div>
              </div>
            </div>
          </div>
        </div>

        </div>

        <div style={{ height: 4, display: "flex" }}>
          <div style={{ flex: 1, background: C.green }} />
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.border}` }} />
          <div style={{ flex: 1, background: C.orange }} />
        </div>
      </div>
      <button onClick={onClose} className="no-print font-body text-sm font-semibold self-end px-4 py-2" style={{ color: C.slate }}>Fermer</button>
    </div>
  );
}

/* ============================================================
   CARTE DE MEMBRE (chauffeur)
   ============================================================ */
function fuelQrData(driverId, carteGrise) {
  // Format lu par l'app mobile du pompiste au scan : identifiant de la
  // carte + numéro de carte grise du véhicule (pas une URL vers le dashboard).
  return `carte=${driverId}&carteGrise=${encodeURIComponent(carteGrise || "")}`;
}

/* ============================================================
   CARTE DE MEMBRE UNIFIÉE — Transporteur / Chauffeur / Élément
   Recto : double logo (collectif 1 en haut à droite, collectif 2 en
   haut à gauche — sélection explicite depuis le formulaire), photo,
   nom complet, infos secondaires, n° de carte + QR vers la fiche.
   Verso : grand QR code du compte marchand Mobile Money.
   Couleurs 100% palette CI (orange/vert/blanc) — l'orientation des
   bandeaux et la couleur d'accent du n° de carte diffèrent par
   catégorie pour permettre une identification visuelle rapide.
   ============================================================ */
const MEMBER_CARD_THEMES = {
  transporteur: {
    barTop: `linear-gradient(90deg, ${C.green} 0%, ${C.green} 55%, ${C.orange} 100%)`,
    barBottom: `linear-gradient(90deg, ${C.orange} 0%, ${C.green} 55%, ${C.green} 100%)`,
    numColor: C.orangeDark,
    label: "Transporteur agréé",
    photoShape: "circle",
    badgeIcon: Car,
    badgeColor: C.greenDark,
    footerTint: "#fff",
  },
  chauffeur: {
    barTop: `linear-gradient(90deg, ${C.orange} 0%, ${C.orange} 55%, ${C.green} 100%)`,
    barBottom: `linear-gradient(90deg, ${C.green} 0%, ${C.orange} 55%, ${C.orange} 100%)`,
    numColor: C.greenDark,
    label: "Chauffeur agréé",
    photoShape: "circle-ring",
    badgeIcon: RotateCw,
    badgeColor: C.orangeDark,
    footerTint: C.orangeLight,
  },
  element: {
    barTop: `linear-gradient(90deg, ${C.green} 0%, ${C.orange} 50%, ${C.green} 100%)`,
    barBottom: `linear-gradient(90deg, ${C.orange} 0%, ${C.green} 50%, ${C.orange} 100%)`,
    numColor: "#FFD9A8",
    label: "Élément agréé",
    photoShape: "squircle",
    badgeIcon: BadgeCheck,
    badgeColor: C.orange,
    footerTint: "rgba(255,255,255,0.10)",
    // Recto sur fond vert dégradé : l'élément est un agent administratif,
    // sa carte se distingue au premier regard de celles des transporteurs
    // et des chauffeurs, qui restent sur fond clair.
    cardBackground: `linear-gradient(145deg, ${C.greenDark} 0%, ${C.green} 55%, #0d8560 100%)`,
    textColor: "#fff",
    textMuted: "rgba(255,255,255,0.72)",
    photoBorder: "rgba(255,255,255,0.55)",
  },
};

// Résout l'entité logo (commission mixte ou syndicat) à partir du type/id
// explicitement choisis dans le formulaire du membre.
function resolveLogoEntity(type, id, commissionsMixtes, syndicats, associations = []) {
  if (!type || !id) return null;
  if (type === "commission_mixte") return commissionsMixtes.find((c) => c.id === id) || null;
  if (type === "syndicat") return syndicats.find((s) => s.id === id) || null;
  if (type === "association") return associations.find((a) => a.id === id) || null;
  return null;
}

// Prépare tout ce dont MemberCardFace a besoin pour un membre donné :
// résolution des deux logos (sélection explicite du formulaire, avec repli
// sur la hiérarchie syndicat/commission si non renseignée), numéro de
// carte, valeur du QR (vers la fiche pour transporteur/chauffeur, référence
// d'identité pour un élément qui n'a pas de véhicule), et champs d'info.
function cardDataFor(member, category, commissionsMixtes, syndicats, vehicles, associations = []) {
  const { syndicat: autoSyndicat, commission: autoCommission } = getMemberHierarchy(member, commissionsMixtes, syndicats);
  // logo1 = haut a DROITE (association) ; logo2 = haut a GAUCHE (collectif)
  const logo1 = resolveLogoEntity(member.logo1Type, member.logo1Id, commissionsMixtes, syndicats, associations) || autoSyndicat;
  const logo2 = resolveLogoEntity(member.logo2Type, member.logo2Id, commissionsMixtes, syndicats, associations) || autoCommission;

  if (category === "transporteur") {
    return {
      logo1, logo2,
      numero: member.carteTransporteurNumero,
      ficheValue: transporteurFicheUrl(member.id),
      infoFields: [{ label: "N° Permis", value: member.numeroPermis }, { label: "Téléphone", value: member.contact1 }],
      versoQr: false, // pas de QR au verso — seulement l'accès à la fiche, au recto
    };
  }
  if (category === "chauffeur") {
    const vehicule = vehicles.find((v) => v.chauffeurIds.includes(member.id));
    return {
      logo1, logo2,
      numero: member.numeroCarte, // sert aussi d'identifiant unique pour la consommation carburant (lu/saisi tel quel, pas de QR dédié)
      ficheValue: vehicule ? ficheUrl(vehicule.id) : `chauffeur:${member.id}`, // QR d'accès à la fiche du transporteur
      infoFields: [{ label: "N° Permis", value: member.permisNumero }, { label: "Téléphone", value: member.contact1 }],
      versoQr: true, // + QR marchand Mobile Money au verso = 2 QR au total (fiche + marchand)
    };
  }
  // element
  return {
    logo1, logo2,
    numero: member.numeroCarte,
    ficheValue: `element:${member.id}`,
    infoFields: [{ label: "Fonction", value: member.fonction }, { label: "Téléphone", value: member.contact1 }],
    versoQr: false,
  };
}

function MemberCardFace({ member, category, logo1, logo2, numero, ficheValue, infoFields = [], versoQr = true, side, scale = 1 }) {
  const isRecto = side === "recto";
  const theme = MEMBER_CARD_THEMES[category];
  // Sur fond colore, les textes passent en clair pour rester lisibles.
  const surFondColore = isRecto && !!theme.cardBackground;
  const tPrincipal = surFondColore ? theme.textColor : C.ink;
  const tSecondaire = surFondColore ? theme.textMuted : C.slate;
  const card = (
    <div
      style={{
        width: 340, height: 214, borderRadius: 16, position: "relative", flexShrink: 0, overflow: "hidden",
        background: isRecto && theme.cardBackground ? theme.cardBackground : "#fff",
        border: `1px solid ${isRecto && theme.cardBackground ? "transparent" : C.border}`,
        boxShadow: scale === 1 ? "0 12px 28px rgba(11,110,79,0.2)" : "none",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: theme.barTop }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: theme.barBottom }} />

      {isRecto ? (
        <div className="flex flex-col h-full justify-between" style={{ padding: "11px 18px 13px" }}>
          {/* Double logo : collectif 1 (droite) + collectif 2 (gauche), choisis explicitement */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5" style={{ maxWidth: "48%" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {logo2?.logoUrl ? <img src={logo2.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={14} color={C.green} />}
              </div>
              <div className="font-display" style={{ fontSize: 7.3, fontWeight: 700, color: surFondColore ? "#fff" : C.greenDark, lineHeight: 1.05 }}>{logo2 ? (logo2.sigle || logo2.nom) : "COMIX-CI"}</div>
            </div>
            <div style={{ width: 1, height: 22, background: surFondColore ? "rgba(255,255,255,0.35)" : C.border }} />
            <div className="flex items-center gap-1.5 flex-row-reverse" style={{ maxWidth: "48%" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {logo1?.logoUrl ? <img src={logo1.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={14} color={C.orangeDark} />}
              </div>
              <div className="font-display text-right" style={{ fontSize: 7.3, fontWeight: 700, color: surFondColore ? "#FFD9A8" : C.orangeDark, lineHeight: 1.05 }}>{logo1 ? (logo1.sigle || logo1.nom) : "—"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 42, height: 42,
                  borderRadius: theme.photoShape === "squircle" ? 11 : 999,
                  overflow: "hidden", background: C.cream,
                  border: theme.photoShape === "circle-ring"
                    ? `2px dashed ${theme.badgeColor}`
                    : `2px solid ${surFondColore ? theme.photoBorder : C.border}`,
                }}
              >
                {member.photo ? <img src={member.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-bold text-sm" style={{ color: C.slate }}>{initials(member.nom, member.prenoms)}</div>}
              </div>
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: 999, background: theme.badgeColor, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <theme.badgeIcon size={9} color="#fff" />
              </div>
            </div>
            <div className="font-body">
              <div style={{ fontSize: 13.5, fontWeight: 700, color: tPrincipal, lineHeight: 1.15 }}>{member.prenoms} {member.nom}</div>
              <div style={{ fontSize: 9, color: tSecondaire }}>{theme.label}</div>
            </div>
          </div>

          <div className="font-body flex items-center gap-4" style={{ fontSize: 8, color: tSecondaire }}>
            {infoFields.map((f, i) => (
              <div key={i}>
                <span style={{ fontSize: 7, color: tSecondaire }}>{f.label}</span>
                <div className="font-mono" style={{ fontSize: 9, color: tPrincipal, fontWeight: 600, lineHeight: 1.2 }}>{f.value || "—"}</div>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between" style={{ background: theme.footerTint, padding: "4px 8px", borderRadius: 8 }}>
            <div className="font-body">
              <div style={{ fontSize: 7.5, color: tSecondaire }}>N° Carte</div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 12, color: theme.numColor }}>{numero || "—"}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 6, padding: 3, border: `1px solid ${C.border}`, flexShrink: 0 }}>
              <QRCodeSVG value={ficheValue} size={68} bgColor="#ffffff" fgColor={C.ink} level="M" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full items-center justify-center gap-1.5" style={{ padding: "9px 18px 11px", background: C.cream }}>
          {versoQr ? (
            <>
              {member.qrPaiement ? (
                <div style={{ background: "#fff", borderRadius: 10, padding: 5, border: `1px solid ${C.border}` }}>
                  <img src={member.qrPaiement} alt="QR Mobile Money" style={{ width: 142, height: 142, objectFit: "contain" }} />
                </div>
              ) : (
                <div className="flex items-center justify-center font-body text-center" style={{ width: 142, height: 142, background: "#fff", borderRadius: 10, border: `1px dashed ${C.border}`, color: C.slate, fontSize: 9, padding: 10 }}>
                  QR Mobile Money non renseigné
                </div>
              )}
              <div className="font-body text-center" style={{ fontSize: 8.5, color: C.slate, lineHeight: 1.25 }}>
                Scannez et Payez par Mobile-Pay — <strong style={{ color: C.ink }}>{member.prenoms} {member.nom}</strong>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div style={{ width: 62, height: 62, borderRadius: 999, overflow: "hidden", background: "#fff", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {logo2?.logoUrl || logo1?.logoUrl ? <img src={(logo2 || logo1).logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={28} color={C.greenDark} />}
              </div>
              <div className="font-display text-center" style={{ fontSize: 11, fontWeight: 700, color: C.greenDark }}>{(logo2 || logo1) ? (logo2 || logo1).nom : "COMIX-CI"}</div>
              <div className="font-body text-center" style={{ fontSize: 8, color: C.slate }}>Carte {theme.label.toLowerCase()} — n° {numero || "—"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (scale === 1) return card;
  return (
    <div style={{ width: 340 * scale, height: 214 * scale, overflow: "hidden", flexShrink: 0 }}>
      <div style={{ width: 340, height: 214, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {card}
      </div>
    </div>
  );
}

function MemberCard({ member, category, logo1, logo2, numero, ficheValue, infoFields, versoQr, initialFace = "recto" }) {
  const [flipped, setFlipped] = useState(initialFace === "verso");
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);

  // La carte a une largeur fixe de 340 px. Sur un telephone etroit elle
  // depassait l'ecran et provoquait un defilement lateral ; on la reduit
  // pour qu'elle tienne toujours dans la largeur disponible.
  React.useEffect(() => {
    const ajuster = () => {
      const dispo = wrapRef.current?.clientWidth || 340;
      setScale(Math.min(1, dispo / 344));
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  if (!member) return null;
  const props = { member, category, logo1, logo2, numero, ficheValue, infoFields, versoQr };
  return (
    <div className="flex flex-col items-center gap-3" ref={wrapRef} style={{ width: "100%" }}>
      <div className="no-print" style={{ width: 340 * scale, height: 214 * scale, overflow: "hidden" }}>
        <div style={{ width: 340, height: 214, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <MemberCardFace {...props} side={flipped ? "verso" : "recto"} />
        </div>
      </div>
      <div className="print-area print-card-duo flex items-center justify-center flex-wrap gap-4">
        <MemberCardFace {...props} side="recto" />
        <MemberCardFace {...props} side="verso" />
      </div>
      <div className="no-print flex items-center gap-2">
        <button onClick={() => setFlipped((f) => !f)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ border: `1px solid ${C.border}`, color: C.ink }}>
          <RotateCw size={13} /> {flipped ? "Voir le recto" : "Voir le verso"}
        </button>
        <button onClick={() => window.print()} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ border: `1px solid ${C.border}`, color: C.ink }}>
          <Printer size={13} /> Imprimer (recto + verso)
        </button>
      </div>
    </div>
  );
}

const MEMBER_CARDS_PER_SHEET = 6;
const MEMBER_SHEET_SCALE = 254 / 340;

// `items` : tableau pré-calculé par l'appelant, un élément par carte à
// imprimer : { key, name, member, category, logo1, logo2, numero, ficheValue, infoFields }
function MemberCardSheet({ items, title }) {
  if (!items.length) return null;
  const groups = [];
  for (let i = 0; i < items.length; i += MEMBER_CARDS_PER_SHEET) groups.push(items.slice(i, i + MEMBER_CARDS_PER_SHEET));

  return (
    <div className="print-area print-card-sheet">
      {groups.map((group, gi) => (
        <div key={gi} className="card-sheet-page" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: gi === 0 ? 0 : 10 }}>
          {gi === 0 && (
            <div className="font-body" style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>
              COMIX-CI — {title} ({items.length} carte{items.length > 1 ? "s" : ""}) — recto/verso par ligne, {MEMBER_CARDS_PER_SHEET} cartes/feuille.
            </div>
          )}
          {group.map((it) => (
            <div key={it.key} className="flex items-center gap-4" style={{ borderBottom: `1px dashed ${C.border}`, paddingBottom: 8 }}>
              <MemberCardFace member={it.member} category={it.category} logo1={it.logo1} logo2={it.logo2} numero={it.numero} ficheValue={it.ficheValue} infoFields={it.infoFields} versoQr={it.versoQr} side="recto" scale={MEMBER_SHEET_SCALE} />
              <MemberCardFace member={it.member} category={it.category} logo1={it.logo1} logo2={it.logo2} numero={it.numero} ficheValue={it.ficheValue} infoFields={it.infoFields} versoQr={it.versoQr} side="verso" scale={MEMBER_SHEET_SCALE} />
              <div className="font-body" style={{ fontSize: 10, color: C.slate }}>{it.name}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   DASHBOARD / LIST PAGES
   ============================================================ */
const SYNDICAT_SUSPECT_THRESHOLD = 3; // en dessous de ce nombre de membres, un syndicat est signalé comme à surveiller

/* ============================================================
   PANNEAU HAUT CONSEIL DU TRANSPORT — accueil admin
   Recherche véhicule → fiche transporteur, + vue d'ensemble
   commissions mixtes / syndicats / effectifs.
   ============================================================ */
const NON_COMPLIANT_GROUPINGS = [
  { key: "commission", label: "Par commission mixte" },
  { key: "syndicat", label: "Par collectif (syndicat)" },
  { key: "gare", label: "Par gare routière" },
];

function HautConseilPanel({ vehicles, owners, commissionsMixtes, syndicats, garesRoutieres, affectations, critical, onOpenFiche }) {
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [groupBy, setGroupBy] = useState("commission");

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = vehicles.find((v) =>
      v.immatriculation?.toLowerCase().includes(q) || v.chassis?.toLowerCase().includes(q)
    );
    if (match) {
      setNotFound(false);
      onOpenFiche(match);
    } else {
      setNotFound(true);
    }
  };

  // Véhicules distincts ayant au moins un document expiré ou proche de
  // l'expiration (≤ 30 j), signalés automatiquement par l'application.
  const nonCompliant = [];
  const seen = new Set();
  critical.forEach((a) => {
    if (!seen.has(a.vehicle.id)) {
      seen.add(a.vehicle.id);
      nonCompliant.push({ vehicle: a.vehicle, issues: critical.filter((x) => x.vehicle.id === a.vehicle.id) });
    }
  });
  nonCompliant.sort((a, b) => Math.min(...a.issues.map((i) => i.days ?? 9999)) - Math.min(...b.issues.map((i) => i.days ?? 9999)));

  // Indicateur distinct : échéances qui approchent dans les 15 prochains
  // jours (et pas encore expirées) — alerte précoce avant le seuil ≤ 30 j.
  const approaching15Count = new Set(
    critical.filter((a) => a.days !== null && a.days >= 0 && a.days <= 15).map((a) => a.vehicle.id)
  ).size;

  function groupKeyAndLabel(vehicle) {
    const affectation = affectations.find((a) => a.vehiculeId === vehicle.id && a.actif);
    if (groupBy === "commission") {
      const c = affectation ? commissionsMixtes.find((x) => x.id === affectation.commissionMixteId) : null;
      return { key: c?.id || "none", label: c?.nom || "Non affecté à une commission" };
    }
    if (groupBy === "syndicat") {
      const s = syndicats.find((x) => x.id === vehicle.syndicatId);
      return { key: s?.id || "none", label: s?.nom || "Non rattaché à un collectif (syndicat)" };
    }
    const gare = affectation?.gareRoutiereId ? garesRoutieres.find((g) => g.id === affectation.gareRoutiereId) : null;
    return { key: gare?.id || "none", label: gare ? (gare.sigle || gare.nom) : "Gare routière non renseignée" };
  }

  const groups = [];
  nonCompliant.forEach((entry) => {
    const { key, label } = groupKeyAndLabel(entry.vehicle);
    let group = groups.find((g) => g.key === key);
    if (!group) { group = { key, label, entries: [] }; groups.push(group); }
    group.entries.push(entry);
  });
  groups.sort((a, b) => b.entries.length - a.entries.length);

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: `linear-gradient(120deg, ${C.greenDark}, ${C.green})`, borderRadius: 14, padding: 20 }}>
        <div className="font-display" style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Haut Conseil du Transport de Côte d'Ivoire</div>
        <div className="font-body" style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 14 }}>
          Vue d'ensemble des commissions mixtes, des syndicats et de leurs membres
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1" style={{ background: "#fff" }}>
            <Search size={15} color={C.slate} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
              placeholder="Rechercher un véhicule (immatriculation ou châssis) → fiche du transporteur"
              className="font-body text-sm flex-1"
              style={{ border: "none", outline: "none" }}
            />
          </div>
          <button type="submit" className="font-body text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
            Rechercher
          </button>
        </form>
        {notFound && <p className="font-body text-xs mt-2" style={{ color: "#FDEBD8" }}>Aucun véhicule trouvé pour "{query}".</p>}
      </div>

      <div className="flex gap-4 comix-stats-row">
        <StatCard icon={<AlertTriangle size={17} />} label="Véhicules non en règle" value={nonCompliant.length} accent={C.red} />
        <StatCard icon={<Bell size={17} />} label="Échéances à 15 jours" value={approaching15Count} accent={C.amber} />
      </div>

      <SectionCard
        accent={C.red}
        icon={<AlertTriangle size={18} />}
        title={`Véhicules non en règle (${nonCompliant.length})`}
        right={
          <div className="flex gap-1.5">
            {NON_COMPLIANT_GROUPINGS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGroupBy(g.key)}
                className="font-body text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: groupBy === g.key ? C.redLight : "transparent", color: groupBy === g.key ? C.red : C.slate, border: `1px solid ${groupBy === g.key ? C.red : C.border}` }}
              >
                {g.label}
              </button>
            ))}
          </div>
        }
      >
        {nonCompliant.length === 0 ? (
          <div className="text-sm" style={{ color: C.slate }}>Aucun véhicule signalé pour le moment. 👍</div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.key}>
                <div className="font-body text-xs font-semibold mb-2" style={{ color: C.ink }}>{group.label} — {group.entries.length} véhicule{group.entries.length > 1 ? "s" : ""}</div>
                <div className="flex flex-col gap-2">
                  {group.entries.map(({ vehicle, issues }, i) => {
                    const worst = issues.some((x) => x.days !== null && x.days < 0) ? "expire" : "alerte";
                    const badgeStatus = worst === "expire"
                      ? { label: `${issues.length} document(s) — dont expiré(s)`, color: C.red, bg: C.redLight }
                      : { label: `${issues.length} document(s) proche(s) d'échéance`, color: C.amber, bg: C.amberLight };
                    return (
                      <button
                        key={vehicle.id}
                        onClick={() => onOpenFiche(vehicle)}
                        className="flex items-center justify-between py-2 text-left w-full"
                        style={{ borderBottom: i < group.entries.length - 1 ? `1px solid ${C.border}` : "none" }}
                      >
                        <div className="flex items-center gap-3">
                          <Car size={15} color={C.slate} />
                          <div>
                            <div className="text-sm font-medium" style={{ color: C.ink }}>{vehicle.immatriculation} <span style={{ color: C.slate, fontWeight: 400 }}>· {vehicle.marque} {vehicle.modele}</span></div>
                            <div className="text-xs" style={{ color: C.slate }}>{issues.map((x) => x.label).join(", ")}</div>
                          </div>
                        </div>
                        <Badge status={badgeStatus} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard accent={C.orangeDark} icon={<Building2 size={18} />} title={`Commissions mixtes & collectifs (${commissionsMixtes.length} commission${commissionsMixtes.length > 1 ? "s" : ""}, ${syndicats.length} collectif${syndicats.length > 1 ? "s" : ""})`}>
        {commissionsMixtes.length === 0 ? (
          <p className="font-body text-sm" style={{ color: C.slate }}>Aucune commission mixte enregistrée.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {commissionsMixtes.map((c) => {
              const commissionSyndicats = syndicats.filter((s) => s.commissionMixteId === c.id);
              const totalMembres = owners.filter((o) => commissionSyndicats.some((s) => s.id === o.syndicatId)).length;
              return (
                <div key={c.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-body text-sm font-semibold" style={{ color: C.ink }}>{c.nom} <span style={{ color: C.slate, fontWeight: 400 }}>({c.commune})</span></div>
                    <div className="font-body text-xs" style={{ color: C.slate }}>{commissionSyndicats.length} collectif{commissionSyndicats.length > 1 ? "s" : ""} · {totalMembres} transporteur{totalMembres > 1 ? "s" : ""}</div>
                  </div>
                  {commissionSyndicats.length === 0 ? (
                    <p className="font-body text-xs" style={{ color: C.slate }}>Aucun collectif (syndicat) pour cette commission.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {commissionSyndicats.map((s) => {
                        const count = owners.filter((o) => o.syndicatId === s.id).length;
                        const suspect = count < SYNDICAT_SUSPECT_THRESHOLD;
                        return (
                          <div key={s.id} style={{ background: suspect ? C.redLight : C.cream, borderRadius: 8, padding: "8px 10px" }}>
                            <div className="font-body text-xs font-medium" style={{ color: C.ink }}>{s.nom}</div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: suspect ? C.red : C.green }}>{count}</span>
                              {suspect && (
                                <span className="font-body flex items-center gap-1" style={{ fontSize: 9, color: C.red, fontWeight: 600 }}>
                                  <AlertTriangle size={10} /> À surveiller
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="font-body text-xs mt-3" style={{ color: C.slate }}>
          💡 Un syndicat affichant moins de {SYNDICAT_SUSPECT_THRESHOLD} membres est signalé "À surveiller" — repère utile pour identifier d'éventuels syndicats fantaisistes créés pour abuser de la vulnérabilité des transporteurs.
        </p>
      </SectionCard>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderTop: `4px solid ${accent}`, borderRadius: 14, padding: 18, flex: 1, boxShadow: "0 2px 10px rgba(11,110,79,0.05)" }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ width: 34, height: 34, borderRadius: 9, background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: `0 3px 9px ${accent}44` }}>{icon}</div>
      </div>
      <div className="font-display" style={{ fontSize: 28, fontWeight: 800, color: C.ink, letterSpacing: -0.6 }}>{value}</div>
      <div className="font-body text-xs" style={{ color: C.slate, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function computeAlerts(vehicles, owners, drivers) {
  const rows = [];
  const docLabels = { visiteTechnique: "Visite technique", assuranceAuto: "Assurance auto", vignette: "Vignette", carteStationnement: "Carte de stationnement" };
  vehicles.forEach((v) => {
    Object.entries(v.documents).forEach(([key, date]) => {
      rows.push({ vehicle: v, label: docLabels[key], date, days: daysUntil(date) });
    });
    v.chauffeurIds.forEach((id) => {
      const d = drivers.find((x) => x.id === id);
      if (d) rows.push({ vehicle: v, label: `Permis — ${d.prenoms} ${d.nom}`, date: d.permisDateFin, days: daysUntil(d.permisDateFin) });
    });
  });
  return rows.sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));
}

const TOKEN_KEY = "mugetranci_token";
const AUTH_KEY = "mugetranci_auth";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function handleUnauthorized(status) {
  if (status === 401) {
    // Jeton expiré ou invalide : on force une reconnexion propre.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
  }
}

async function apiGet(path) {
  const res = await fetch(path, { headers: { ...authHeaders() } });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(`${path} a répondu ${res.status}`);
  }
  return res.json();
}
/* ============================================================
   FILE D'ATTENTE HORS-LIGNE
   Sur le terrain le reseau est souvent absent. Les creations
   (enrolements) qui echouent faute de connexion sont mises en file
   dans le navigateur, puis rejouees des le retour du reseau.
   On ne fabrique volontairement PAS d'identifiants locaux : les
   enregistrements en attente n'apparaissent dans les listes qu'une
   fois acceptes par le serveur, ce qui evite toute incoherence de
   rattachement entre vehicule, transporteur et chauffeur.
   ============================================================ */
const QUEUE_KEY = "mugetranci_queue";

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("comixci-queue"));
}
function enqueueRequest(path, body, label) {
  const items = readQueue();
  items.push({ id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, path, body, label, createdAt: new Date().toISOString() });
  writeQueue(items);
}
// Une panne reseau leve un TypeError ; une reponse HTTP (400, 500…) non.
function isNetworkError(err) {
  return err instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(err?.message || "");
}

class QueuedError extends Error {
  constructor(label) {
    super(`Pas de connexion — « ${label} » est enregistré hors-ligne et sera envoyé automatiquement au retour du réseau.`);
    this.queued = true;
  }
}

async function apiPost(path, body, queueLabel) {
  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (queueLabel && isNetworkError(err)) {
      enqueueRequest(path, body, queueLabel);
      throw new QueuedError(queueLabel);
    }
    throw err;
  }
  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${path} a répondu ${res.status}`);
  }
  return res.json();
}

/* Rejoue la file ; s'arrete a la premiere panne reseau pour preserver
   l'ordre de creation. Une requete refusee par le serveur (donnee
   invalide, doublon) est retiree de la file et signalee. */
async function flushQueue() {
  const items = readQueue();
  if (!items.length) return { sent: 0, failed: 0, offline: false };
  let sent = 0, failed = 0, offline = false, authExpired = false;
  const rest = [];
  for (let i = 0; i < items.length; i++) {
    if (offline || authExpired) { rest.push(items[i]); continue; }
    const it = items[i];
    try {
      const res = await fetch(it.path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(it.body),
      });
      if (res.ok) { sent++; continue; }
      if (res.status === 401 || res.status === 403) {
        // Jeton expire pendant la coupure : surtout ne pas jeter le travail
        // de l'agent, on garde tout en file pour une reconnexion.
        authExpired = true;
        rest.push(it);
        continue;
      }
      failed++; // refus metier (doublon, donnee invalide) : inutile de reessayer
    } catch (err) {
      if (isNetworkError(err)) { offline = true; rest.push(it); }
      else failed++;
    }
  }
  writeQueue(rest);
  return { sent, failed, offline, authExpired };
}
async function apiPatch(path, body) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${path} a répondu ${res.status}`);
  }
  return res.json();
}
async function apiDelete(path) {
  const res = await fetch(path, { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${path} a répondu ${res.status}`);
  }
  return res.json();
}

/* ============================================================
   CONNEXION — écran de login (admin COMIX-CI, commission mixte ou syndicat)
   ============================================================ */
function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Connexion impossible.");
      const { token: _t, ...authInfo } = data; // tout ce que le serveur renvoie sert de contexte d'authentification
      onLogin(data.token, authInfo);
    } catch (err) {
      setError(err.message || "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="font-body flex items-center justify-center" style={{ minHeight: "100vh", background: C.cream }}>
      <style>{FONTS}</style>
      <form onSubmit={handleSubmit} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 32, width: 380, maxWidth: "92vw", position: "relative", overflow: "hidden", boxShadow: "0 10px 32px rgba(11,110,79,0.10)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${C.orange} 0%, ${C.orange} 33%, #fff 33%, #fff 66%, ${C.green} 66%)` }} />
        <div className="flex flex-col items-center mb-6">
          <div style={{ width: 46, height: 46, borderRadius: 13, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, boxShadow: `0 5px 14px ${C.orange}55` }}>
            <Car size={22} color="#fff" />
          </div>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: -0.5 }}>COMIX-CI</div>
          <div className="text-xs text-center mt-1" style={{ color: C.slate }}>Commissions Mixtes de Côte d'Ivoire</div>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Identifiant (administrateur, commission mixte ou collectif)">
            <TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="07 08 12 34 56" autoFocus />
          </Field>
          <Field label="Code PIN">
            <TextInput
              value={pin}
              type="password"
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
          </Field>
        </div>

        {error && <p className="font-body text-xs mt-3" style={{ color: C.red }}>{error}</p>}

        <button
          type="submit"
          disabled={!login || !pin || busy}
          className="font-body text-sm font-semibold w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg mt-5"
          style={{ background: login && pin && !busy ? C.green : "#B9C4BE", color: "#fff", cursor: login && pin && !busy ? "pointer" : "not-allowed" }}
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>

        <p className="font-body text-center" style={{ fontSize: 10.5, color: C.slate, marginTop: 18, letterSpacing: 0.2 }}>
          © {new Date().getFullYear()} <strong style={{ color: C.ink, fontWeight: 700 }}>ORZAYAH SOLUTIONS</strong>
        </p>
      </form>
    </div>
  );
}

/* ============================================================
   INTERFACE MOBILE DEDIEE — deux menus : Ajout et Recherche.
   Reutilise entierement l'etat et les actions du tableau de bord ;
   seule la presentation change. Typographie grasse, grandes zones
   tactiles, palette CI (orange / vert / blanc).
   ============================================================ */
/* Choix de l'interface.
   Par defaut la bascule est automatique sous 1024 px, mais on peut la
   forcer par l'adresse :
     /mobile   ou  ?mobile=1   -> interface mobile, quelle que soit la taille
     ?mobile=0                 -> tableau de bord complet
   Le choix est memorise : pratique pour les agents a qui l'on transmet le
   lien mobile, et pour l'APK dont c'est le point d'entree. */
const VIEW_KEY = "mugetranci_view";

// Sous-domaines dedies a l'interface d'enrolement (ex. m.comix-ci.com).
// Le domaine principal garde la bascule automatique par taille d'ecran.
const MOBILE_HOSTS = ["m.", "mobile.", "enrolement."];

function resolveForcedView() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/\/+$/, "");
  const host = window.location.hostname.toLowerCase();
  const surSousDomaineMobile = MOBILE_HOSTS.some((p) => host.startsWith(p));

  let forced = null;
  if (surSousDomaineMobile || path === "/mobile" || params.get("mobile") === "1") forced = "mobile";
  else if (params.get("mobile") === "0") forced = "desktop";

  if (forced) {
    localStorage.setItem(VIEW_KEY, forced);
    // On nettoie l'adresse pour ne pas la trainer dans la navigation.
    if (params.has("mobile")) {
      params.delete("mobile");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    return forced;
  }
  return localStorage.getItem(VIEW_KEY);
}

function useIsMobile(breakpoint = 1024) {
  const forced = React.useMemo(() => resolveForcedView(), []);
  const [isMobile, setIsMobile] = React.useState(
    forced ? forced === "mobile" : (typeof window !== "undefined" ? window.innerWidth < breakpoint : false)
  );
  React.useEffect(() => {
    if (forced) return; // choix explicite : on ne suit plus la taille d'ecran
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint, forced]);
  return isMobile;
}

/* Permet de revenir a l'autre interface depuis l'application. */
function switchView(target) {
  localStorage.setItem(VIEW_KEY, target);
  window.location.href = "/";
}

function SyncBanner({ count, syncing, onSync, compact }) {
  if (!count) return null;
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{ background: C.amberLight, border: `1px solid ${C.amber}`, borderRadius: 12, padding: compact ? "10px 12px" : "12px 16px", marginBottom: 12 }}
    >
      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
        <AlertTriangle size={17} color={C.amber} style={{ flexShrink: 0 }} />
        <span className="font-body" style={{ fontSize: 12.5, fontWeight: 700, color: C.amber }}>
          {count} enrôlement{count > 1 ? "s" : ""} en attente d'envoi
        </span>
      </div>
      <button
        onClick={onSync}
        disabled={syncing}
        className="font-body"
        style={{ fontSize: 12, fontWeight: 800, padding: "7px 12px", borderRadius: 9, background: syncing ? "#D8B48A" : C.orange, color: "#fff", flexShrink: 0 }}
      >
        {syncing ? "Envoi…" : "Synchroniser"}
      </button>
    </div>
  );
}

/* ============================================================
   INVITE D'INSTALLATION
   Tant que l'application est simplement ouverte dans le navigateur,
   celui-ci impose sa barre d'adresse. Une fois installee (WebAPK sur
   Android, ecran d'accueil sur iOS), elle s'ouvre en plein ecran.
   On propose donc l'installation au lieu de la laisser cachee dans le
   menu du navigateur.
   ============================================================ */
function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installe, setInstalle] = useState(false);

  React.useEffect(() => {
    const dejaInstalle = window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    setInstalle(dejaInstalle);

    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e); };
    const onInstalled = () => { setInstalle(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const estIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installer = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };
  return { peutInstaller: !!promptEvent, installe, estIOS, installer };
}

function InstallBanner() {
  const { peutInstaller, installe, estIOS, installer } = useInstallPrompt();
  const [masque, setMasque] = useState(false);
  if (installe || masque) return null;
  if (!peutInstaller && !estIOS) return null;

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderLeft: `6px solid ${C.green}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div className="flex items-start justify-between gap-2">
        <div style={{ minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 14.5, fontWeight: 800, color: C.ink }}>Installer l'application</div>
          <div className="font-body" style={{ fontSize: 12.5, color: C.slate, fontWeight: 600, marginTop: 2 }}>
            {estIOS
              ? "Dans Safari : bouton Partager, puis « Sur l'écran d'accueil ». L'adresse du site disparaît et l'application s'ouvre en plein écran."
              : "Elle s'ouvrira en plein écran, sans la barre d'adresse du navigateur, et fonctionnera hors connexion."}
          </div>
        </div>
        <button onClick={() => setMasque(true)} style={{ color: C.slate, flexShrink: 0 }} title="Masquer"><X size={16} /></button>
      </div>
      {peutInstaller && (
        <button
          onClick={installer}
          className="w-full font-body flex items-center justify-center gap-2 mt-3"
          style={{ background: C.green, color: "#fff", fontSize: 14, fontWeight: 800, padding: "11px 0", borderRadius: 11, boxShadow: `0 4px 12px ${C.green}55` }}
        >
          <Plus size={17} /> Installer maintenant
        </button>
      )}
    </div>
  );
}

function MobileTile({ icon, label, hint, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
      style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderLeft: `6px solid ${accent}`, borderRadius: 16, padding: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 10px rgba(11,110,79,0.06)" }}
    >
      <div style={{ width: 52, height: 52, borderRadius: 15, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${accent}55` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-display" style={{ fontSize: 17.5, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>{label}</div>
        <div className="font-body" style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>{hint}</div>
      </div>
      <ChevronRight size={20} color={accent} strokeWidth={2.5} />
    </button>
  );
}

function MobileField({ label, value, mono }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
      <div className="font-body" style={{ fontSize: 12, color: C.slate, fontWeight: 600 }}>{label}</div>
      <div className={mono ? "font-mono" : "font-body"} style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 1, wordBreak: "break-word", letterSpacing: mono ? 0.2 : -0.1 }}>{value || "—"}</div>
    </div>
  );
}

function MobileSectionTitle({ icon, children, accent }) {
  return (
    <div className="flex items-center gap-2" style={{ marginTop: 18, marginBottom: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: accent || C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div className="font-display" style={{ fontSize: 15.5, fontWeight: 800, color: C.ink, letterSpacing: -0.2 }}>{children}</div>
    </div>
  );
}

/* Sections reutilisables — chacune n'affiche QUE son domaine. */
function MobileVehiculeSection({ v }) {
  if (!v) return <p className="font-body text-sm" style={{ color: C.slate, padding: "12px 0" }}>Aucun véhicule rattaché.</p>;
  const docs = v.documents || {};
  return (
    <>
      <MobileSectionTitle icon={<Car size={15} />}>Véhicule</MobileSectionTitle>
      <MobileField label="Immatriculation" value={v.immatriculation} mono />
      <MobileField label="N° carte grise" value={v.carteGrise} mono />
      <MobileField label="Marque / Modèle" value={[v.marque, v.modele].filter(Boolean).join(" ") || "—"} />
      <MobileField label="Catégorie" value={v.categorie} />
      <MobileField label="Nombre de places" value={v.nombrePlaces} />
      <MobileField label="N° châssis" value={v.chassis} mono />
      <MobileField label="Nom sur la carte grise" value={v.nomCarteGrise} />
      <MobileField label="1ère mise en circulation" value={v.dateMiseCirculation ? fmt(v.dateMiseCirculation) : "—"} />
      <MobileSectionTitle icon={<FileText size={15} />} accent={C.orangeDark}>Documents</MobileSectionTitle>
      {[["Visite technique", docs.visiteTechnique], ["Assurance auto", docs.assuranceAuto], ["Vignette", docs.vignette], ["Carte de stationnement", docs.carteStationnement]].map(([lab, d]) => {
        const s = statusOf(d);
        return (
          <div key={lab} className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div className="font-body" style={{ fontSize: 12, color: C.slate, fontWeight: 600 }}>{lab}</div>
              <div className="font-body" style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: -0.1 }}>{d ? fmt(d) : "—"}</div>
            </div>
            <Badge status={s} small />
          </div>
        );
      })}
    </>
  );
}

function MobileTransporteurSection({ owner }) {
  if (!owner) return <p className="font-body text-sm" style={{ color: C.slate, padding: "12px 0" }}>Aucun transporteur rattaché à ce dossier.</p>;
  return (
    <>
      <MobileSectionTitle icon={<User size={15} />} accent={C.orangeDark}>Transporteur</MobileSectionTitle>
      <div className="flex items-center gap-3" style={{ padding: "10px 0" }}>
        <div style={{ width: 54, height: 54, borderRadius: 999, overflow: "hidden", background: C.cream, border: `2px solid ${C.border}`, flexShrink: 0 }}>
          {owner.photo ? <img src={owner.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-bold" style={{ color: C.slate }}>{initials(owner.nom, owner.prenoms)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>{owner.prenoms} {owner.nom}</div>
          <div className="font-body" style={{ fontSize: 12.5, color: C.slate }}>{[owner.quartier, owner.ville].filter(Boolean).join(", ") || "Résidence non renseignée"}</div>
        </div>
      </div>
      <MobileField label="N° CNI" value={owner.cni} mono />
      <MobileField label="N° permis" value={owner.numeroPermis} mono />
      <MobileField label="Téléphone" value={[owner.contact1, owner.contact2, owner.contact3].filter(Boolean).join(" · ")} mono />
      <MobileField label="Email" value={owner.email} />
      <MobileField label="Commune" value={owner.commune} />
      <MobileField label="Résidence" value={[owner.quartier, owner.ville].filter(Boolean).join(", ")} />
    </>
  );
}

function MobileChauffeursSection({ drivers }) {
  if (!drivers.length) return <p className="font-body text-sm" style={{ color: C.slate, padding: "12px 0" }}>Aucun chauffeur rattaché.</p>;
  return (
    <>
      <MobileSectionTitle icon={<Users size={15} />}>Chauffeur{drivers.length > 1 ? "s" : ""} ({drivers.length})</MobileSectionTitle>
      {drivers.map((d) => (
        <div key={d.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3 mb-1.5">
            <div style={{ width: 44, height: 44, borderRadius: 999, overflow: "hidden", background: C.cream, border: `2px solid ${C.border}`, flexShrink: 0 }}>
              {d.photo ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-bold text-xs" style={{ color: C.slate }}>{initials(d.nom, d.prenoms)}</div>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="font-display" style={{ fontSize: 15.5, fontWeight: 800, color: C.ink }}>{d.prenoms} {d.nom}</div>
              <div className="font-mono" style={{ fontSize: 11.5, fontWeight: 700, color: C.greenDark }}>{d.numeroCarte || "—"}</div>
            </div>
          </div>
          <div className="font-body" style={{ fontSize: 12.5, color: C.slate }}>CNI {d.cni} · Permis {d.permisNumero}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-body" style={{ fontSize: 12.5, color: C.slate }}>{d.contact1 || "—"}</span>
            <Badge status={statusOf(d.permisDateFin)} small />
          </div>
        </div>
      ))}
    </>
  );
}

function MobileElementSection({ el, syndicats }) {
  if (!el) return null;
  const syn = syndicats.find((s) => s.id === el.syndicatId);
  return (
    <>
      <MobileSectionTitle icon={<BadgeCheck size={15} />}>Élément (agent administratif)</MobileSectionTitle>
      <div className="flex items-center gap-3" style={{ padding: "10px 0" }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, overflow: "hidden", background: C.cream, border: `2px solid ${C.border}`, flexShrink: 0 }}>
          {el.photo ? <img src={el.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-bold" style={{ color: C.slate }}>{initials(el.nom, el.prenoms)}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>{el.prenoms} {el.nom}</div>
          <div className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{el.numeroCarte || "—"}</div>
        </div>
      </div>
      <MobileField label="Fonction / Poste" value={el.fonction} />
      <MobileField label="Association" value={syn ? (syn.sigle || syn.nom) : "—"} />
      <MobileField label="N° CNI" value={el.cni} mono />
      <MobileField label="Téléphone" value={[el.contact1, el.contact2, el.contact3].filter(Boolean).join(" · ")} mono />
      <MobileField label="Email" value={el.email} />
      <MobileField label="Commune" value={el.commune} />
    </>
  );
}

/* Vue detail : un dossier (vehicule + transporteur + chauffeurs) ou un element,
   avec navigation par section. */
function MobileDetail({ result, vehicles, owners, drivers, syndicats, commissionsMixtes, associations, onCard, onBack }) {
  const [section, setSection] = useState(result.kind === "element" ? "element" : "complete");

  const v = result.kind === "vehicule" ? result.item
    : result.kind === "transporteur" ? vehicles.find((x) => x.proprietaireId === result.item.id)
    : result.kind === "chauffeur" ? vehicles.find((x) => x.chauffeurIds.includes(result.item.id))
    : null;
  const owner = result.kind === "transporteur" ? result.item : (v ? owners.find((o) => o.id === v.proprietaireId) : null);
  const vDrivers = result.kind === "chauffeur" ? [result.item] : (v ? v.chauffeurIds.map((id) => drivers.find((d) => d.id === id)).filter(Boolean) : []);
  const el = result.kind === "element" ? result.item : null;

  const tabs = el
    ? [{ key: "element", label: "Élément" }]
    : [
        { key: "vehicule", label: "Véhicule" },
        { key: "transporteur", label: "Transporteur" },
        { key: "chauffeurs", label: "Chauffeurs" },
        { key: "complete", label: "Tout" },
      ];

  const title = el ? `${el.prenoms} ${el.nom}`
    : owner ? `${owner.prenoms} ${owner.nom}`
    : v ? v.immatriculation
    : vDrivers[0] ? `${vDrivers[0].prenoms} ${vDrivers[0].nom}` : "Dossier";

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: C.cream, paddingTop: 8, paddingBottom: 8 }}>
        <button onClick={onBack} className="font-body flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>
          <ChevronLeft size={18} /> Retour
        </button>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: -0.8, lineHeight: 1.05, minWidth: 0 }}>{title}</h2>
          {(() => {
            const cardTarget = el ? { m: el, cat: "element" }
              : result.kind === "chauffeur" ? { m: result.item, cat: "chauffeur" }
              : owner ? { m: owner, cat: "transporteur" } : null;
            if (!cardTarget) return null;
            return (
              <button
                onClick={() => onCard(cardTarget.m, cardTarget.cat)}
                className="font-body flex items-center gap-1.5 px-3 py-2 rounded-lg"
                style={{ background: C.green, color: "#fff", fontSize: 12.5, fontWeight: 800, flexShrink: 0 }}
              >
                <CreditCard size={15} /> Carte
              </button>
            );
          })()}
        </div>
        {(() => {
          const num = el ? el.numeroCarte
            : result.kind === "chauffeur" ? result.item.numeroCarte
            : owner ? owner.carteTransporteurNumero : null;
          const cat = el ? "Élément" : result.kind === "chauffeur" ? "Chauffeur" : owner ? "Transporteur" : "Dossier";
          return (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-body" style={{ fontSize: 12.5, fontWeight: 700, color: C.greenDark, background: C.greenLight, padding: "3px 9px", borderRadius: 6 }}>{cat}</span>
              {num && <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: C.orangeDark, letterSpacing: 0.4 }}>{num}</span>}
            </div>
          );
        })()}

        <div className="flex gap-1.5 mt-3" style={{ overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSection(t.key)}
              className="font-body"
              style={{
                whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 700, padding: "8px 11px", borderRadius: 999,
                background: section === t.key ? C.green : "#fff",
                color: section === t.key ? "#fff" : C.ink,
                border: `1.5px solid ${section === t.key ? C.green : C.border}`,
                boxShadow: section === t.key ? `0 3px 10px ${C.green}44` : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: "4px 16px 16px", marginTop: 10 }}>
        {section === "element" && <MobileElementSection el={el} syndicats={syndicats} />}
        {section === "vehicule" && <MobileVehiculeSection v={v} />}
        {section === "transporteur" && <MobileTransporteurSection owner={owner} />}
        {section === "chauffeurs" && <MobileChauffeursSection drivers={vDrivers} />}
        {section === "complete" && (
          <>
            <MobileTransporteurSection owner={owner} />
            <MobileVehiculeSection v={v} />
            <MobileChauffeursSection drivers={vDrivers} />
          </>
        )}
      </div>
    </div>
  );
}

function MobileView({
  auth, onLogout, vehicles, owners, drivers, elements, syndicats, commissionsMixtes, associations, onCard, queueCount, syncing, onSync,
  setShowForm, setShowMemberFormFor, setShowDriverFormFor, setShowElementFormFor,
  setShowProfileForm,
}) {
  const [tab, setTab] = useState("ajout");
  const [q, setQ] = useState("");
  const [critere, setCritere] = useState("nom");
  const [communeF, setCommuneF] = useState("");
  const [selected, setSelected] = useState(null);

  const query = q.trim().toLowerCase();
  const match = (...vals) => vals.filter(Boolean).join(" ").toLowerCase().includes(query);

  // 1er filtre : la commune reduit le volume a parcourir.
  const sameCommune = (x) => !communeF || COMMUNE_EQ(x.commune, communeF);
  const vehiculesF = vehicles.filter(sameCommune);
  const ownersF = owners.filter(sameCommune);
  const driversF = drivers.filter(sameCommune);
  const elementsF = elements.filter(sameCommune);

  // 2e filtre : le critere determine les champs interroges — et donc
  // quelles categories sont pertinentes.
  const chercheVehicule = critere === "chassis" || critere === "immatriculation";
  const results = !query ? [] : (
    chercheVehicule
      ? vehiculesF
          .filter((v) => critere === "chassis" ? match(v.chassis, v.carteGrise) : match(v.immatriculation))
          .map((v) => ({ kind: "vehicule", item: v, title: v.immatriculation, sub: [v.marque, v.modele].filter(Boolean).join(" ") || "Véhicule" }))
      : [
          ...ownersF
            .filter((o) => critere === "nom" ? match(o.nom, o.prenoms) : match(o.contact1, o.contact2, o.contact3))
            .map((o) => ({ kind: "transporteur", item: o, title: `${o.prenoms} ${o.nom}`, sub: o.carteTransporteurNumero || "Transporteur" })),
          ...driversF
            .filter((d) => critere === "nom" ? match(d.nom, d.prenoms) : match(d.contact1, d.contact2, d.contact3))
            .map((d) => ({ kind: "chauffeur", item: d, title: `${d.prenoms} ${d.nom}`, sub: d.numeroCarte || "Chauffeur" })),
          ...elementsF
            .filter((e) => critere === "nom" ? match(e.nom, e.prenoms) : match(e.contact1, e.contact2, e.contact3))
            .map((e) => ({ kind: "element", item: e, title: `${e.prenoms} ${e.nom}`, sub: e.fonction || "Élément" })),
        ]
  );

  const CRITERES = [
    { key: "nom", label: "Nom complet", ph: "Ex. Moussa KONE" },
    { key: "telephone", label: "Téléphone", ph: "Ex. 0555622208" },
    { key: "chassis", label: "N° châssis", ph: "Ex. JT731HB09" },
    { key: "immatriculation", label: "Immatriculation", ph: "Ex. 9186 HZ 01" },
  ];
  const critereActif = CRITERES.find((x) => x.key === critere);
  const totalCommune = communeF ? vehiculesF.length + ownersF.length + driversF.length + elementsF.length : null;

  const kindMeta = {
    vehicule: { icon: <Car size={18} />, color: C.green, label: "Véhicule" },
    transporteur: { icon: <User size={18} />, color: C.orangeDark, label: "Transporteur" },
    chauffeur: { icon: <Users size={18} />, color: C.greenDark, label: "Chauffeur" },
    element: { icon: <BadgeCheck size={18} />, color: C.ink, label: "Élément" },
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.cream, display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* EN-TETE */}
      <header className="comix-safe-top" style={{ background: `linear-gradient(135deg, ${C.greenDark} 0%, ${C.green} 100%)`, padding: "18px 18px 22px", position: "relative" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg, ${C.orange} 0%, ${C.orange} 50%, #fff 50%, #fff 100%)` }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Car size={19} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="font-display" style={{ color: "#fff", fontSize: 18, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.3 }}>COMIX-CI</div>
              <div className="font-body" style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.nom}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!MOBILE_HOSTS.some((p) => window.location.hostname.toLowerCase().startsWith(p)) && (
              <button onClick={() => switchView("desktop")} style={{ color: "rgba(255,255,255,0.85)" }} title="Passer à la version bureau"><Home size={19} /></button>
            )}
            <button onClick={() => setShowProfileForm(true)} style={{ color: "rgba(255,255,255,0.85)" }} title="Mon profil"><Settings size={19} /></button>
            <button onClick={onLogout} style={{ color: "rgba(255,255,255,0.85)" }} title="Déconnexion"><LogOut size={19} /></button>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, padding: "16px 16px 0" }}>
        {selected ? (
          <MobileDetail result={selected} vehicles={vehicles} owners={owners} drivers={drivers} syndicats={syndicats} commissionsMixtes={commissionsMixtes} associations={associations} onCard={onCard} onBack={() => setSelected(null)} />
        ) : tab === "ajout" ? (
          <div style={{ paddingBottom: 90 }}>
            <InstallBanner />
            <SyncBanner count={queueCount} syncing={syncing} onSync={onSync} compact />
            <h2 className="font-display" style={{ fontSize: 25, fontWeight: 800, color: C.ink, letterSpacing: -0.6 }}>Nouvel enrôlement</h2>
            <div style={{ width: 52, height: 4, borderRadius: 999, background: `linear-gradient(90deg, ${C.orange}, ${C.green})`, margin: "6px 0 8px" }} />
            <p className="font-body" style={{ fontSize: 13.5, color: C.slate, marginBottom: 16, fontWeight: 600 }}>Choisissez ce que vous souhaitez enregistrer.</p>
            <div className="flex flex-col gap-3">
              <MobileTile icon={<Car size={24} />} accent={C.green} label="Véhicule" hint="Carte grise et immatriculation suffisent" onClick={() => setShowForm(true)} />
              <MobileTile icon={<User size={24} />} accent={C.orangeDark} label="Transporteur" hint="Propriétaire du véhicule" onClick={() => setShowMemberFormFor(true)} />
              <MobileTile icon={<Users size={24} />} accent={C.greenDark} label="Chauffeur" hint="Conducteur rattaché à un véhicule" onClick={() => setShowDriverFormFor(true)} />
              <MobileTile icon={<BadgeCheck size={24} />} accent={C.ink} label="Élément" hint="Agent administratif d'une association" onClick={() => setShowElementFormFor(true)} />
            </div>
          </div>
        ) : (
          <div style={{ paddingBottom: 90 }}>
            <h2 className="font-display" style={{ fontSize: 25, fontWeight: 800, color: C.ink, letterSpacing: -0.6 }}>Recherche</h2>
            <div style={{ width: 52, height: 4, borderRadius: 999, background: `linear-gradient(90deg, ${C.green}, ${C.orange})`, margin: "6px 0 8px" }} />
            <p className="font-body" style={{ fontSize: 13.5, color: C.slate, marginBottom: 12, fontWeight: 600 }}>Choisissez la commune, puis le critère de recherche.</p>

            {/* 1 — Commune */}
            <div className="flex items-center gap-2" style={{ marginBottom: 7 }}>
              <span className="font-display" style={{ width: 21, height: 21, borderRadius: 999, background: C.green, color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Commune</span>
            </div>
            <select
              value={communeF}
              onChange={(e) => setCommuneF(e.target.value)}
              className="font-body"
              style={{ width: "100%", height: 50, borderRadius: 14, border: `1.5px solid ${communeF ? C.green : C.border}`, background: "#fff", padding: "0 12px", fontSize: 15.5, fontWeight: 700, color: C.ink }}
            >
              <option value="">Toutes les communes</option>
              {COMMUNES.map((cm) => <option key={cm} value={cm}>{cm}</option>)}
            </select>
            {communeF && (
              <p className="font-body" style={{ fontSize: 12, color: C.slate, marginTop: 5 }}>
                {totalCommune} enregistrement{totalCommune > 1 ? "s" : ""} dans cette commune.
              </p>
            )}

            {/* 2 — Critere */}
            <div className="flex items-center gap-2" style={{ margin: "18px 0 7px" }}>
              <span className="font-display" style={{ width: 21, height: 21, borderRadius: 999, background: C.orange, color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Critère de recherche</span>
            </div>
            <div className="comix-grid-2 gap-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {CRITERES.map((cr) => (
                <button
                  key={cr.key}
                  onClick={() => setCritere(cr.key)}
                  className="font-body"
                  style={{
                    fontSize: 13.5, fontWeight: 700, padding: "12px 8px", borderRadius: 10,
                    background: critere === cr.key ? C.orange : "#fff",
                    color: critere === cr.key ? "#fff" : C.slate,
                    border: `1.5px solid ${critere === cr.key ? C.orange : C.border}`,
                  }}
                >
                  {cr.label}
                </button>
              ))}
            </div>

            {/* 3 — Saisie */}
            <div className="flex items-center gap-2" style={{ margin: "18px 0 7px" }}>
              <span className="font-display" style={{ width: 21, height: 21, borderRadius: 999, background: C.greenDark, color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{critereActif.label}</span>
            </div>
            <div className="flex items-center gap-2 px-3" style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, height: 50 }}>
              <Search size={19} color={C.slate} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={critereActif.ph}
                inputMode={critere === "telephone" ? "tel" : "text"}
                className="font-body"
                style={{ border: "none", outline: "none", flex: 1, fontSize: 16, fontWeight: 600, background: "transparent", minWidth: 0 }}
              />
              {q && <button onClick={() => setQ("")} style={{ color: C.slate }}><X size={17} /></button>}
            </div>

            <div className="flex flex-col mt-4" style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
              {!query && (
                <p className="font-body text-center" style={{ fontSize: 13.5, color: C.slate, padding: "28px 12px" }}>
                  Saisissez {critereActif.label.toLowerCase()} pour lancer la recherche.
                </p>
              )}
              {query && results.length === 0 && (
                <p className="font-body text-center" style={{ fontSize: 13.5, color: C.slate, padding: "28px 12px" }}>
                  Aucun résultat pour « {q} ».
                </p>
              )}
              {results.map((r, i) => {
                const m = kindMeta[r.kind];
                return (
                  <button
                    key={`${r.kind}-${r.item.id}-${i}`}
                    onClick={() => setSelected(r)}
                    className="w-full text-left flex items-center gap-3"
                    style={{ background: "#fff", borderTop: i === 0 ? `1px solid ${C.border}` : "none", borderBottom: `1px solid ${C.border}`, padding: "13px 14px" }}
                  >
                    <div style={{ width: 3, alignSelf: "stretch", background: m.color, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: m.color + "18", color: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {m.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 16.5, fontWeight: 700, color: C.ink, letterSpacing: -0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                      <div className="font-body flex items-center gap-1.5" style={{ fontSize: 12.5, color: C.slate }}>
                        <span style={{ color: m.color, fontWeight: 700 }}>{m.label}</span>
                        <span style={{ width: 3, height: 3, borderRadius: 999, background: C.border }} />
                        <span className="font-mono" style={{ fontSize: 11.5 }}>{r.sub}</span>
                      </div>
                    </div>
                    <ChevronRight size={17} color={C.border} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MENTION DE PROPRIETE — au-dessus de la barre d'onglets */}
      <p className="font-body text-center" style={{ fontSize: 10, color: C.slate, padding: "0 16px 96px", letterSpacing: 0.2 }}>
        © {new Date().getFullYear()} <strong style={{ color: C.ink, fontWeight: 700 }}>ORZAYAH SOLUTIONS</strong>
      </p>

      {/* BARRE D'ONGLETS */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 30, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[["ajout", "Ajout", <Plus size={22} key="a" />], ["recherche", "Recherche", <Search size={22} key="r" />]].map(([k, lab, ic]) => (
          <button
            key={k}
            onClick={() => { setTab(k); setSelected(null); }}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ padding: "11px 0 13px", color: tab === k ? C.green : C.slate, position: "relative" }}
          >
            {tab === k && <span style={{ position: "absolute", top: 0, left: "22%", right: "22%", height: 3, borderRadius: 999, background: C.orange }} />}
            {ic}
            <span className="font-body" style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.2 }}>{lab}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
  });

  const handleLogin = (newToken, authInfo) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(AUTH_KEY, JSON.stringify(authInfo));
    setToken(newToken);
    setAuth(authInfo);
  };
  const handleLogout = () => {
    const pending = readQueue().length;
    if (pending > 0 && !window.confirm(`${pending} enrôlement(s) ne sont pas encore envoyés. Ils resteront sur cet appareil mais ne pourront être transmis qu'avec ce compte. Se déconnecter quand même ?`)) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
    setToken(null);
    setAuth(null);
  };

  if (!token || !auth) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard auth={auth} onLogout={handleLogout} />;
}

function Dashboard({ auth, onLogout }) {
  const [owners, setOwners] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [ficheVehicle, setFicheVehicle] = useState(null);
  const [cardDriver, setCardDriver] = useState(null);
  const [cardOwner, setCardOwner] = useState(null);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState([]);
  const [cardElement, setCardElement] = useState(null);
  const [selectedElementIds, setSelectedElementIds] = useState([]);
  const [elements, setElements] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [showElementFormFor, setShowElementFormFor] = useState(false);
  const [agentsList, setAgentsList] = useState([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [showAgentFormFor, setShowAgentFormFor] = useState(false);
  const [assoFormForCollectif, setAssoFormForCollectif] = useState(null);
  const [editAsso, setEditAsso] = useState(null);
  const [showOwnersArchive, setShowOwnersArchive] = useState(false);
  const [showDriversArchive, setShowDriversArchive] = useState(false);
  const [showElementsArchive, setShowElementsArchive] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [showDriverFormFor, setShowDriverFormFor] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [editElement, setEditElement] = useState(null);
  const [cardFace, setCardFace] = useState("recto");
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [achats, setAchats] = useState([]);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [commissionsMixtes, setCommissionsMixtes] = useState([]);
  const [syndicats, setSyndicats] = useState([]);
  const [garesRoutieres, setGaresRoutieres] = useState([]);
  const [showGareRoutiereFormFor, setShowGareRoutiereFormFor] = useState(null); // syndicatId
  const [editGareRoutiere, setEditGareRoutiere] = useState(null);
  const [showMemberFormFor, setShowMemberFormFor] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const [queueCount, setQueueCount] = useState(readQueue().length);
  const [syncing, setSyncing] = useState(false);

  React.useEffect(() => {
    const refresh = () => setQueueCount(readQueue().length);
    window.addEventListener("comixci-queue", refresh);
    window.addEventListener("online", doSync);
    return () => {
      window.removeEventListener("comixci-queue", refresh);
      window.removeEventListener("online", doSync);
    };
  });

  const doSync = async () => {
    if (syncing || readQueue().length === 0) return;
    setSyncing(true);
    try {
      const { sent, failed, offline, authExpired } = await flushQueue();
      setQueueCount(readQueue().length);
      if (sent > 0) {
        const data = await apiGet("/api/bootstrap");
        setOwners(data.proprietaires); setDrivers(data.chauffeurs); setElements(data.elements);
        setVehicles(data.vehicules); setAchats(data.carburant);
        setCommissionsMixtes(data.commissionsMixtes); setSyndicats(data.syndicats);
        setGaresRoutieres(data.garesRoutieres); setLignes(data.lignes);
        setAffectations(data.affectations); setAssociations(data.associations || []);
      }
      if (authExpired) alert("Votre session a expiré pendant la coupure. Reconnectez-vous : vos enrôlements restent en attente et seront envoyés ensuite.");
      else if (failed > 0) alert(`${failed} enregistrement(s) en attente ont été refusés par le serveur (doublon ou donnée invalide) et retirés de la file.`);
      else if (offline) alert("Toujours hors-ligne — les enregistrements restent en attente.");
    } catch (err) {
      console.error("sync:", err);
    } finally { setSyncing(false); }
  };
  const [lignes, setLignes] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [showSyndicatFormFor, setShowSyndicatFormFor] = useState(null); // commissionMixteId
  const [ligneFormGareId, setLigneFormGareId] = useState(null);
  const [editCommission, setEditCommission] = useState(null);
  const [editSyndicat, setEditSyndicat] = useState(null);
  const [editLigne, setEditLigne] = useState(null);
  const [reassignVehicle, setReassignVehicle] = useState(null);
  const [editVehicle, setEditVehicle] = useState(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [onlyExpiredFilter, setOnlyExpiredFilter] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet("/api/bootstrap");
        if (cancelled) return;
        const { proprietaires: o, chauffeurs: d, elements: el, vehicules: v, carburant: ac, commissionsMixtes: cm, syndicats: sy, garesRoutieres: gr, lignes: li, affectations: af, associations: asso } = data;
        setOwners(o);
        setDrivers(d);
        setElements(el);
        setAssociations(asso || []);
        setVehicles(v);
        setAchats(ac);
        setCommissionsMixtes(cm);
        setSyndicats(sy);
        setGaresRoutieres(gr);
        setLignes(li);
        setAffectations(af);

        const params = new URLSearchParams(window.location.search);

        // Ouvre automatiquement la fiche si l'URL contient ?vehicule=ID
        // (c'est ce lien que le QR code de la fiche encode).
        const vehiculeId = params.get("vehicule");
        if (vehiculeId) {
          const match = v.find((vv) => vv.id === vehiculeId);
          if (match) setFicheVehicle(match);
        }

        // Ouvre automatiquement la fiche du véhicule d'un transporteur si
        // l'URL contient ?transporteur=ID (QR du recto de la carte membre).
        const transporteurId = params.get("transporteur");
        if (transporteurId) {
          const match = v.find((vv) => vv.proprietaireId === transporteurId);
          if (match) setFicheVehicle(match);
        }

        // Ouvre automatiquement la carte de membre si l'URL contient
        // ?carte=ID&face=paiement|carburant (les 2 QR codes de la carte).
        const carteId = params.get("carte");
        if (carteId) {
          const match = d.find((dd) => dd.id === carteId);
          if (match) {
            setCardDriver(match);
            setCardFace(params.get("face") === "paiement" ? "verso" : "recto");
          }
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Impossible de charger les données depuis la base.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (page === "agents" && !agentsLoaded && (auth.role === "admin" || auth.role === "commission_mixte" || auth.role === "syndicat")) {
      loadAgents().catch((err) => console.error("loadAgents:", err));
    }
  }, [page, agentsLoaded]);

  const openFiche = (v) => {
    setFicheVehicle(v);
    window.history.pushState({}, "", `?vehicule=${v.id}`);
  };
  const closeFiche = () => {
    setFicheVehicle(null);
    window.history.pushState({}, "", window.location.pathname);
  };

  const openCard = (d) => {
    setCardDriver(d);
    setCardFace("recto");
    window.history.pushState({}, "", `?carte=${d.id}&face=carburant`);
  };
  const closeCard = () => {
    setCardDriver(null);
    window.history.pushState({}, "", window.location.pathname);
  };

  const toggleDriverSelection = (id) => {
    setSelectedDriverIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const alerts = useMemo(() => computeAlerts(vehicles, owners, drivers), [vehicles, owners, drivers]);
  const critical = alerts.filter((a) => a.days !== null && a.days <= 30);

  // Chaque fonction écrit d'abord en base (Neon), puis synchronise l'état local
  // avec l'enregistrement réel renvoyé par le serveur (id, valeurs par défaut…).
  const addOwner = async (o) => {
    const created = await apiPost("/api/proprietaires", o, `Transporteur ${o.prenoms || ""} ${o.nom || ""}`.trim());
    setOwners((s) => [...s, created]);
    return created;
  };
  const addDriver = async (d) => {
    const created = await apiPost("/api/chauffeurs", d, `Chauffeur ${d.prenoms || ""} ${d.nom || ""}`.trim());
    setDrivers((s) => [...s, created]);
    return created;
  };
  const updateDriverPhoto = async (driverId, photoDataUrl) => {
    const updated = await apiPatch(`/api/chauffeurs?id=${driverId}`, { photo: photoDataUrl });
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
  };
  const updateDriverQr = async (driverId, qrDataUrl) => {
    const updated = await apiPatch(`/api/chauffeurs?id=${driverId}`, { qrPaiement: qrDataUrl });
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
  };
  const updateDriver = async (driverId, payload) => {
    const updated = await apiPatch(`/api/chauffeurs?id=${driverId}`, payload);
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
    return updated;
  };
  const deleteDriver = async (driverId) => {
    await apiDelete(`/api/chauffeurs?id=${driverId}`);
    setDrivers((s) => s.filter((d) => d.id !== driverId));
  };
  const updateOwnerPhoto = async (ownerId, photoDataUrl) => {
    const updated = await apiPatch(`/api/proprietaires?id=${ownerId}`, { photo: photoDataUrl });
    setOwners((s) => s.map((o) => (o.id === ownerId ? updated : o)));
  };
  const updateOwner = async (ownerId, payload) => {
    const updated = await apiPatch(`/api/proprietaires?id=${ownerId}`, payload);
    setOwners((s) => s.map((o) => (o.id === ownerId ? updated : o)));
    return updated;
  };
  const deleteOwner = async (ownerId) => {
    await apiDelete(`/api/proprietaires?id=${ownerId}`);
    setOwners((s) => s.filter((o) => o.id !== ownerId));
  };
  const addElement = async (payload) => {
    const created = await apiPost("/api/elements", payload, `Élément ${payload.prenoms || ""} ${payload.nom || ""}`.trim());
    setElements((s) => [...s, created]);
    return created;
  };
  const updateElement = async (elementId, payload) => {
    const updated = await apiPatch(`/api/elements?id=${elementId}`, payload);
    setElements((s) => s.map((e) => (e.id === elementId ? updated : e)));
    return updated;
  };
  const deleteElement = async (elementId) => {
    await apiDelete(`/api/elements?id=${elementId}`);
    setElements((s) => s.filter((e) => e.id !== elementId));
  };
  const addAssociation = async (payload) => {
    const created = await apiPost("/api/syndicats?resource=associations", payload);
    setAssociations((s) => [...s, created]);
    return created;
  };
  const updateAssociation = async (assoId, payload) => {
    const updated = await apiPatch(`/api/syndicats?resource=associations&id=${assoId}`, payload);
    setAssociations((s) => s.map((a) => (a.id === assoId ? updated : a)));
    return updated;
  };
  const deleteAssociation = async (assoId) => {
    await apiDelete(`/api/syndicats?resource=associations&id=${assoId}`);
    setAssociations((s) => s.filter((a) => a.id !== assoId));
  };
  const loadAgents = async () => {
    const rows = await apiGet("/api/agents");
    setAgentsList(rows);
    setAgentsLoaded(true);
  };
  const addAgent = async (payload) => {
    const created = await apiPost("/api/agents", payload);
    setAgentsList((s) => [...s, created]);
    return created;
  };
  const updateAgent = async (agentId, payload) => {
    const updated = await apiPatch(`/api/agents?id=${agentId}`, payload);
    setAgentsList((s) => s.map((a) => (a.id === agentId ? updated : a)));
    return updated;
  };
  const deleteAgent = async (agentId) => {
    await apiDelete(`/api/agents?id=${agentId}`);
    setAgentsList((s) => s.filter((a) => a.id !== agentId));
  };
  const updateVehiclePhoto = async (vehiculeId, photoDataUrl) => {
    const updated = await apiPatch(`/api/vehicules?id=${vehiculeId}`, { photo: photoDataUrl });
    // La route renvoie une forme "plate" (sans documents/chauffeurIds imbriqués) :
    // on ne fusionne que la photo pour ne pas perdre le reste de l'objet local.
    setVehicles((s) => s.map((v) => (v.id === vehiculeId ? { ...v, photo: updated.photo } : v)));
  };
  const updateVehicle = async (vehiculeId, payload) => {
    const updated = await apiPatch(`/api/vehicules?id=${vehiculeId}`, payload);
    setVehicles((s) => s.map((v) => (v.id === vehiculeId
      ? { ...v, ...updated, documents: { ...v.documents, ...(payload.documents || {}) } }
      : v)));
    return updated;
  };
  const deleteVehicle = async (vehiculeId) => {
    await apiDelete(`/api/vehicules?id=${vehiculeId}`);
    setVehicles((s) => s.filter((v) => v.id !== vehiculeId));
  };
  const addAchat = async (payload) => {
    const created = await apiPost("/api/vehicules?resource=carburant", payload);
    setAchats((s) => [created, ...s]);
    return created;
  };
  const addCommission = async (payload) => {
    const created = await apiPost("/api/commissions-mixtes", payload);
    setCommissionsMixtes((s) => [...s, created]);
    return created;
  };
  const updateCommission = async (commissionId, payload) => {
    const updated = await apiPatch(`/api/commissions-mixtes?id=${commissionId}`, payload);
    setCommissionsMixtes((s) => s.map((c) => (c.id === commissionId ? updated : c)));
    return updated;
  };
  const deleteCommission = async (commissionId) => {
    await apiDelete(`/api/commissions-mixtes?id=${commissionId}`);
    setCommissionsMixtes((s) => s.filter((c) => c.id !== commissionId));
  };
  const addSyndicat = async (payload) => {
    const created = await apiPost("/api/syndicats", payload);
    setSyndicats((s) => [...s, created]);
    return created;
  };
  const updateSyndicat = async (syndicatId, payload) => {
    const updated = await apiPatch(`/api/syndicats?id=${syndicatId}`, payload);
    setSyndicats((s) => s.map((sy) => (sy.id === syndicatId ? updated : sy)));
    return updated;
  };
  const deleteSyndicat = async (syndicatId) => {
    await apiDelete(`/api/syndicats?id=${syndicatId}`);
    setSyndicats((s) => s.filter((sy) => sy.id !== syndicatId));
  };
  const addGareRoutiere = async (payload) => {
    const created = await apiPost("/api/gares-routieres", payload);
    setGaresRoutieres((s) => [...s, created]);
    return created;
  };
  const updateGareRoutiere = async (gareId, payload) => {
    const updated = await apiPatch(`/api/gares-routieres?id=${gareId}`, payload);
    setGaresRoutieres((s) => s.map((g) => (g.id === gareId ? updated : g)));
    return updated;
  };
  const deleteGareRoutiere = async (gareId) => {
    await apiDelete(`/api/gares-routieres?id=${gareId}`);
    setGaresRoutieres((s) => s.filter((g) => g.id !== gareId));
  };
  const addLigne = async (payload) => {
    const created = await apiPost("/api/lignes", payload);
    setLignes((s) => [...s, created]);
    return created;
  };
  const updateLigne = async (ligneId, payload) => {
    const updated = await apiPatch(`/api/lignes?id=${ligneId}`, payload);
    setLignes((s) => s.map((l) => (l.id === ligneId ? updated : l)));
    return updated;
  };
  const deleteLigne = async (ligneId) => {
    await apiDelete(`/api/lignes?id=${ligneId}`);
    setLignes((s) => s.filter((l) => l.id !== ligneId));
  };
  const affecterVehicule = async (payload) => {
    const created = await apiPost("/api/affectations", payload);
    setAffectations((s) => [...s.map((a) => (a.vehiculeId === payload.vehiculeId ? { ...a, actif: false } : a)), created]);
    return created;
  };
  const desaffecterVehicule = async (vehiculeId) => {
    await apiPost("/api/affectations", { vehiculeId, desaffecter: true });
    setAffectations((s) => s.map((a) => (a.vehiculeId === vehiculeId ? { ...a, actif: false } : a)));
  };
  const addVehicle = async (v) => {
    const created = await apiPost("/api/vehicules", v, `Véhicule ${v.immatriculation || ""}`);
    setVehicles((s) => [...s, created]);
    setShowForm(false);
    openFiche(created);
    return created;
  };

  function vehicleMatchesSearch(v, q) {
    if (!q) return true;
    const owner = owners.find((o) => o.id === v.proprietaireId);
    const vDrivers = v.chauffeurIds.map((id) => drivers.find((d) => d.id === id)).filter(Boolean);
    const affectation = affectations.find((a) => a.vehiculeId === v.id && a.actif);
    const gare = affectation ? garesRoutieres.find((g) => g.id === affectation.gareRoutiereId) : null;
    const ligne = affectation ? lignes.find((l) => l.id === affectation.ligneId) : null;
    const haystack = [
      v.immatriculation, v.chassis, v.carteGrise, v.marque, v.modele,
      owner ? `${owner.prenoms} ${owner.nom}` : "", owner?.contact1, owner?.contact2, owner?.contact3,
      ...vDrivers.flatMap((d) => [`${d.prenoms} ${d.nom}`, d.contact1, d.contact2, d.contact3]),
      gare?.nom, gare?.sigle,
      ligne ? `${ligne.lieuDepart} ${ligne.lieuArrivee}` : "",
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  }
  function vehicleHasExpiredDoc(v) {
    const docs = v.documents || {};
    return [docs.visiteTechnique, docs.assuranceAuto, docs.vignette, docs.carteStationnement].some((d) => statusOf(d).key === "expire");
  }

  const searchQuery = search.trim().toLowerCase();
  const filteredVehicles = vehicles.filter((v) => {
    if (onlyExpiredFilter && !vehicleHasExpiredDoc(v)) return false;
    return vehicleMatchesSearch(v, searchQuery);
  });
  const searchResults = searchQuery ? vehicles.filter((v) => vehicleMatchesSearch(v, searchQuery)) : [];

  const isAgent = auth.role === "agent";
  const isAssociation = auth.role === "association";
  const nav = isAssociation
    ? [
        { key: "dashboard", label: "Tableau de bord", icon: <Home size={17} /> },
        { key: "vehicles", label: "Véhicules", icon: <Car size={17} /> },
        { key: "owners", label: "Transporteurs", icon: <User size={17} /> },
        { key: "drivers", label: "Chauffeurs", icon: <Users size={17} /> },
        { key: "elements", label: "Éléments", icon: <BadgeCheck size={17} /> },
        { key: "alerts", label: "Alertes documents", icon: <Bell size={17} />, count: critical.length },
      ]
    : isAgent
    ? [
        { key: "dashboard", label: "Tableau de bord", icon: <Home size={17} /> },
        { key: "vehicles", label: "Véhicules", icon: <Car size={17} /> },
        { key: "owners", label: "Transporteurs", icon: <User size={17} /> },
        { key: "drivers", label: "Chauffeurs", icon: <Users size={17} /> },
        { key: "elements", label: "Éléments", icon: <BadgeCheck size={17} /> },
      ]
    : [
        { key: "dashboard", label: "Tableau de bord", icon: <Home size={17} /> },
        { key: "vehicles", label: "Véhicules", icon: <Car size={17} /> },
        { key: "owners", label: "Transporteurs", icon: <User size={17} /> },
        { key: "drivers", label: "Chauffeurs", icon: <Users size={17} /> },
        { key: "elements", label: "Éléments", icon: <BadgeCheck size={17} /> },
        ...(auth.role === "admin" ? [{ key: "commissions", label: "Commissions Mixtes", icon: <MapPin size={17} /> }] : []),
        ...(auth.role === "admin" || auth.role === "commission_mixte" ? [{ key: "syndicats", label: "Collectifs (Syndicats)", icon: <Building2 size={17} /> }] : []),
        ...(auth.role === "syndicat" ? [{ key: "garesroutieres", label: "Gares Routières", icon: <MapPin size={17} /> }] : []),
        ...(auth.role === "admin" || auth.role === "commission_mixte" || auth.role === "syndicat" ? [{ key: "agents", label: "Agents enrôleurs", icon: <BadgeCheck size={17} /> }] : []),
        { key: "carburant", label: "Carburant", icon: <Fuel size={17} /> },
        { key: "alerts", label: "Alertes documents", icon: <Bell size={17} />, count: critical.length },
      ];

  return (
    <div className="font-body" style={{ background: C.cream, minHeight: "100vh", color: C.ink }}>
      <style>{FONTS}</style>
      {isMobile ? (
        <MobileView
          auth={auth}
          onLogout={onLogout}
          vehicles={vehicles}
          owners={owners}
          drivers={drivers}
          elements={elements}
          syndicats={syndicats}
          commissionsMixtes={commissionsMixtes}
          associations={associations}
          queueCount={queueCount}
          syncing={syncing}
          onSync={doSync}
          onCard={(member, category) => {
            if (category === "transporteur") setCardOwner(member);
            else if (category === "chauffeur") openCard(member);
            else setCardElement(member);
          }}
          setShowForm={setShowForm}
          setShowMemberFormFor={setShowMemberFormFor}
          setShowDriverFormFor={setShowDriverFormFor}
          setShowElementFormFor={setShowElementFormFor}
          setShowProfileForm={setShowProfileForm}
        />
      ) : (
      <div className="flex" style={{ height: "100vh", overflow: "hidden" }}>
        {/* Voile sombre derrière le menu sur mobile */}
        {mobileNavOpen && (
          <div
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40 }}
          />
        )}

        {/* SIDEBAR — tiroir escamotable sur mobile, fixe sur grand écran */}
        <aside
          className={mobileNavOpen ? "comix-drawer comix-drawer-open" : "comix-drawer"}
          style={{ width: 232, background: C.greenDark, flexShrink: 0, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}
        >
          <div className="px-5 py-6">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div style={{ width: 34, height: 34, borderRadius: 9, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Car size={17} color="#fff" />
                </div>
                <div>
                  <div className="font-display" style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>COMIX-CI</div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }}>Commissions Mixtes des Transporteurs</div>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="lg:hidden" style={{ color: "rgba(255,255,255,0.7)" }} title="Fermer le menu">
                <X size={18} />
              </button>
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => { setPage(n.key); setMobileNavOpen(false); }}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: page === n.key ? "rgba(255,255,255,0.12)" : "transparent", color: page === n.key ? "#fff" : "rgba(255,255,255,0.68)" }}
              >
                <span className="flex items-center gap-2.5">{n.icon}{n.label}</span>
                {!!n.count && <span style={{ background: C.orange, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>{n.count}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-auto p-4">
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div>
                <div className="font-body" style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{auth.nom}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>
                  {auth.role === "admin" ? "Administrateur général" : auth.role === "commission_mixte" ? "Commission Mixte" : auth.role === "syndicat" ? "Collectif (Syndicat)" : auth.role === "gare" ? "Gare Routière" : auth.role === "association" ? "Association (Syndicat)" : "Agent enrôleur"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => switchView("mobile")} title="Passer à la version mobile (enrôlement)" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Search size={15} />
                </button>
                <button onClick={() => setShowProfileForm(true)} title="Mon profil" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <Settings size={15} />
                </button>
                <button onClick={onLogout} title="Déconnexion" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <LogOut size={15} />
                </button>
              </div>
            </div>
            <TricolorRule />
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 8 }}>Abidjan · Côte d'Ivoire</div>
          </div>
        </aside>

        {/* MAIN — défile indépendamment de la barre latérale */}
        <main className="flex-1 comix-main" style={{ maxWidth: 1180, height: "100vh", overflowY: "auto" }}>
          {/* TOP BAR */}
          <div className="flex items-center justify-between gap-3 mb-7 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden" style={{ color: C.ink }} title="Menu">
                <Menu size={22} />
              </button>
              <div>
                <h1 className="font-display comix-page-title" style={{ fontWeight: 800, letterSpacing: -0.6 }}>
                  {{ dashboard: "Tableau de bord", vehicles: "Véhicules", owners: "Transporteurs", drivers: "Chauffeurs", elements: "Éléments", commissions: "Commissions Mixtes", syndicats: "Collectifs (Syndicats)", garesroutieres: "Gares Routières", carburant: "Carburant", alerts: "Alertes documents" }[page]}
                </h1>
                <div style={{ width: 46, height: 4, borderRadius: 999, background: `linear-gradient(90deg, ${C.orange}, ${C.green})`, margin: "5px 0 5px" }} />
                <p className="text-sm" style={{ color: C.slate, fontWeight: 500 }}>Registre des transporteurs de Côte d'Ivoire</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => { setOnlyExpiredFilter((f) => !f); setPage("vehicles"); }}
                className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg"
                style={{ background: onlyExpiredFilter ? C.redLight : "transparent", color: onlyExpiredFilter ? C.red : C.slate, border: `1px solid ${onlyExpiredFilter ? C.red : C.border}` }}
                title="Filtrer les véhicules ayant au moins un document expiré"
              >
                <AlertTriangle size={14} /> Documents périmés
              </button>
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
                  <Search size={15} color={C.slate} />
                  <input
                    placeholder="Nom, téléphone, immat., châssis, carte grise, gare, ligne…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
                    onFocus={() => search && setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                    onKeyDown={(e) => { if (e.key === "Enter") { setPage("vehicles"); setSearchOpen(false); } }}
                    className="font-body text-sm"
                    style={{ border: "none", outline: "none", width: 260 }}
                  />
                  {search && (
                    <button onClick={() => { setSearch(""); setSearchOpen(false); }} style={{ color: C.slate }}>
                      <X size={14} />
                    </button>
                  )}
                  <button onClick={() => { setPage("vehicles"); setSearchOpen(false); }} title="Rechercher" style={{ color: C.green }}>
                    <Search size={15} />
                  </button>
                </div>
                {searchOpen && searchQuery && (
                  <div className="absolute right-0 mt-1.5" style={{ width: 380, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 14px 32px rgba(0,0,0,0.14)", maxHeight: 360, overflowY: "auto", zIndex: 50 }}>
                    {searchResults.length === 0 ? (
                      <div className="font-body text-sm p-4" style={{ color: C.slate }}>Aucun résultat pour "{search}".</div>
                    ) : (
                      <>
                        {searchResults.slice(0, 8).map((v) => {
                          const owner = owners.find((o) => o.id === v.proprietaireId);
                          return (
                            <button
                              key={v.id}
                              onClick={() => { openFiche(v); setSearchOpen(false); setSearch(""); }}
                              className="w-full text-left px-4 py-2.5 flex items-center justify-between"
                              style={{ borderBottom: `1px solid ${C.border}` }}
                            >
                              <div>
                                <div className="font-body text-sm font-medium" style={{ color: C.ink }}>{v.immatriculation} <span style={{ color: C.slate, fontWeight: 400 }}>· {v.marque} {v.modele}</span></div>
                                <div className="font-body text-xs" style={{ color: C.slate }}>{owner ? `${owner.prenoms} ${owner.nom}` : "Sans transporteur"}</div>
                              </div>
                              <ChevronRight size={14} color={C.slate} />
                            </button>
                          );
                        })}
                        {searchResults.length > 8 && (
                          <button onClick={() => { setPage("vehicles"); setSearchOpen(false); }} className="w-full font-body text-xs font-semibold p-2.5 text-center" style={{ color: C.green }}>
                            +{searchResults.length - 8} autre(s) résultat(s) — voir tout
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              {auth.role !== "association" && (() => {
                // Le bouton principal suit la page consultee : proposer
                // "Ajouter un vehicule" depuis la page Transporteurs ou
                // Elements n'avait aucun sens.
                const actions = {
                  owners: ["Ajouter un transporteur", () => setShowMemberFormFor(true)],
                  drivers: ["Ajouter un chauffeur", () => setShowDriverFormFor(true)],
                  elements: ["Ajouter un élément", () => setShowElementFormFor(true)],
                };
                const [libelle, action] = actions[page]
                  || (auth.role === "commission_mixte" ? [null, null] : ["Ajouter un véhicule", () => setShowForm(true)]);
                if (!libelle) return null;
                return (
                  <button onClick={action} disabled={loading} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: loading ? "#D8B48A" : C.orange, color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>
                    <Plus size={16} /> {libelle}
                  </button>
                );
              })()}
            </div>
          </div>

          {loadError && (
            <div className="font-body text-sm mb-5 px-4 py-3 rounded-lg" style={{ background: C.redLight, color: C.red }}>
              {loadError} — vérifiez que <code>DATABASE_URL</code> est bien configurée (Vercel en production, <code>.env.local</code> en local avec <code>vercel dev</code>).
            </div>
          )}

          <SyncBanner count={queueCount} syncing={syncing} onSync={doSync} />

          {loading && !loadError && (
            <div className="font-body text-sm mb-5" style={{ color: C.slate }}>Chargement des données depuis la base…</div>
          )}

          {!loading && (
          <>
          {page === "dashboard" && (
            <div className="flex flex-col gap-6">
              {auth.role !== "admin" && (() => {
                const entity = auth.role === "commission_mixte"
                  ? commissionsMixtes.find((c) => c.id === auth.commissionMixteId)
                  : auth.role === "syndicat"
                    ? syndicats.find((s) => s.id === auth.syndicatId)
                    : garesRoutieres.find((g) => g.id === auth.gareRoutiereId);
                const displayName = entity?.sigle || entity?.nom || auth.nom;
                return (
                  <div className="flex items-center gap-4" style={{ background: `linear-gradient(120deg, ${C.greenDark}, ${C.green})`, borderRadius: 14, padding: 20 }}>
                    {entity?.logoUrl ? (
                      <img src={entity.logoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "2px solid rgba(255,255,255,0.5)" }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Building2 size={26} color="#fff" />
                      </div>
                    )}
                    <div>
                      <div className="font-body" style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>Bienvenue sur le dashboard de :</div>
                      <div className="font-display" style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>{displayName}</div>
                    </div>
                  </div>
                );
              })()}

              {auth.role === "admin" && (
                <HautConseilPanel
                  vehicles={vehicles}
                  owners={owners}
                  commissionsMixtes={commissionsMixtes}
                  syndicats={syndicats}
                  garesRoutieres={garesRoutieres}
                  affectations={affectations}
                  critical={critical}
                  onOpenFiche={openFiche}
                />
              )}

              <div className="flex flex-col gap-4">
                <div className="flex gap-4 comix-stats-row">
                  {auth.role === "admin" ? (
                    <>
                      <StatCard icon={<MapPin size={17} />} label="Commissions mixtes" value={commissionsMixtes.length} accent={C.orange} />
                      <StatCard icon={<Building2 size={17} />} label="Collectifs (Syndicats)" value={syndicats.length} accent={C.green} />
                      <StatCard icon={<User size={17} />} label="Membres (transporteurs)" value={owners.length} accent={C.greenDark} />
                      <StatCard icon={<AlertTriangle size={17} />} label="Documents à traiter (≤ 30 j)" value={critical.length} accent={C.red} />
                    </>
                  ) : (
                    <>
                      <StatCard icon={<Car size={17} />} label="Véhicules enregistrés" value={vehicles.length} accent={C.green} />
                      <StatCard icon={<User size={17} />} label="Transporteurs" value={owners.length} accent={C.orange} />
                      <StatCard icon={<Users size={17} />} label="Chauffeurs" value={drivers.length} accent={C.greenDark} />
                      <StatCard icon={<AlertTriangle size={17} />} label="Documents à traiter (≤ 30 j)" value={critical.length} accent={C.red} />
                    </>
                  )}
                </div>
                <div className="flex gap-4 comix-stats-row">
                  <StatCard icon={<MapPin size={17} />} label="Gares routières" value={garesRoutieres.length} accent={C.orangeDark} />
                  <StatCard icon={<Route size={17} />} label="Lignes" value={lignes.length} accent={C.green} />
                </div>
              </div>

              {auth.role === "admin" ? (
                <div className="grid grid-cols-2 gap-4">
                  <SectionCard accent={C.orangeDark} icon={<MapPin size={18} />} title="Commissions mixtes récemment ajoutées" right={<button onClick={() => setPage("commissions")} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.green }}>Tout voir <ChevronRight size={13} /></button>}>
                    {commissionsMixtes.length === 0 ? (
                      <div className="text-sm" style={{ color: C.slate }}>Aucune commission mixte enregistrée.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {commissionsMixtes.slice(-6).reverse().map((c, i) => (
                          <div key={c.id} className="flex items-center justify-between py-2" style={{ borderBottom: i < Math.min(commissionsMixtes.length, 6) - 1 ? `1px solid ${C.border}` : "none" }}>
                            <div className="flex items-center gap-3">
                              <MapPin size={15} color={C.slate} />
                              <div>
                                <div className="text-sm font-medium">{c.nom}</div>
                                <div className="text-xs" style={{ color: C.slate }}>{c.commune}</div>
                              </div>
                            </div>
                            <span className="text-xs" style={{ color: C.slate }}>{syndicats.filter((s) => s.commissionMixteId === c.id).length} syndicat(s)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard accent={C.green} icon={<Building2 size={18} />} title="Collectifs (Syndicats) récemment ajoutés" right={<button onClick={() => setPage("syndicats")} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.green }}>Tout voir <ChevronRight size={13} /></button>}>
                    {syndicats.length === 0 ? (
                      <div className="text-sm" style={{ color: C.slate }}>Aucun collectif (syndicat) enregistré.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {syndicats.slice(-6).reverse().map((s, i) => {
                          const commission = commissionsMixtes.find((c) => c.id === s.commissionMixteId);
                          const count = owners.filter((o) => o.syndicatId === s.id).length;
                          return (
                            <div key={s.id} className="flex items-center justify-between py-2" style={{ borderBottom: i < Math.min(syndicats.length, 6) - 1 ? `1px solid ${C.border}` : "none" }}>
                              <div className="flex items-center gap-3">
                                <Building2 size={15} color={C.slate} />
                                <div>
                                  <div className="text-sm font-medium">{s.nom}</div>
                                  <div className="text-xs" style={{ color: C.slate }}>{commission?.nom || "—"}</div>
                                </div>
                              </div>
                              <span className="text-xs" style={{ color: C.slate }}>{count} transporteur(s)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SectionCard>
                </div>
              ) : (
                <>
                  <SectionCard accent={C.red} icon={<Bell size={18} />} title="Alertes prioritaires" right={<button onClick={() => setPage("alerts")} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.green }}>Tout voir <ChevronRight size={13} /></button>}>
                    <div className="flex flex-col gap-2">
                      {critical.slice(0, 6).map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
                          <div className="flex items-center gap-3">
                            <Car size={15} color={C.slate} />
                            <div>
                              <div className="text-sm font-medium">{a.vehicle.immatriculation} <span style={{ color: C.slate, fontWeight: 400 }}>· {a.label}</span></div>
                              <div className="text-xs" style={{ color: C.slate }}>Échéance {fmt(a.date)}</div>
                            </div>
                          </div>
                          <Badge status={statusOf(a.date)} />
                        </div>
                      ))}
                      {critical.length === 0 && <div className="text-sm" style={{ color: C.slate }}>Aucune échéance urgente. 👍</div>}
                    </div>
                  </SectionCard>

                  <SectionCard accent={C.green} icon={<Car size={18} />} title="Véhicules récemment ajoutés">
                    <VehicleTable vehicles={vehicles.slice(-5).reverse()} owners={owners} onFiche={openFiche} onPhoto={updateVehiclePhoto} commissionsMixtes={commissionsMixtes} lignes={lignes} affectations={affectations} onReassign={setReassignVehicle} onEdit={setEditVehicle} onDelete={deleteVehicle} />
                  </SectionCard>
                </>
              )}
            </div>
          )}

          {page === "vehicles" && (
            <SectionCard
              accent={C.green}
              icon={<Car size={18} />}
              title={`Tous les véhicules (${filteredVehicles.length})${onlyExpiredFilter ? " — documents périmés" : ""}`}
              right={onlyExpiredFilter && (
                <button onClick={() => setOnlyExpiredFilter(false)} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.red }}>
                  <X size={13} /> Retirer le filtre
                </button>
              )}
            >
              <VehicleTable vehicles={filteredVehicles} owners={owners} onFiche={openFiche} onPhoto={updateVehiclePhoto} commissionsMixtes={commissionsMixtes} lignes={lignes} affectations={affectations} onReassign={setReassignVehicle} onEdit={setEditVehicle} onDelete={deleteVehicle} />
            </SectionCard>
          )}

          {page === "owners" && (() => {
            const visibleOwners = owners.filter((o) => !!o.carteImprimee === showOwnersArchive);
            return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowOwnersArchive(false); setSelectedOwnerIds([]); }} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: !showOwnersArchive ? C.orangeLight : "transparent", color: !showOwnersArchive ? C.orangeDark : C.slate, border: `1px solid ${!showOwnersArchive ? C.orange : C.border}` }}>
                  Nouvelles cartes ({owners.filter((o) => !o.carteImprimee).length})
                </button>
                <button onClick={() => { setShowOwnersArchive(true); setSelectedOwnerIds([]); }} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: showOwnersArchive ? C.orangeLight : "transparent", color: showOwnersArchive ? C.orangeDark : C.slate, border: `1px solid ${showOwnersArchive ? C.orange : C.border}` }}>
                  Archives — cartes imprimées ({owners.filter((o) => o.carteImprimee).length})
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                <div className="font-body text-sm" style={{ color: C.slate }}>
                  {selectedOwnerIds.length > 0 ? `${selectedOwnerIds.length} transporteur${selectedOwnerIds.length > 1 ? "s" : ""} sélectionné${selectedOwnerIds.length > 1 ? "s" : ""}` : "Sélectionnez des transporteurs pour générer une planche de cartes à imprimer"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOwnerIds(selectedOwnerIds.length === visibleOwners.length ? [] : visibleOwners.map((o) => o.id))}
                    className="font-body text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ border: `1px solid ${C.border}`, color: C.ink }}
                  >
                    {selectedOwnerIds.length === visibleOwners.length && visibleOwners.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={selectedOwnerIds.length === 0}
                    className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: selectedOwnerIds.length ? C.orange : "#D8B48A", color: "#fff", cursor: selectedOwnerIds.length ? "pointer" : "not-allowed" }}
                  >
                    <Printer size={13} /> Générer la planche PDF ({MEMBER_CARDS_PER_SHEET} cartes/feuille)
                  </button>
                  {auth.role !== "association" && (
                    <button onClick={() => setShowMemberFormFor(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.green, color: "#fff" }}>
                      <Plus size={16} /> Ajouter un transporteur
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
              {visibleOwners.map((o) => {
                const ownedCount = vehicles.filter((v) => v.proprietaireId === o.id).length;
                const isSelected = selectedOwnerIds.includes(o.id);
                return (
                  <div key={o.id} style={{ background: "#fff", border: `1.5px solid ${isSelected ? C.orange : C.border}`, borderRadius: 14, padding: 18, position: "relative" }}>
                    <label className="flex items-center gap-1.5" style={{ position: "absolute", top: 14, right: 14, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedOwnerIds((s) => (isSelected ? s.filter((id) => id !== o.id) : [...s, o.id]))}
                        style={{ width: 15, height: 15, accentColor: C.orange }}
                      />
                    </label>
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarUpload photo={o.photo} nom={o.nom} prenoms={o.prenoms} size={48} onUpload={(dataUrl) => updateOwnerPhoto(o.id, dataUrl)} />
                      <div>
                        <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{o.prenoms} {o.nom}</div>
                        <div className="text-xs" style={{ color: C.slate }}>{ownedCount} véhicule{ownedCount > 1 ? "s" : ""} · N° {o.carteTransporteurNumero || "—"}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs mb-3" style={{ color: C.slate }}>
                      <div className="flex items-center gap-2"><BadgeCheck size={13} /> {o.cni}</div>
                      <div className="flex items-center gap-2"><Phone size={13} /> {o.contact1}{o.contact2 ? " · " + o.contact2 : ""}</div>
                      {o.email && <div className="flex items-center gap-2"><Mail size={13} /> {o.email}</div>}
                      <div className="flex items-center gap-2"><MapPin size={13} /> {o.quartier}, {o.ville}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setCardOwner(o)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
                        <CreditCard size={13} /> {showOwnersArchive ? "Réimprimer (duplicata)" : "Carte transporteur"}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateOwner(o.id, { carteImprimee: !showOwnersArchive })}
                          title={showOwnersArchive ? "Restaurer parmi les nouvelles cartes" : "Archiver — carte imprimée"}
                          style={{ color: showOwnersArchive ? C.greenDark : C.slate }}
                        >
                          {showOwnersArchive ? <RotateCw size={14} /> : <FileText size={14} />}
                        </button>
                        <button onClick={() => setEditMember(o)} title="Modifier" style={{ color: C.slate }}><Pencil size={14} /></button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Supprimer le transporteur "${o.prenoms} ${o.nom}" ?`)) return;
                            try { await deleteOwner(o.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                          }}
                          title="Supprimer"
                          style={{ color: C.red }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleOwners.length === 0 && (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center col-span-3">
                  <span style={{ color: C.slate }}>{showOwnersArchive ? "Aucune carte archivée." : "Aucune nouvelle carte à imprimer."}</span>
                </div>
              )}
            </div>
            </div>
            );
          })()}

          {page === "elements" && (() => {
            const visibleElements = elements.filter((e) => !!e.carteImprimee === showElementsArchive);
            return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowElementsArchive(false); setSelectedElementIds([]); }} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: !showElementsArchive ? C.orangeLight : "transparent", color: !showElementsArchive ? C.orangeDark : C.slate, border: `1px solid ${!showElementsArchive ? C.orange : C.border}` }}>
                  Nouvelles cartes ({elements.filter((e) => !e.carteImprimee).length})
                </button>
                <button onClick={() => { setShowElementsArchive(true); setSelectedElementIds([]); }} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: showElementsArchive ? C.orangeLight : "transparent", color: showElementsArchive ? C.orangeDark : C.slate, border: `1px solid ${showElementsArchive ? C.orange : C.border}` }}>
                  Archives — cartes imprimées ({elements.filter((e) => e.carteImprimee).length})
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                <div className="font-body text-sm" style={{ color: C.slate }}>
                  {selectedElementIds.length > 0 ? `${selectedElementIds.length} élément${selectedElementIds.length > 1 ? "s" : ""} sélectionné${selectedElementIds.length > 1 ? "s" : ""}` : "Sélectionnez des éléments pour générer une planche de cartes à imprimer"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedElementIds(selectedElementIds.length === visibleElements.length ? [] : visibleElements.map((e) => e.id))}
                    className="font-body text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ border: `1px solid ${C.border}`, color: C.ink }}
                  >
                    {selectedElementIds.length === visibleElements.length && visibleElements.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={selectedElementIds.length === 0}
                    className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: selectedElementIds.length ? C.orange : "#D8B48A", color: "#fff", cursor: selectedElementIds.length ? "pointer" : "not-allowed" }}
                  >
                    <Printer size={13} /> Générer la planche PDF ({MEMBER_CARDS_PER_SHEET} cartes/feuille)
                  </button>
                  {auth.role !== "association" && (
                    <button onClick={() => setShowElementFormFor(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.green, color: "#fff" }}>
                      <Plus size={16} /> Ajouter un élément
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
              {visibleElements.map((e) => {
                const isSelected = selectedElementIds.includes(e.id);
                return (
                  <div key={e.id} style={{ background: "#fff", border: `1.5px solid ${isSelected ? C.orange : C.border}`, borderRadius: 14, padding: 18, position: "relative" }}>
                    <label className="flex items-center gap-1.5" style={{ position: "absolute", top: 14, right: 14, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedElementIds((s) => (isSelected ? s.filter((id) => id !== e.id) : [...s, e.id]))}
                        style={{ width: 15, height: 15, accentColor: C.orange }}
                      />
                    </label>
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarUpload photo={e.photo} nom={e.nom} prenoms={e.prenoms} size={48} onUpload={async (dataUrl) => { await updateElement(e.id, { photo: dataUrl }); }} />
                      <div>
                        <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{e.prenoms} {e.nom}</div>
                        <div className="text-xs" style={{ color: C.slate }}>{e.fonction || "—"} · N° {e.numeroCarte || "—"}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs mb-3" style={{ color: C.slate }}>
                      <div className="flex items-center gap-2"><BadgeCheck size={13} /> {e.cni}</div>
                      <div className="flex items-center gap-2"><Phone size={13} /> {e.contact1}{e.contact2 ? " · " + e.contact2 : ""}</div>
                      {e.email && <div className="flex items-center gap-2"><Mail size={13} /> {e.email}</div>}
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setCardElement(e)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
                        <CreditCard size={13} /> {showElementsArchive ? "Réimprimer (duplicata)" : "Carte élément"}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateElement(e.id, { carteImprimee: !showElementsArchive })}
                          title={showElementsArchive ? "Restaurer parmi les nouvelles cartes" : "Archiver — carte imprimée"}
                          style={{ color: showElementsArchive ? C.greenDark : C.slate }}
                        >
                          {showElementsArchive ? <RotateCw size={14} /> : <FileText size={14} />}
                        </button>
                        <button onClick={() => setEditElement(e)} title="Modifier" style={{ color: C.slate }}><Pencil size={14} /></button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Supprimer l'élément "${e.prenoms} ${e.nom}" ?`)) return;
                            try { await deleteElement(e.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                          }}
                          title="Supprimer"
                          style={{ color: C.red }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleElements.length === 0 && (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center col-span-3">
                  <span style={{ color: C.slate }}>{showElementsArchive ? "Aucune carte archivée." : "Aucune nouvelle carte à imprimer."}</span>
                </div>
              )}
            </div>
            </div>
            );
          })()}

          {page === "agents" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button onClick={() => setShowAgentFormFor(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                  <Plus size={16} /> Ajouter un agent
                </button>
              </div>
              <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
                💡 Un agent enrôleur peut créer des dossiers (véhicule, transporteur, chauffeur) et des éléments, et générer leurs cartes de membre — il n'a accès à aucune autre fonctionnalité d'administration.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {agentsList.map((a) => (
                  <div key={a.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{a.prenoms} {a.nom}</div>
                        <div className="text-xs" style={{ color: C.slate }}>{a.login}</div>
                      </div>
                      <span className="font-body text-xs font-semibold px-2 py-1 rounded-full" style={{ background: a.actif ? C.greenLight : C.redLight, color: a.actif ? C.greenDark : C.red }}>
                        {a.actif ? "Actif" : "Désactivé"}
                      </span>
                    </div>
                    {a.contact1 && <div className="flex items-center gap-2 font-body text-xs mb-3" style={{ color: C.slate }}><Phone size={13} /> {a.contact1}</div>}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => updateAgent(a.id, { actif: !a.actif })}
                        className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: a.actif ? C.redLight : C.greenLight, color: a.actif ? C.red : C.greenDark }}
                      >
                        {a.actif ? "Désactiver" : "Réactiver"}
                      </button>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditAgent(a)} title="Modifier" style={{ color: C.slate }}><Pencil size={14} /></button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Supprimer l'agent "${a.prenoms} ${a.nom}" ?`)) return;
                            try { await deleteAgent(a.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                          }}
                          title="Supprimer"
                          style={{ color: C.red }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {agentsLoaded && agentsList.length === 0 && (
                  <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center col-span-3">
                    <span style={{ color: C.slate }}>Aucun agent enrôleur pour l'instant.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {page === "drivers" && (() => {
            const visibleDrivers = drivers.filter((d) => !!d.carteImprimee === showDriversArchive);
            return (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowDriversArchive(false); setSelectedDriverIds([]); }} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: !showDriversArchive ? C.orangeLight : "transparent", color: !showDriversArchive ? C.orangeDark : C.slate, border: `1px solid ${!showDriversArchive ? C.orange : C.border}` }}>
                  Nouvelles cartes ({drivers.filter((d) => !d.carteImprimee).length})
                </button>
                <button onClick={() => { setShowDriversArchive(true); setSelectedDriverIds([]); }} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: showDriversArchive ? C.orangeLight : "transparent", color: showDriversArchive ? C.orangeDark : C.slate, border: `1px solid ${showDriversArchive ? C.orange : C.border}` }}>
                  Archives — cartes imprimées ({drivers.filter((d) => d.carteImprimee).length})
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                <div className="font-body text-sm" style={{ color: C.slate }}>
                  {selectedDriverIds.length > 0 ? `${selectedDriverIds.length} chauffeur${selectedDriverIds.length > 1 ? "s" : ""} sélectionné${selectedDriverIds.length > 1 ? "s" : ""}` : "Sélectionnez des chauffeurs pour générer une planche de cartes à imprimer"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDriverIds(selectedDriverIds.length === visibleDrivers.length ? [] : visibleDrivers.map((d) => d.id))}
                    className="font-body text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ border: `1px solid ${C.border}`, color: C.ink }}
                  >
                    {selectedDriverIds.length === visibleDrivers.length && visibleDrivers.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={selectedDriverIds.length === 0}
                    className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: selectedDriverIds.length ? C.orange : "#D8B48A", color: "#fff", cursor: selectedDriverIds.length ? "pointer" : "not-allowed" }}
                  >
                    <Printer size={13} /> Générer la planche PDF ({MEMBER_CARDS_PER_SHEET} cartes/feuille)
                  </button>
                  <button onClick={() => setShowDriverFormFor(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.green, color: "#fff" }}>
                    <Plus size={16} /> Ajouter un chauffeur
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
              {visibleDrivers.map((d) => {
                const veh = vehicles.find((v) => v.chauffeurIds.includes(d.id));
                const s = statusOf(d.permisDateFin);
                const isSelected = selectedDriverIds.includes(d.id);
                return (
                  <div key={d.id} style={{ background: "#fff", border: `1.5px solid ${isSelected ? C.orange : C.border}`, borderRadius: 14, padding: 18, position: "relative" }}>
                    <label className="flex items-center gap-1.5" style={{ position: "absolute", top: 14, right: 14, cursor: "pointer" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleDriverSelection(d.id)} style={{ width: 15, height: 15, accentColor: C.orange }} />
                    </label>
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarUpload photo={d.photo} nom={d.nom} prenoms={d.prenoms} size={48} onUpload={(dataUrl) => updateDriverPhoto(d.id, dataUrl)} />
                      <div>
                        <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{d.prenoms} {d.nom}</div>
                        <div className="text-xs" style={{ color: C.slate }}>{veh ? veh.immatriculation : "Non affecté"}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs mb-3" style={{ color: C.slate }}>
                      <div className="flex items-center gap-2"><BadgeCheck size={13} /> {d.cni}</div>
                      <div className="flex items-center gap-2"><Phone size={13} /> {d.contact1}{d.contact2 ? " · " + d.contact2 : ""}</div>
                      <div className="flex items-center gap-2"><Calendar size={13} /> Permis {fmt(d.permisDateFin)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge status={s} />
                      <div className="flex items-center gap-2">
                        <FileUploadButton
                          label="QR paiement"
                          icon={<QrCode size={13} />}
                          onUpload={(dataUrl) => updateDriverQr(d.id, dataUrl)}
                          style={{ background: d.qrPaiement ? C.greenLight : C.amberLight, color: d.qrPaiement ? C.greenDark : C.amber }}
                        />
                        <button onClick={() => openCard(d)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
                          <CreditCard size={13} /> {showDriversArchive ? "Réimprimer (duplicata)" : "Carte membre"}
                        </button>
                        <button
                          onClick={() => updateDriver(d.id, { carteImprimee: !showDriversArchive })}
                          title={showDriversArchive ? "Restaurer parmi les nouvelles cartes" : "Archiver — carte imprimée"}
                          style={{ color: showDriversArchive ? C.greenDark : C.slate }}
                        >
                          {showDriversArchive ? <RotateCw size={14} /> : <FileText size={14} />}
                        </button>
                        <button onClick={() => setEditDriver(d)} title="Modifier" style={{ color: C.slate }}><Pencil size={14} /></button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Supprimer le chauffeur "${d.prenoms} ${d.nom}" ?`)) return;
                            try { await deleteDriver(d.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                          }}
                          title="Supprimer"
                          style={{ color: C.red }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleDrivers.length === 0 && (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center col-span-3">
                  <span style={{ color: C.slate }}>{showDriversArchive ? "Aucune carte archivée." : "Aucune nouvelle carte à imprimer."}</span>
                </div>
              )}
              </div>
            </div>
            );
          })()}

          {page === "commissions" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm" style={{ color: C.slate }}>{commissionsMixtes.length} commission{commissionsMixtes.length > 1 ? "s" : ""} mixte{commissionsMixtes.length > 1 ? "s" : ""} enregistrée{commissionsMixtes.length > 1 ? "s" : ""}</p>
                <button onClick={() => setShowCommissionForm(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                  <Plus size={16} /> Ajouter une commission mixte
                </button>
              </div>

              {commissionsMixtes.length === 0 ? (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center" >
                  <span style={{ color: C.slate }}>Aucune commission mixte enregistrée. Ajoutez-en une pour commencer à y rattacher des syndicats et des lignes.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {commissionsMixtes.map((c) => {
                    const commissionSyndicats = syndicats.filter((s) => s.commissionMixteId === c.id);
                    return (
                      <div key={c.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-sm">{c.nom}</div>
                            <div className="text-xs" style={{ color: C.slate }}>{c.commune}{c.localisation ? " · " + c.localisation : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.latitude && c.longitude && (
                              <a href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`} target="_blank" rel="noreferrer" className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.green }}>
                                <MapPin size={13} /> Carte
                              </a>
                            )}
                            <button onClick={() => setEditCommission(c)} title="Modifier la commission mixte" style={{ color: C.slate }}><Pencil size={14} /></button>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Supprimer la commission mixte "${c.nom}" ? Cette action est définitive.`)) return;
                                try { await deleteCommission(c.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                              }}
                              title="Supprimer la commission mixte"
                              style={{ color: C.red }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-xs mb-3" style={{ color: C.slate }}>
                          {c.presidentNom && <div className="flex items-center gap-2"><User size={12} /> Président : {c.presidentNom}{c.presidentContact ? " · " + c.presidentContact : ""}</div>}
                          {c.login && <div className="flex items-center gap-2"><BadgeCheck size={12} /> Compte commission : {c.login} {c.pinConfigure ? "· PIN configuré" : ""}</div>}
                        </div>

                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }} className="mb-3">
                          <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>Syndicats ({commissionSyndicats.length})</span>
                          {commissionSyndicats.length === 0 ? (
                            <p className="font-body text-xs mt-1.5 mb-2" style={{ color: C.slate }}>Aucun collectif (syndicat) pour cette commission.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-1.5 mb-2">
                              {commissionSyndicats.map((s) => (
                                <div key={s.id} className="flex items-center justify-between font-body text-xs" style={{ color: C.ink }}>
                                  <span>{s.nom}</span>
                                  <div className="flex items-center gap-2">
                                    <span style={{ color: C.slate }}>{owners.filter((o) => o.syndicatId === s.id).length} transporteur(s)</span>
                                    <button onClick={() => setEditSyndicat(s)} title="Modifier le collectif (syndicat)" style={{ color: C.slate }}><Pencil size={12} /></button>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Supprimer le syndicat "${s.nom}" ?`)) return;
                                        try { await deleteSyndicat(s.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                                      }}
                                      title="Supprimer le collectif (syndicat)"
                                      style={{ color: C.red }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setShowSyndicatFormFor(c.id)} className="w-full font-body text-xs font-semibold flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
                            <Plus size={14} /> Ajouter un collectif (syndicat) à cette commission
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {page === "syndicats" && (
            <div className="flex flex-col gap-6">
              {auth.role === "admin" ? (
                commissionsMixtes.map((c) => {
                  const commissionSyndicats = syndicats.filter((s) => s.commissionMixteId === c.id);
                  const totalMembres = owners.filter((o) => commissionSyndicats.some((s) => s.id === o.syndicatId)).length;
                  return (
                    <SectionCard key={c.id} accent={C.orangeDark} icon={<MapPin size={18} />} title={`${c.nom} (${c.commune}) — ${totalMembres} transporteur(s) au total`}>
                      <SyndicatMembersTable associations={associations} onAddAsso={setAssoFormForCollectif} onEditAsso={setEditAsso} onDeleteAsso={deleteAssociation} commissionSyndicats={commissionSyndicats} owners={owners} />
                    </SectionCard>
                  );
                })
              ) : (
                (() => {
                  const commission = commissionsMixtes.find((c) => c.id === auth.commissionMixteId);
                  const totalMembres = owners.length; // déjà filtré côté API aux syndicats de cette commission
                  return (
                    <SectionCard
                      accent={C.orangeDark}
                      icon={<MapPin size={18} />}
                      title={`${commission?.nom || "Ma commission mixte"} — ${totalMembres} transporteur(s) au total`}
                      right={
                        <button onClick={() => setShowSyndicatFormFor(auth.commissionMixteId)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                          <Plus size={14} /> Ajouter un collectif (syndicat)
                        </button>
                      }
                    >
                      <SyndicatMembersTable
                        commissionSyndicats={syndicats}
                        owners={owners}
                        associations={associations}
                        onAddAsso={setAssoFormForCollectif}
                        onEditAsso={setEditAsso}
                        onDeleteAsso={deleteAssociation}
                        onEdit={setEditSyndicat}
                        onDelete={async (id) => { try { await deleteSyndicat(id); } catch (err) { alert(err.message || "Suppression impossible."); } }}
                      />
                    </SectionCard>
                  );
                })()
              )}
            </div>
          )}

          {page === "garesroutieres" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm" style={{ color: C.slate }}>{garesRoutieres.length} gare{garesRoutieres.length > 1 ? "s" : ""} routière{garesRoutieres.length > 1 ? "s" : ""} enregistrée{garesRoutieres.length > 1 ? "s" : ""}</p>
                <button onClick={() => setShowGareRoutiereFormFor(auth.syndicatId)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                  <Plus size={16} /> Ajouter une gare routière
                </button>
              </div>
              {garesRoutieres.length === 0 ? (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center">
                  <span style={{ color: C.slate }}>Aucune gare routière enregistrée — ajoutez le premier lieu d'exploitation de vos véhicules.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {garesRoutieres.map((g) => (
                    <div key={g.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {g.logoUrl ? <img src={g.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: "cover" }} /> : <div style={{ width: 32, height: 32, borderRadius: 7, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPin size={15} color={C.slate} /></div>}
                          <div>
                            <div className="font-semibold text-sm">{g.sigle || g.nom}</div>
                            {g.sigle && <div className="text-xs" style={{ color: C.slate }}>{g.nom}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditGareRoutiere(g)} title="Modifier" style={{ color: C.slate }}><Pencil size={13} /></button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Supprimer la gare routière "${g.nom}" ?`)) return;
                              try { await deleteGareRoutiere(g.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                            }}
                            title="Supprimer"
                            style={{ color: C.red }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {g.login && <div className="font-body text-xs flex items-center gap-1.5" style={{ color: C.slate }}><BadgeCheck size={12} /> Compte : {g.login} {g.pinConfigure ? "· PIN configuré" : ""}</div>}

                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
                        {(() => {
                          const gareLignes = lignes.filter((l) => l.gareRoutiereId === g.id);
                          return (
                            <>
                              <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>Lignes ({gareLignes.length})</span>
                              {gareLignes.length === 0 ? (
                                <p className="font-body text-xs mt-1.5 mb-2" style={{ color: C.slate }}>Aucune ligne pour cette gare.</p>
                              ) : (
                                <div className="flex flex-col gap-1.5 mt-1.5 mb-2">
                                  {gareLignes.map((l) => (
                                    <div key={l.id} className="flex items-center justify-between font-body text-xs" style={{ color: C.ink }}>
                                      <span>{l.lieuDepart} → {l.lieuArrivee}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold">{l.cout.toLocaleString("fr-FR")} F</span>
                                        <button onClick={() => setEditLigne(l)} title="Modifier la ligne" style={{ color: C.slate }}><Pencil size={11} /></button>
                                        <button
                                          onClick={async () => {
                                            if (!window.confirm(`Supprimer la ligne "${l.lieuDepart} → ${l.lieuArrivee}" ?`)) return;
                                            try { await deleteLigne(l.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                                          }}
                                          title="Supprimer la ligne"
                                          style={{ color: C.red }}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <button onClick={() => setLigneFormGareId(g.id)} className="w-full font-body text-xs font-semibold flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: C.orangeLight, color: C.orangeDark }}>
                          <Plus size={13} /> Ajouter une ligne
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {page === "carburant" && (
            <div className="flex flex-col gap-6">
              <div className="flex gap-4 comix-stats-row">
                <StatCard icon={<Fuel size={17} />} label="Volume total (litres)" value={achats.reduce((s, a) => s + a.volumeLitres, 0).toLocaleString("fr-FR")} accent={C.green} />
                <StatCard icon={<CreditCard size={17} />} label="Montant total (FCFA)" value={achats.reduce((s, a) => s + a.montantFcfa, 0).toLocaleString("fr-FR")} accent={C.orange} />
                <StatCard icon={<BadgeCheck size={17} />} label="Commission Mutuelle (FCFA)" value={achats.reduce((s, a) => s + a.commissionFcfa, 0).toLocaleString("fr-FR")} accent={C.greenDark} />
              </div>

              <SectionCard
                accent={C.orange}
                icon={<Fuel size={18} />}
                title={`Achats de carburant (${achats.length})`}
                right={
                  <button onClick={() => setShowFuelForm(true)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                    <Plus size={14} /> Enregistrer un achat
                  </button>
                }
              >
                {achats.length === 0 ? (
                  <p className="font-body text-sm" style={{ color: C.slate }}>Aucun achat enregistré pour le moment.</p>
                ) : (
                  <table className="w-full font-body text-sm" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: C.slate, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Date</th>
                        <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Chauffeur</th>
                        <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Carte grise</th>
                        <th className="text-right pb-2 font-medium">Volume (L)</th>
                        <th className="text-right pb-2 font-medium">Montant</th>
                        <th className="text-right pb-2 font-medium">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {achats.map((a) => (
                        <tr key={a.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td className="py-2.5">{fmt(a.createdAt?.slice(0, 10))}</td>
                          <td className="py-2.5">{a.chauffeurNom || "—"}</td>
                          <td className="py-2.5 font-mono">{a.carteGrise}</td>
                          <td className="py-2.5 text-right font-mono">{a.volumeLitres.toLocaleString("fr-FR")}</td>
                          <td className="py-2.5 text-right font-mono">{a.montantFcfa.toLocaleString("fr-FR")} F</td>
                          <td className="py-2.5 text-right font-mono" style={{ color: C.greenDark }}>{a.commissionFcfa.toLocaleString("fr-FR")} F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </SectionCard>
            </div>
          )}

          {page === "alerts" && (
            <SectionCard accent={C.red} icon={<AlertTriangle size={18} />} title={`Échéances documentaires (${alerts.length})`}>
              <div className="flex flex-col">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: i < alerts.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div className="flex items-center gap-3">
                      <Car size={15} color={C.slate} />
                      <div>
                        <div className="text-sm font-medium">{a.vehicle.immatriculation} <span style={{ color: C.slate, fontWeight: 400 }}>· {a.vehicle.marque} {a.vehicle.modele}</span></div>
                        <div className="text-xs" style={{ color: C.slate }}>{a.label} — échéance {fmt(a.date)}</div>
                      </div>
                    </div>
                    <Badge status={statusOf(a.date)} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          </>
          )}
        </main>
      </div>
      )}

      {/* MODALS */}
      {showForm && <Modal onClose={() => setShowForm(false)} title="Ajouter un véhicule" wide>
        <VehicleForm auth={auth} owners={owners} drivers={drivers} syndicats={syndicats} associations={associations} garesRoutieres={garesRoutieres} commissionsMixtes={commissionsMixtes} lignes={lignes} onCancel={() => setShowForm(false)} onSave={addVehicle} addOwner={addOwner} addDriver={addDriver} affecterVehicule={affecterVehicule} />
      </Modal>}

      {ficheVehicle && <Modal onClose={closeFiche} title="Fiche d'Identification du Transporteur" wide>
        <FicheVehicule vehicle={ficheVehicle} owners={owners} drivers={drivers} commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} garesRoutieres={garesRoutieres} onClose={closeFiche} />
      </Modal>}

      {cardDriver && <Modal onClose={closeCard} title="Carte de membre — Chauffeur">
        {(() => {
          const data = cardDataFor(cardDriver, "chauffeur", commissionsMixtes, syndicats, vehicles, associations);
          return <MemberCard member={cardDriver} category="chauffeur" initialFace={cardFace} {...data} />;
        })()}
      </Modal>}

      <MemberCardSheet
        title="Planche de production, cartes de membre chauffeurs"
        items={drivers.filter((d) => selectedDriverIds.includes(d.id)).map((d) => ({
          key: d.id, name: `${d.prenoms} ${d.nom}`, member: d, category: "chauffeur",
          ...cardDataFor(d, "chauffeur", commissionsMixtes, syndicats, vehicles, associations),
        }))}
      />

      {cardOwner && <Modal onClose={() => setCardOwner(null)} title="Carte de membre — Transporteur">
        {(() => {
          const data = cardDataFor(cardOwner, "transporteur", commissionsMixtes, syndicats, vehicles, associations);
          return <MemberCard member={cardOwner} category="transporteur" {...data} />;
        })()}
      </Modal>}

      <MemberCardSheet
        title="Planche de production, cartes transporteurs"
        items={owners.filter((o) => selectedOwnerIds.includes(o.id)).map((o) => ({
          key: o.id, name: `${o.prenoms} ${o.nom}`, member: o, category: "transporteur",
          ...cardDataFor(o, "transporteur", commissionsMixtes, syndicats, vehicles, associations),
        }))}
      />

      {cardElement && <Modal onClose={() => setCardElement(null)} title="Carte de membre — Élément">
        {(() => {
          const data = cardDataFor(cardElement, "element", commissionsMixtes, syndicats, vehicles, associations);
          return <MemberCard member={cardElement} category="element" {...data} />;
        })()}
      </Modal>}

      <MemberCardSheet
        title="Planche de production, cartes éléments"
        items={elements.filter((e) => selectedElementIds.includes(e.id)).map((e) => ({
          key: e.id, name: `${e.prenoms} ${e.nom}`, member: e, category: "element",
          ...cardDataFor(e, "element", commissionsMixtes, syndicats, vehicles, associations),
        }))}
      />

      {showFuelForm && <Modal onClose={() => setShowFuelForm(false)} title="Enregistrer un achat de carburant" wide>
        <FuelPurchaseForm drivers={drivers} vehicles={vehicles} onCancel={() => setShowFuelForm(false)} onSave={async (payload) => { await addAchat(payload); setShowFuelForm(false); }} />
      </Modal>}

      {showCommissionForm && <Modal onClose={() => setShowCommissionForm(false)} title="Ajouter une commission mixte" wide>
        <CommissionMixteForm onCancel={() => setShowCommissionForm(false)} onSave={async (payload) => { await addCommission(payload); setShowCommissionForm(false); }} />
      </Modal>}

      {editCommission && <Modal onClose={() => setEditCommission(null)} title={`Modifier — ${editCommission.nom}`} wide>
        <CommissionMixteForm initialCommission={editCommission} onCancel={() => setEditCommission(null)} onSave={async (payload) => { await updateCommission(editCommission.id, payload); setEditCommission(null); }} />
      </Modal>}

      {showSyndicatFormFor && <Modal onClose={() => setShowSyndicatFormFor(null)} title="Ajouter un collectif (syndicat)" wide>
        <SyndicatForm commission={commissionsMixtes.find((c) => c.id === showSyndicatFormFor)} onCancel={() => setShowSyndicatFormFor(null)} onSave={async (payload) => { await addSyndicat(payload); setShowSyndicatFormFor(null); }} />
      </Modal>}

      {editSyndicat && <Modal onClose={() => setEditSyndicat(null)} title={`Modifier — ${editSyndicat.nom}`} wide>
        <SyndicatForm commission={commissionsMixtes.find((c) => c.id === editSyndicat.commissionMixteId)} initialSyndicat={editSyndicat} onCancel={() => setEditSyndicat(null)} onSave={async (payload) => { await updateSyndicat(editSyndicat.id, payload); setEditSyndicat(null); }} />
      </Modal>}

      {showGareRoutiereFormFor && <Modal onClose={() => setShowGareRoutiereFormFor(null)} title="Ajouter une gare routière" wide>
        <GareRoutiereForm syndicat={syndicats.find((s) => s.id === showGareRoutiereFormFor) || { id: showGareRoutiereFormFor, nom: auth.nom }} onCancel={() => setShowGareRoutiereFormFor(null)} onSave={async (payload) => { await addGareRoutiere(payload); setShowGareRoutiereFormFor(null); }} />
      </Modal>}

      {showMemberFormFor && <Modal onClose={() => setShowMemberFormFor(false)} title="Ajouter un transporteur" wide>
        <MemberForm commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} vehicles={vehicles} onCancel={() => setShowMemberFormFor(false)} onSave={async (payload, vehId) => { const created = await addOwner(payload); if (vehId) await updateVehicle(vehId, { proprietaireId: created.id }); setShowMemberFormFor(false); }} />
      </Modal>}

      {showProfileForm && (
        <Modal onClose={() => setShowProfileForm(false)} title="Mon profil" wide>
          {auth.role === "admin" ? (
            <div className="font-body text-sm flex flex-col gap-3" style={{ color: C.slate }}>
              <p>Les identifiants de l'administrateur général (identifiant et code PIN) sont définis via les variables d'environnement <code>ADMIN_LOGIN</code> et <code>ADMIN_PIN</code> sur Vercel — ils ne se modifient pas depuis cette interface.</p>
              <p>Pour les changer : Vercel → Settings → Environment Variables → modifiez <code>ADMIN_LOGIN</code> / <code>ADMIN_PIN</code>, puis redéployez.</p>
              <div className="flex justify-end pt-2">
                <button onClick={() => setShowProfileForm(false)} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ background: C.green, color: "#fff" }}>Fermer</button>
              </div>
            </div>
          ) : auth.role === "commission_mixte" ? (
            <CommissionMixteForm
              initialCommission={commissionsMixtes.find((c) => c.id === auth.commissionMixteId)}
              onCancel={() => setShowProfileForm(false)}
              onSave={async (payload) => { await updateCommission(auth.commissionMixteId, payload); setShowProfileForm(false); }}
            />
          ) : auth.role === "syndicat" ? (
            <SyndicatForm
              commission={commissionsMixtes.find((c) => c.id === auth.commissionMixteId)}
              initialSyndicat={syndicats.find((s) => s.id === auth.syndicatId)}
              onCancel={() => setShowProfileForm(false)}
              onSave={async (payload) => { await updateSyndicat(auth.syndicatId, payload); setShowProfileForm(false); }}
            />
          ) : auth.role === "gare" ? (
            <GareRoutiereForm
              syndicat={syndicats.find((s) => s.id === auth.syndicatId) || { nom: "" }}
              initialGare={garesRoutieres.find((g) => g.id === auth.gareRoutiereId)}
              onCancel={() => setShowProfileForm(false)}
              onSave={async (payload) => { await updateGareRoutiere(auth.gareRoutiereId, payload); setShowProfileForm(false); }}
            />
          ) : (
            <div className="font-body text-sm flex flex-col gap-3" style={{ color: C.slate }}>
              <p>Vos informations (identifiant, code PIN) sont gérées par votre structure de rattachement — contactez-la pour toute modification.</p>
              <div className="flex justify-end pt-2">
                <button onClick={() => setShowProfileForm(false)} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ background: C.green, color: "#fff" }}>Fermer</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {editMember && <Modal onClose={() => setEditMember(null)} title={`Modifier — ${editMember.prenoms} ${editMember.nom}`} wide>
        <MemberForm initialMember={editMember} commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} onCancel={() => setEditMember(null)} onSave={async (payload) => { await updateOwner(editMember.id, payload); setEditMember(null); }} />
      </Modal>}

      {showDriverFormFor && <Modal onClose={() => setShowDriverFormFor(false)} title="Ajouter un chauffeur" wide>
        <DriverForm commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} vehicles={vehicles} onCancel={() => setShowDriverFormFor(false)} onSave={async (payload, vehId) => {
          const created = await addDriver(payload);
          if (vehId) {
            await updateVehicle(vehId, { addChauffeurId: created.id });
            setVehicles((s) => s.map((v) => (v.id === vehId ? { ...v, chauffeurIds: [...v.chauffeurIds, created.id] } : v)));
          }
          setShowDriverFormFor(false);
        }} />
      </Modal>}

      {editDriver && <Modal onClose={() => setEditDriver(null)} title={`Modifier — ${editDriver.prenoms} ${editDriver.nom}`} wide>
        <DriverForm initialDriver={editDriver} commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} onCancel={() => setEditDriver(null)} onSave={async (payload) => { await updateDriver(editDriver.id, payload); setEditDriver(null); }} />
      </Modal>}

      {assoFormForCollectif && <Modal onClose={() => setAssoFormForCollectif(null)} title="Ajouter une association" wide>
        <AssociationForm collectif={syndicats.find((s) => s.id === assoFormForCollectif)} onCancel={() => setAssoFormForCollectif(null)} onSave={async (p) => { await addAssociation(p); setAssoFormForCollectif(null); }} />
      </Modal>}

      {editAsso && <Modal onClose={() => setEditAsso(null)} title={`Modifier — ${editAsso.nom}`} wide>
        <AssociationForm initialAsso={editAsso} collectif={syndicats.find((s) => s.id === editAsso.syndicatId)} onCancel={() => setEditAsso(null)} onSave={async (p) => { await updateAssociation(editAsso.id, p); setEditAsso(null); }} />
      </Modal>}

      {showAgentFormFor && <Modal onClose={() => setShowAgentFormFor(false)} title="Ajouter un agent enrôleur">
        <AgentForm onCancel={() => setShowAgentFormFor(false)} onSave={async (payload) => { await addAgent(payload); setShowAgentFormFor(false); }} />
      </Modal>}

      {editAgent && <Modal onClose={() => setEditAgent(null)} title={`Modifier — ${editAgent.prenoms} ${editAgent.nom}`}>
        <AgentForm initialAgent={editAgent} onCancel={() => setEditAgent(null)} onSave={async (payload) => { await updateAgent(editAgent.id, payload); setEditAgent(null); }} />
      </Modal>}

      {showElementFormFor && <Modal onClose={() => setShowElementFormFor(false)} title="Ajouter un élément" wide>
        <ElementForm commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} garesRoutieres={garesRoutieres} lignes={lignes} onCancel={() => setShowElementFormFor(false)} onSave={async (payload) => { await addElement(payload); setShowElementFormFor(false); }} />
      </Modal>}

      {editElement && <Modal onClose={() => setEditElement(null)} title={`Modifier — ${editElement.prenoms} ${editElement.nom}`} wide>
        <ElementForm initialElement={editElement} commissionsMixtes={commissionsMixtes} syndicats={syndicats} associations={associations} garesRoutieres={garesRoutieres} lignes={lignes} onCancel={() => setEditElement(null)} onSave={async (payload) => { await updateElement(editElement.id, payload); setEditElement(null); }} />
      </Modal>}

      {editGareRoutiere && <Modal onClose={() => setEditGareRoutiere(null)} title={`Modifier — ${editGareRoutiere.nom}`} wide>
        <GareRoutiereForm syndicat={syndicats.find((s) => s.id === editGareRoutiere.syndicatId) || { nom: auth.nom }} initialGare={editGareRoutiere} onCancel={() => setEditGareRoutiere(null)} onSave={async (payload) => { await updateGareRoutiere(editGareRoutiere.id, payload); setEditGareRoutiere(null); }} />
      </Modal>}

      {ligneFormGareId && <Modal onClose={() => setLigneFormGareId(null)} title="Ajouter une ligne" wide>
        <LigneForm gare={garesRoutieres.find((g) => g.id === ligneFormGareId)} onCancel={() => setLigneFormGareId(null)} onSave={async (payload) => { await addLigne(payload); setLigneFormGareId(null); }} />
      </Modal>}

      {editLigne && <Modal onClose={() => setEditLigne(null)} title="Modifier la ligne" wide>
        <LigneForm gare={garesRoutieres.find((g) => g.id === editLigne.gareRoutiereId)} initialLigne={editLigne} onCancel={() => setEditLigne(null)} onSave={async (payload) => { await updateLigne(editLigne.id, payload); setEditLigne(null); }} />
      </Modal>}

      {editVehicle && <Modal onClose={() => setEditVehicle(null)} title={`Modifier — ${editVehicle.immatriculation}`} wide>
        <VehicleEditForm vehicle={editVehicle} onCancel={() => setEditVehicle(null)} onSave={async (payload) => { await updateVehicle(editVehicle.id, payload); setEditVehicle(null); }} />
      </Modal>}

      {reassignVehicle && <Modal onClose={() => setReassignVehicle(null)} title={`Affectation — ${reassignVehicle.immatriculation}`} wide>
        <ReassignForm
          auth={auth}
          vehicle={reassignVehicle}
          commissionsMixtes={commissionsMixtes}
          lignes={lignes}
          garesRoutieres={garesRoutieres}
          currentAffectation={affectations.find((a) => a.vehiculeId === reassignVehicle.id && a.actif)}
          onCancel={() => setReassignVehicle(null)}
          onReassign={async (payload) => { await affecterVehicule(payload); setReassignVehicle(null); }}
          onUnassign={async (vehiculeId) => { await desaffecterVehicule(vehiculeId); setReassignVehicle(null); }}
        />
      </Modal>}
    </div>
  );
}

/* ============================================================
   SAISIE D'UN ACHAT CARBURANT (simule le scan du QR verso par le
   pompiste : sélection du chauffeur → carte grise + contact affichés
   automatiquement → saisie du volume et du montant)
   ============================================================ */
const FUEL_COMMISSION_RATE = 0.02; // doit rester cohérent avec handleCarburant dans api/vehicules.js

function FuelPurchaseForm({ drivers, vehicles, onCancel, onSave }) {
  const [chauffeurId, setChauffeurId] = useState(drivers[0]?.id || "");
  const [volume, setVolume] = useState("");
  const [montant, setMontant] = useState("");
  const [station, setStation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const driver = drivers.find((d) => d.id === chauffeurId);
  const vehicle = driver ? vehicles.find((v) => v.chauffeurIds.includes(driver.id)) : null;
  const commission = montant ? Math.round(Number(montant) * FUEL_COMMISSION_RATE) : 0;
  const canSave = chauffeurId && vehicle?.carteGrise && Number(volume) > 0 && Number(montant) > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        chauffeurId,
        vehiculeId: vehicle?.id || null,
        carteGrise: vehicle?.carteGrise || "",
        volumeLitres: volume,
        montantFcfa: Number(montant),
        station: station || null,
      });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        💡 En station, ce sont le scan du QR verso de la carte de membre qui identifie automatiquement le chauffeur et la carte grise sur l'application mobile du pompiste. Ce formulaire simule cette étape en attendant l'application mobile.
      </div>

      <Field label="Chauffeur (scanné)">
        <select style={inputStyle} className="font-body" value={chauffeurId} onChange={(e) => setChauffeurId(e.target.value)}>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.prenoms} {d.nom}</option>)}
        </select>
      </Field>

      {driver && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Numéro carte grise (véhicule affecté)">
            <TextInput value={vehicle?.carteGrise || ""} readOnly style={{ background: C.cream, color: C.slate }} />
          </Field>
          <Field label="Contact chauffeur">
            <TextInput value={driver.contact1 || "—"} readOnly style={{ background: C.cream, color: C.slate }} />
          </Field>
        </div>
      )}
      {driver && !vehicle?.carteGrise && (
        <p className="font-body text-xs" style={{ color: C.red }}>Ce chauffeur n'est rattaché à aucun véhicule avec une carte grise renseignée.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Volume acheté (litres)"><TextInput type="number" min="0" step="0.01" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="45.5" /></Field>
        <Field label="Montant saisi par le pompiste (FCFA)"><TextInput type="number" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="30000" /></Field>
      </div>
      <Field label="Station (optionnel)"><TextInput value={station} onChange={(e) => setStation(e.target.value)} placeholder="Station Total Yopougon" /></Field>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: C.greenLight }}>
        <span className="font-body text-sm" style={{ color: C.greenDark }}>Commission Mutuelle ({(FUEL_COMMISSION_RATE * 100).toFixed(0)}%)</span>
        <span className="font-mono font-semibold" style={{ color: C.greenDark }}>{commission.toLocaleString("fr-FR")} FCFA</span>
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
          style={{ background: canSave ? C.orange : "#D8B48A", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}
        >
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer l'achat"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   GARE — formulaire d'ajout
   ============================================================ */
function CommissionMixteForm({ initialCommission, onCancel, onSave }) {
  const isEdit = !!initialCommission;
  const [nom, setNom] = useState(initialCommission?.nom || "");
  const [sigle, setSigle] = useState(initialCommission?.sigle || "");
  const [logoUrl, setLogoUrl] = useState(initialCommission?.logoUrl || null);
  const [commune, setCommune] = useState(initialCommission?.commune || "");
  const [localisation, setLocalisation] = useState(initialCommission?.localisation || "");
  const [latitude, setLatitude] = useState(initialCommission?.latitude ?? "");
  const [longitude, setLongitude] = useState(initialCommission?.longitude ?? "");
  const [presidentNom, setPresidentNom] = useState(initialCommission?.presidentNom || "");
  const [presidentContact, setPresidentContact] = useState(initialCommission?.presidentContact || "");
  const [login, setLogin] = useState(initialCommission?.login || "");
  const [pinCode, setPinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pinValid = !pinCode || /^\d{4}$/.test(pinCode);
  const latValid = !latitude || (Number(latitude) >= -90 && Number(latitude) <= 90);
  const lngValid = !longitude || (Number(longitude) >= -180 && Number(longitude) <= 180);
  const canSave = nom && commune && pinValid && latValid && lngValid && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nom, sigle, logoUrl, commune, localisation, latitude, longitude, presidentNom, presidentContact, login, pinCode });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PhotoUpload value={logoUrl} onChange={setLogoUrl} label="Logo de la commission mixte" shape="square" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de la commission mixte"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Commission Mixte de Yopougon" /></Field>
        <Field label="Sigle" hint="Affiché sur le tableau de bord (nom souvent trop long)"><TextInput value={sigle} onChange={(e) => setSigle(e.target.value)} placeholder="CMY" maxLength={20} /></Field>
      </div>
      <Field label="Commune"><TextInput value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Yopougon" /></Field>
      <Field label="Localisation (adresse / repère)"><TextInput value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Carrefour Sicogi, près du marché" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitude" hint="Coordonnées GPS — via Google Maps"><TextInput type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="5.345317" /></Field>
        <Field label="Longitude"><TextInput type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-4.076083" /></Field>
      </div>
      {!latValid && <p className="font-body text-xs" style={{ color: C.red }}>La latitude doit être comprise entre -90 et 90 (ex. 5.345317 pour Abidjan).</p>}
      {!lngValid && <p className="font-body text-xs" style={{ color: C.red }}>La longitude doit être comprise entre -180 et 180 (ex. -4.076083 pour Abidjan).</p>}
      {latitude && longitude && latValid && lngValid && (
        <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="font-body text-xs font-semibold flex items-center gap-1.5" style={{ color: C.green }}>
          <MapPin size={13} /> Vérifier cet emplacement sur Google Maps
        </a>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du président"><TextInput value={presidentNom} onChange={(e) => setPresidentNom(e.target.value)} /></Field>
        <Field label="Contact du président"><TextInput value={presidentContact} onChange={(e) => setPresidentContact(e.target.value)} /></Field>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs mb-3" style={{ color: C.slate }}>
          Compte de la commission mixte (créé par l'administrateur général COMIX-CI) — accès en lecture sur ses syndicats et leurs membres.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Login (numéro de téléphone)"><TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="07 08 12 34 56" /></Field>
          <Field label="Code PIN (4 chiffres)" hint={isEdit ? "Laisser vide pour conserver le PIN actuel" : undefined}>
            <TextInput
              value={pinCode}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={isEdit ? "••••" : "0000"}
            />
          </Field>
        </div>
        {!pinValid && <p className="font-body text-xs mt-1.5" style={{ color: C.red }}>Le code PIN doit comporter exactement 4 chiffres.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.orange : "#D8B48A", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer la commission mixte"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   LIGNE — formulaire d'ajout, rattaché à une commission mixte
   ============================================================ */
/* ============================================================
   SYNDICAT — formulaire d'ajout, rattaché à une commission mixte
   ============================================================ */
function SyndicatForm({ commission, initialSyndicat, onCancel, onSave }) {
  const isEdit = !!initialSyndicat;
  const [nom, setNom] = useState(initialSyndicat?.nom || "");
  const [sigle, setSigle] = useState(initialSyndicat?.sigle || "");
  const [logoUrl, setLogoUrl] = useState(initialSyndicat?.logoUrl || null);
  const [commune, setCommune] = useState(initialSyndicat?.commune || "");
  const [type, setType] = useState(initialSyndicat?.type || "");
  const [presidentNom, setPresidentNom] = useState(initialSyndicat?.presidentNom || "");
  const [presidentContact, setPresidentContact] = useState(initialSyndicat?.presidentContact || "");
  const [login, setLogin] = useState(initialSyndicat?.login || "");
  const [pinCode, setPinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pinValid = !pinCode || /^\d{4}$/.test(pinCode);
  const canSave = nom && pinValid && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ commissionMixteId: commission.id, nom, sigle, logoUrl, commune, type, presidentNom, presidentContact, login, pinCode });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Collectif (syndicat) rattaché à <strong>{commission?.nom}</strong> ({commission?.commune})
      </p>
      <PhotoUpload value={logoUrl} onChange={setLogoUrl} label="Logo du collectif (syndicat)" shape="square" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du collectif (syndicat)"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Syndicat des Transporteurs de Yopougon" /></Field>
        <Field label="Sigle" hint="Affiché sur le tableau de bord"><TextInput value={sigle} onChange={(e) => setSigle(e.target.value)} placeholder="STY" maxLength={20} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Commune">
          <select style={inputStyle} className="font-body" value={commune} onChange={(e) => setCommune(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Type de collectif" hint="Détermine quelle carte de membre affichera ce logo">
          <select style={inputStyle} className="font-body" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {SYNDICAT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du président"><TextInput value={presidentNom} onChange={(e) => setPresidentNom(e.target.value)} /></Field>
        <Field label="Contact du président"><TextInput value={presidentContact} onChange={(e) => setPresidentContact(e.target.value)} /></Field>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs mb-3" style={{ color: C.slate }}>
          Compte du syndicat (créé par l'administrateur général COMIX-CI) — permet au syndicat de gérer lui-même ses membres (véhicules, chauffeurs, propriétaires).
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Login (numéro de téléphone)"><TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="07 08 12 34 56" /></Field>
          <Field label="Code PIN (4 chiffres)" hint={isEdit ? "Laisser vide pour conserver le PIN actuel" : undefined}>
            <TextInput
              value={pinCode}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={isEdit ? "••••" : "0000"}
            />
          </Field>
        </div>
        {!pinValid && <p className="font-body text-xs mt-1.5" style={{ color: C.red }}>Le code PIN doit comporter exactement 4 chiffres.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer le collectif (syndicat)"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   GARE ROUTIÈRE — formulaire d'ajout, créée par le syndicat lui-même
   ============================================================ */
/* ============================================================
   MEMBRE (Transporteur) — ajout autonome depuis le dashboard syndicat,
   sans passer par la création d'un véhicule.
   ============================================================ */
/* ============================================================
   SÉLECTEUR DE LOGO — pour choisir le "premier collectif" (droite)
   et le "deuxième collectif" (gauche) affichés sur une carte de membre.
   Liste combinée Commissions Mixtes + Syndicats.
   ============================================================ */
/* ============================================================
   COMMUNE → COMMISSION MIXTE
   Il existe une commission mixte par commune : choisir la commune
   selectionne donc automatiquement la commission mixte correspondante.
   La commune pilote aussi la liste des collectifs proposes pour les logos.
   ============================================================ */
function findCommissionForCommune(commune, commissionsMixtes) {
  if (!commune) return null;
  const norm = (s) => (s || "").trim().toUpperCase();
  return commissionsMixtes.find((c) => norm(c.commune) === norm(commune)) || null;
}

function CommuneCommissionSelector({ commune, onChange, commissionsMixtes, required }) {
  const commission = findCommissionForCommune(commune, commissionsMixtes);
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label={`Commune${required ? " *" : ""}`}>
        <select
          style={inputStyle}
          className="font-body"
          value={commune || ""}
          onChange={(e) => {
            const v = e.target.value;
            const found = findCommissionForCommune(v, commissionsMixtes);
            onChange(v, found ? found.id : "");
          }}
        >
          <option value="">— Sélectionner —</option>
          {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Commission mixte" hint="Déterminée automatiquement par la commune">
        <div
          className="font-body flex items-center gap-2"
          style={{ ...inputStyle, background: C.cream, color: commission ? C.ink : C.slate, display: "flex", alignItems: "center" }}
        >
          {commission ? (
            <>
              {commission.logoUrl && <img src={commission.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />}
              <span>{commission.sigle || commission.nom}</span>
            </>
          ) : (
            <span>{commune ? "Aucune commission mixte pour cette commune" : "Choisissez d'abord une commune"}</span>
          )}
        </div>
      </Field>
    </div>
  );
}

/* ============================================================
   LOGOS DE LA CARTE — hierarchie stricte
     Commune -> Commission mixte -> Collectif (transporteurs |
     chauffeurs) -> Association (syndicat de base)
   Logo en haut A GAUCHE  = le collectif  (2 choix par commune)
   Logo en haut A DROITE  = l'association (dependante du collectif)
   ============================================================ */
const COMMUNE_EQ = (a, b) => (a || "").trim().toUpperCase() === (b || "").trim().toUpperCase();

function LogoPreview({ entity }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {entity?.logoUrl ? <img src={entity.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={16} color={C.slate} />}
    </div>
  );
}

/* Logo en haut A GAUCHE : le collectif de la commune choisie. */
function libelleCollectif(s) {
  const base = s.type === "transporteurs" ? "Collectif des transporteurs"
    : s.type === "chauffeurs" ? "Collectif des chauffeurs"
    : (s.nom || "Collectif");
  return s.sigle ? `${base} — ${s.sigle}` : base;
}

function CollectifSelector({ collectifId, onChange, syndicats, commune }) {
  // La commune met en avant ses collectifs, mais n'en masque AUCUN : un
  // collectif dont la commune n'a pas ete renseignee, ou orthographiee
  // autrement, resterait sinon introuvable.
  const deLaCommune = commune ? syndicats.filter((s) => COMMUNE_EQ(s.commune, commune)) : [];
  const autres = commune ? syndicats.filter((s) => !COMMUNE_EQ(s.commune, commune)) : syndicats;
  const entity = syndicats.find((s) => s.id === collectifId) || null;
  return (
    <Field label="" hint="Collectif des transporteurs ou des chauffeurs. C'est aussi l'association de rattachement du membre.">
      <div className="flex items-center gap-2">
        <LogoPreview entity={entity} />
        <select style={commune ? inputStyle : inputDisabledStyle} className="font-body" value={collectifId || ""} onChange={(e) => onChange(e.target.value)} disabled={!commune}>
          <option value="">{commune ? "— Sélectionner —" : "— Choisissez d'abord une commune —"}</option>
          {deLaCommune.length > 0 && (
            <optgroup label={`Collectifs de ${commune}`}>
              {deLaCommune.map((s) => <option key={s.id} value={s.id}>{libelleCollectif(s)}</option>)}
            </optgroup>
          )}
          {autres.length > 0 && (
            <optgroup label={deLaCommune.length > 0 ? "Autres collectifs" : "Tous les collectifs"}>
              {autres.map((s) => (
                <option key={s.id} value={s.id}>
                  {libelleCollectif(s)}{s.commune ? ` (${s.commune})` : " (commune non renseignée)"}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      {commune && syndicats.length === 0 && (
        <p className="font-body text-xs mt-1" style={{ color: C.amber }}>
          Aucun collectif enregistré — créez-en un depuis la page "Collectifs (Syndicats)".
        </p>
      )}
    </Field>
  );
}

/* Logo en haut A DROITE : l'association rattachee au collectif choisi. */
function AssociationSelector({ associationId, onChange, associations, collectifId, syndicats = [] }) {
  // Meme principe : les associations du collectif choisi en tete, toutes
  // les autres restent accessibles dessous (une association rattachee par
  // erreur a un autre collectif doit pouvoir etre retrouvee et corrigee).
  const duCollectif = collectifId ? associations.filter((a) => a.syndicatId === collectifId) : [];
  const autres = collectifId ? associations.filter((a) => a.syndicatId !== collectifId) : associations;
  const entity = associations.find((a) => a.id === associationId) || null;
  const nomCollectif = (id) => {
    const s = syndicats.find((x) => x.id === id);
    return s ? (s.sigle || s.nom) : "collectif inconnu";
  };
  return (
    <Field label="" hint="Syndicat de base rattaché au collectif choisi">
      <div className="flex items-center gap-2">
        <LogoPreview entity={entity} />
        <select style={collectifId ? inputStyle : inputDisabledStyle} className="font-body" value={associationId || ""} onChange={(e) => onChange(e.target.value)} disabled={!collectifId}>
          <option value="">{collectifId ? "— Sélectionner —" : "— Choisissez d'abord un collectif —"}</option>
          {duCollectif.length > 0 && (
            <optgroup label="Associations de ce collectif">
              {duCollectif.map((a) => <option key={a.id} value={a.id}>{a.sigle ? `${a.sigle} — ${a.nom}` : a.nom}</option>)}
            </optgroup>
          )}
          {autres.length > 0 && (
            <optgroup label={duCollectif.length > 0 ? "Autres associations" : "Toutes les associations"}>
              {autres.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.sigle ? `${a.sigle} — ${a.nom}` : a.nom} ({nomCollectif(a.syndicatId)})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      {collectifId && associations.length === 0 && (
        <p className="font-body text-xs mt-1" style={{ color: C.amber }}>
          Aucune association enregistrée — ajoutez-en une depuis la page "Collectifs (Syndicats)".
        </p>
      )}
    </Field>
  );
}

/* Bloc complet reutilise par les 4 formulaires : commune -> commission
   mixte -> collectif (gauche) -> association (droite). */
function EtapeBadge({ n, actif, children }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
      <span
        className="font-display"
        style={{
          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
          background: actif ? C.green : "#D7D3C8", color: "#fff",
          fontSize: 12, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {n}
      </span>
      <span className="font-display" style={{ fontSize: 13, fontWeight: 800, color: actif ? C.ink : C.slate, letterSpacing: -0.1 }}>
        {children}
      </span>
    </div>
  );
}

function AppartenanceBlock({ commune, commissionMixteId, onCommune, logo2Id, onCollectif, logo1Id, onAssociation, commissionsMixtes, syndicats, associations }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderLeft: `5px solid ${C.orange}`, borderRadius: 14, padding: 16 }}>
      <div className="font-display" style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 12, letterSpacing: -0.2 }}>
        Appartenance du membre
      </div>

      <EtapeBadge n="1" actif>Commune et commission mixte</EtapeBadge>
      <CommuneCommissionSelector commune={commune} onChange={onCommune} commissionsMixtes={commissionsMixtes} />

      <div style={{ height: 14 }} />
      <EtapeBadge n="2" actif={!!commune}>Collectif — logo à gauche</EtapeBadge>
      <CollectifSelector collectifId={logo2Id} onChange={onCollectif} syndicats={syndicats} commune={commune} />

      <div style={{ height: 14 }} />
      <EtapeBadge n="3" actif={!!logo2Id}>Association — logo à droite</EtapeBadge>
      <AssociationSelector associationId={logo1Id} onChange={onAssociation} associations={associations} collectifId={logo2Id} syndicats={syndicats} />
    </div>
  );
}

function MemberForm({ initialMember, commissionsMixtes, syndicats, associations, vehicles, onCancel, onSave }) {
  const isEdit = !!initialMember;
  const [nom, setNom] = useState(initialMember?.nom || "");
  const [prenoms, setPrenoms] = useState(initialMember?.prenoms || "");
  const [cni, setCni] = useState(initialMember?.cni || "");
  const [numeroPermis, setNumeroPermis] = useState(initialMember?.numeroPermis || "");
  const [contact1, setContact1] = useState(initialMember?.contact1 || "");
  const [contact2, setContact2] = useState(initialMember?.contact2 || "");
  const [contact3, setContact3] = useState(initialMember?.contact3 || "");
  const [email, setEmail] = useState(initialMember?.email || "");
  const [ville, setVille] = useState(initialMember?.ville || "");
  const [quartier, setQuartier] = useState(initialMember?.quartier || "");
  const [photo, setPhoto] = useState(initialMember?.photo || null);
  const [qrPaiement, setQrPaiement] = useState(initialMember?.qrPaiement || null);
  const [associationId, setAssociationId] = useState(
    initialMember?.associationId
    || (initialMember?.logo1Type === "association" ? initialMember.logo1Id : "")
    || ""
  );
  const [syndicatId, setSyndicatId] = useState(initialMember?.syndicatId || "");
  const [commune, setCommune] = useState(initialMember?.commune || "");
  const [commissionMixteId, setCommissionMixteId] = useState(initialMember?.commissionMixteId || "");
  const [logo1Type, setLogo1Type] = useState(initialMember?.logo1Type || "");
  const [logo1Id, setLogo1Id] = useState(initialMember?.logo1Id || "");
  const [logo2Type, setLogo2Type] = useState(initialMember?.logo2Type || "");
  const [logo2Id, setLogo2Id] = useState(initialMember?.logo2Id || "");
  const [vehiculeId, setVehiculeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const vehiculesSansProprietaire = (vehicles || []).filter((v) => !v.proprietaireId);
  const canSave = nom && prenoms && cni && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nom, prenoms, cni, numeroPermis, contact1, contact2, contact3, email, ville, quartier, photo, qrPaiement, logo1Type, logo1Id, logo2Type, logo2Id, commune, commissionMixteId, syndicatId, associationId }, vehiculeId || null);
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <PhotoUpload value={photo} onChange={setPhoto} label="Photo du transporteur" />
        <PhotoUpload value={qrPaiement} onChange={setQrPaiement} label="QR code Mobile Money (compte marchand)" shape="square" />
      </div>
      <AppartenanceBlock
        commune={commune}
        commissionMixteId={commissionMixteId}
        onCommune={(cm, cid) => { setCommune(cm); setCommissionMixteId(cid); setLogo2Type(""); setLogo2Id(""); setLogo1Type(""); setLogo1Id(""); setSyndicatId(""); setAssociationId(""); }}
        logo2Id={logo2Id}
        onCollectif={(v) => { setLogo2Type(v ? "syndicat" : ""); setLogo2Id(v); setSyndicatId(v); setLogo1Type(""); setLogo1Id(""); setAssociationId(""); }}
        logo1Id={logo1Id}
        onAssociation={(v) => { setLogo1Type(v ? "association" : ""); setLogo1Id(v); setAssociationId(v); }}
        commissionsMixtes={commissionsMixtes}
        syndicats={syndicats}
        associations={associations}
      />
      {!isEdit && vehicles && (
        <Field label="Véhicule à rattacher (optionnel)" hint="Le dossier peut aussi être complété plus tard depuis la fiche du véhicule.">
          <select style={inputStyle} className="font-body" value={vehiculeId} onChange={(e) => setVehiculeId(e.target.value)}>
            <option value="">— Aucun pour l'instant —</option>
            {vehiculesSansProprietaire.map((v) => <option key={v.id} value={v.id}>{v.immatriculation} — {v.carteGrise}</option>)}
          </select>
          {vehiculesSansProprietaire.length === 0 && (
            <p className="font-body text-xs mt-1" style={{ color: C.slate }}>
              {(vehicles || []).length === 0
                ? "Aucun véhicule enregistré pour le moment — créez d'abord le dossier véhicule."
                : `Les ${vehicles.length} véhicule(s) enregistré(s) ont déjà un transporteur. Un véhicule n'en a qu'un seul : créez le dossier véhicule d'abord, ou changez son transporteur depuis sa fiche.`}
            </p>
          )}
        </Field>
      )}
      {isEdit && initialMember?.carteTransporteurNumero && (
        <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
          N° carte transporteur (généré automatiquement) : <strong className="font-mono">{initialMember.carteTransporteurNumero}</strong>
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        <Field label="Prénoms"><TextInput value={prenoms} onChange={(e) => setPrenoms(e.target.value)} /></Field>
        <Field label="Numéro CNI"><TextInput value={cni} onChange={(e) => setCni(e.target.value)} /></Field>
        <Field label="Numéro permis de conduire"><TextInput value={numeroPermis} onChange={(e) => setNumeroPermis(e.target.value)} /></Field>
        <Field label="Adresse email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contact 1"><TextInput value={contact1} onChange={(e) => setContact1(e.target.value)} /></Field>
        <Field label="Contact 2"><TextInput value={contact2} onChange={(e) => setContact2(e.target.value)} /></Field>
        <Field label="Contact 3"><TextInput value={contact3} onChange={(e) => setContact3(e.target.value)} /></Field>
        <Field label="Ville de résidence"><TextInput value={ville} onChange={(e) => setVille(e.target.value)} /></Field>
        <Field label="Quartier"><TextInput value={quartier} onChange={(e) => setQuartier(e.target.value)} /></Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer le transporteur"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ÉLÉMENT — 3e catégorie de membre (employé du collectif des
   transporteurs ou des chauffeurs), avec sa propre carte violette
   ... non, orange/vert (palette CI) et sa propre codification (E...).
   ============================================================ */
/* ============================================================
   CHAUFFEUR — formulaire d'ajout/modification autonome, sans passer
   par la création d'un véhicule.
   ============================================================ */
function DriverForm({ initialDriver, commissionsMixtes, syndicats, associations, vehicles, onCancel, onSave }) {
  const isEdit = !!initialDriver;
  const [nom, setNom] = useState(initialDriver?.nom || "");
  const [prenoms, setPrenoms] = useState(initialDriver?.prenoms || "");
  const [cni, setCni] = useState(initialDriver?.cni || "");
  const [permisNumero, setPermisNumero] = useState(initialDriver?.permisNumero || "");
  const [permisDateFin, setPermisDateFin] = useState(initialDriver?.permisDateFin || "");
  const [contact1, setContact1] = useState(initialDriver?.contact1 || "");
  const [contact2, setContact2] = useState(initialDriver?.contact2 || "");
  const [contact3, setContact3] = useState(initialDriver?.contact3 || "");
  const [email, setEmail] = useState(initialDriver?.email || "");
  const [photo, setPhoto] = useState(initialDriver?.photo || null);
  const [qrPaiement, setQrPaiement] = useState(initialDriver?.qrPaiement || null);
  const [associationId, setAssociationId] = useState(
    initialDriver?.associationId
    || (initialDriver?.logo1Type === "association" ? initialDriver.logo1Id : "")
    || ""
  );
  const [syndicatId, setSyndicatId] = useState(initialDriver?.syndicatId || "");
  const [commune, setCommune] = useState(initialDriver?.commune || "");
  const [commissionMixteId, setCommissionMixteId] = useState(initialDriver?.commissionMixteId || "");
  const [logo1Type, setLogo1Type] = useState(initialDriver?.logo1Type || "");
  const [logo1Id, setLogo1Id] = useState(initialDriver?.logo1Id || "");
  const [logo2Type, setLogo2Type] = useState(initialDriver?.logo2Type || "");
  const [logo2Id, setLogo2Id] = useState(initialDriver?.logo2Id || "");
  const [vehiculeId, setVehiculeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = nom && prenoms && cni && permisNumero && permisDateFin && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nom, prenoms, cni, permisNumero, permisDateFin, contact1, contact2, contact3, email, photo, qrPaiement, logo1Type, logo1Id, logo2Type, logo2Id, commune, commissionMixteId, syndicatId, associationId }, vehiculeId || null);
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <PhotoUpload value={photo} onChange={setPhoto} label="Photo du chauffeur" />
        <PhotoUpload value={qrPaiement} onChange={setQrPaiement} label="QR code Mobile Money (compte marchand)" shape="square" />
      </div>
      <AppartenanceBlock
        commune={commune}
        commissionMixteId={commissionMixteId}
        onCommune={(cm, cid) => { setCommune(cm); setCommissionMixteId(cid); setLogo2Type(""); setLogo2Id(""); setLogo1Type(""); setLogo1Id(""); setSyndicatId(""); setAssociationId(""); }}
        logo2Id={logo2Id}
        onCollectif={(v) => { setLogo2Type(v ? "syndicat" : ""); setLogo2Id(v); setSyndicatId(v); setLogo1Type(""); setLogo1Id(""); setAssociationId(""); }}
        logo1Id={logo1Id}
        onAssociation={(v) => { setLogo1Type(v ? "association" : ""); setLogo1Id(v); setAssociationId(v); }}
        commissionsMixtes={commissionsMixtes}
        syndicats={syndicats}
        associations={associations}
      />
      {!isEdit && vehicles && (
        <Field label="Véhicule à rattacher (optionnel)" hint="Un véhicule peut avoir jusqu'à 3 chauffeurs — le dossier peut aussi être complété plus tard.">
          <select style={inputStyle} className="font-body" value={vehiculeId} onChange={(e) => setVehiculeId(e.target.value)}>
            <option value="">— Aucun pour l'instant —</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.immatriculation} — {v.carteGrise}</option>)}
          </select>
        </Field>
      )}
      {isEdit && initialDriver?.numeroCarte && (
        <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
          N° carte chauffeur (généré automatiquement) : <strong className="font-mono">{initialDriver.numeroCarte}</strong>
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        <Field label="Prénoms"><TextInput value={prenoms} onChange={(e) => setPrenoms(e.target.value)} /></Field>
        <Field label="Numéro CNI"><TextInput value={cni} onChange={(e) => setCni(e.target.value)} /></Field>
        <Field label="Numéro permis de conduire"><TextInput value={permisNumero} onChange={(e) => setPermisNumero(e.target.value)} /></Field>
        <Field label="Fin de validité du permis"><DateInput value={permisDateFin} onChange={(e) => setPermisDateFin(e.target.value)} /></Field>
        <Field label="Adresse email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contact 1"><TextInput value={contact1} onChange={(e) => setContact1(e.target.value)} /></Field>
        <Field label="Contact 2"><TextInput value={contact2} onChange={(e) => setContact2(e.target.value)} /></Field>
        <Field label="Contact 3"><TextInput value={contact3} onChange={(e) => setContact3(e.target.value)} /></Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer le chauffeur"}
        </button>
      </div>
    </div>
  );
}

function ElementForm({ initialElement, commissionsMixtes, syndicats, associations, garesRoutieres, lignes, onCancel, onSave }) {
  const isEdit = !!initialElement;
  const [nom, setNom] = useState(initialElement?.nom || "");
  const [prenoms, setPrenoms] = useState(initialElement?.prenoms || "");
  const [cni, setCni] = useState(initialElement?.cni || "");
  const [fonction, setFonction] = useState(initialElement?.fonction || "");
  const [contact1, setContact1] = useState(initialElement?.contact1 || "");
  const [contact2, setContact2] = useState(initialElement?.contact2 || "");
  const [contact3, setContact3] = useState(initialElement?.contact3 || "");
  const [email, setEmail] = useState(initialElement?.email || "");
  const [photo, setPhoto] = useState(initialElement?.photo || null);
  const [qrPaiement, setQrPaiement] = useState(initialElement?.qrPaiement || null);
  const [commune, setCommune] = useState(initialElement?.commune || "");
  const [commissionMixteId, setCommissionMixteId] = useState(initialElement?.commissionMixteId || "");
  const [logo1Type, setLogo1Type] = useState(initialElement?.logo1Type || "");
  const [logo1Id, setLogo1Id] = useState(initialElement?.logo1Id || "");
  const [logo2Type, setLogo2Type] = useState(initialElement?.logo2Type || "");
  const [logo2Id, setLogo2Id] = useState(initialElement?.logo2Id || "");
  const [gareRoutiereId, setGareRoutiereId] = useState(initialElement?.gareRoutiereId || "");
  const [ligneId, setLigneId] = useState(initialElement?.ligneId || "");
  const [associationId, setAssociationId] = useState(
    initialElement?.associationId
    || (initialElement?.logo1Type === "association" ? initialElement.logo1Id : "")
    || ""
  );
  const [syndicatId, setSyndicatId] = useState(initialElement?.syndicatId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const lignesDeLaGare = lignes.filter((l) => l.gareRoutiereId === gareRoutiereId);
  const canSave = nom && prenoms && cni && syndicatId && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nom, prenoms, cni, fonction, contact1, contact2, contact3, email, photo, qrPaiement, logo1Type, logo1Id, logo2Type, logo2Id, gareRoutiereId, ligneId, syndicatId, commune, commissionMixteId, associationId });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <PhotoUpload value={photo} onChange={setPhoto} label="Photo de l'élément" />
        <PhotoUpload value={qrPaiement} onChange={setQrPaiement} label="QR code Mobile Money (compte marchand)" shape="square" />
      </div>
      <AppartenanceBlock
        commune={commune}
        commissionMixteId={commissionMixteId}
        onCommune={(cm, cid) => { setCommune(cm); setCommissionMixteId(cid); setLogo2Type(""); setLogo2Id(""); setLogo1Type(""); setLogo1Id(""); setSyndicatId(""); setAssociationId(""); }}
        logo2Id={logo2Id}
        onCollectif={(v) => { setLogo2Type(v ? "syndicat" : ""); setLogo2Id(v); setSyndicatId(v); setLogo1Type(""); setLogo1Id(""); setAssociationId(""); }}
        logo1Id={logo1Id}
        onAssociation={(v) => { setLogo1Type(v ? "association" : ""); setLogo1Id(v); setAssociationId(v); }}
        commissionsMixtes={commissionsMixtes}
        syndicats={syndicats}
        associations={associations}
      />
      {isEdit && initialElement?.numeroCarte && (
        <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
          N° carte élément (généré automatiquement) : <strong className="font-mono">{initialElement.numeroCarte}</strong>
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        <Field label="Prénoms"><TextInput value={prenoms} onChange={(e) => setPrenoms(e.target.value)} /></Field>
        <Field label="Numéro CNI"><TextInput value={cni} onChange={(e) => setCni(e.target.value)} /></Field>
        <Field label="Fonction / Poste"><TextInput value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Agent recenseur, Secrétaire…" /></Field>
        <Field label="Adresse email"><TextInput value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contact 1"><TextInput value={contact1} onChange={(e) => setContact1(e.target.value)} /></Field>
        <Field label="Contact 2"><TextInput value={contact2} onChange={(e) => setContact2(e.target.value)} /></Field>
        <Field label="Contact 3"><TextInput value={contact3} onChange={(e) => setContact3(e.target.value)} /></Field>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs font-semibold mb-3" style={{ color: C.ink }}>Rattachement (optionnel)</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Gare routière">
            <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => { setGareRoutiereId(e.target.value); setLigneId(""); }}>
              <option value="">— Aucune —</option>
              {garesRoutieres.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
            </select>
          </Field>
          <Field label="Ligne">
            <select style={gareRoutiereId ? inputStyle : inputDisabledStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!gareRoutiereId}>
              <option value="">— Aucune —</option>
              {lignesDeLaGare.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer l'élément"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   AGENT ENRÔLEUR — compte individuel créé depuis une commission
   mixte, un collectif (syndicat), ou l'admin général. Rôle unique :
   enrôler des membres et générer leurs cartes.
   ============================================================ */
function AssociationForm({ initialAsso, collectif, onCancel, onSave }) {
  const isEdit = !!initialAsso;
  const [nom, setNom] = useState(initialAsso?.nom || "");
  const [sigle, setSigle] = useState(initialAsso?.sigle || "");
  const [logoUrl, setLogoUrl] = useState(initialAsso?.logoUrl || null);
  const [presidentNom, setPresidentNom] = useState(initialAsso?.presidentNom || "");
  const [presidentContact, setPresidentContact] = useState(initialAsso?.presidentContact || "");
  const [login, setLogin] = useState(initialAsso?.login || "");
  const [pinCode, setPinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const pinValide = !pinCode || /^\d{4}$/.test(pinCode);
  const canSave = nom && pinValide && !saving;

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      await onSave({ syndicatId: collectif.id, nom, sigle, logoUrl, presidentNom, presidentContact, login, pinCode });
    } catch (err) { setError(err.message || "Erreur lors de l'enregistrement."); setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Association rattachée au collectif <strong>{collectif?.sigle || collectif?.nom}</strong>
        {collectif?.commune ? ` (${collectif.commune})` : ""}
      </p>
      <PhotoUpload value={logoUrl} onChange={setLogoUrl} label="Logo de l'association" shape="square" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de l'association"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Syndicat des conducteurs de Niangon" /></Field>
        <Field label="Sigle" hint="Affiché sur la carte"><TextInput value={sigle} onChange={(e) => setSigle(e.target.value)} maxLength={20} /></Field>
        <Field label="Nom du président"><TextInput value={presidentNom} onChange={(e) => setPresidentNom(e.target.value)} /></Field>
        <Field label="Contact du président"><TextInput value={presidentContact} onChange={(e) => setPresidentContact(e.target.value)} /></Field>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs font-semibold mb-3" style={{ color: C.ink }}>
          Compte de connexion (optionnel) — permet à l'association de consulter ses propres enrôlements
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Identifiant"><TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex. numéro de téléphone" /></Field>
          <Field label={initialAsso ? "Nouveau code PIN (vide = inchangé)" : "Code PIN (4 chiffres)"}>
            <TextInput value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
          </Field>
        </div>
        {!pinValide && <p className="font-body text-xs mt-1" style={{ color: C.red }}>Le code PIN doit comporter 4 chiffres.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer l'association"}
        </button>
      </div>
    </div>
  );
}

function AgentForm({ initialAgent, onCancel, onSave }) {
  const isEdit = !!initialAgent;
  const [nom, setNom] = useState(initialAgent?.nom || "");
  const [prenoms, setPrenoms] = useState(initialAgent?.prenoms || "");
  const [contact1, setContact1] = useState(initialAgent?.contact1 || "");
  const [login, setLogin] = useState(initialAgent?.login || "");
  const [pinCode, setPinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = nom && prenoms && login && (isEdit ? true : pinCode.length === 4) && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { nom, prenoms, contact1, login };
      if (pinCode) payload.pinCode = pinCode;
      await onSave(payload);
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        <Field label="Prénoms"><TextInput value={prenoms} onChange={(e) => setPrenoms(e.target.value)} /></Field>
        <Field label="Contact"><TextInput value={contact1} onChange={(e) => setContact1(e.target.value)} /></Field>
        <Field label="Identifiant de connexion"><TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex. numéro de téléphone" /></Field>
        <Field label={isEdit ? "Nouveau code PIN (laisser vide pour ne pas changer)" : "Code PIN (4 chiffres)"}>
          <TextInput value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Créer l'agent"}
        </button>
      </div>
    </div>
  );
}

function GareRoutiereForm({ syndicat, initialGare, onCancel, onSave }) {
  const isEdit = !!initialGare;
  const [nom, setNom] = useState(initialGare?.nom || "");
  const [sigle, setSigle] = useState(initialGare?.sigle || "");
  const [logoUrl, setLogoUrl] = useState(initialGare?.logoUrl || null);
  const [login, setLogin] = useState(initialGare?.login || "");
  const [pinCode, setPinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pinValid = !pinCode || /^\d{4}$/.test(pinCode);
  const canSave = nom && pinValid && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ syndicatId: syndicat.id, nom, sigle, logoUrl, login, pinCode });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Gare routière rattachée au syndicat <strong>{syndicat?.nom}</strong>
      </p>
      <PhotoUpload value={logoUrl} onChange={setLogoUrl} label="Logo de la gare routière" shape="square" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de la gare routière"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Gare de Yopougon Sicogi" /></Field>
        <Field label="Sigle" hint="Affiché sur le tableau de bord"><TextInput value={sigle} onChange={(e) => setSigle(e.target.value)} placeholder="GYS" maxLength={20} /></Field>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs mb-3" style={{ color: C.slate }}>
          Compte de la gare routière (optionnel) — pour un futur accès dédié.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Login (numéro de téléphone)"><TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="07 08 12 34 56" /></Field>
          <Field label="Code PIN (4 chiffres)" hint={isEdit ? "Laisser vide pour conserver le PIN actuel" : undefined}>
            <TextInput
              value={pinCode}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={isEdit ? "••••" : "0000"}
            />
          </Field>
        </div>
        {!pinValid && <p className="font-body text-xs mt-1.5" style={{ color: C.red }}>Le code PIN doit comporter exactement 4 chiffres.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer la gare routière"}
        </button>
      </div>
    </div>
  );
}

function LigneForm({ gare, initialLigne, onCancel, onSave }) {
  const isEdit = !!initialLigne;
  const [lieuDepart, setLieuDepart] = useState(initialLigne?.lieuDepart || "");
  const [lieuArrivee, setLieuArrivee] = useState(initialLigne?.lieuArrivee || "");
  const [cout, setCout] = useState(initialLigne?.cout ?? "");
  const [chefNom, setChefNom] = useState(initialLigne?.chefNom || "");
  const [chefContact, setChefContact] = useState(initialLigne?.chefContact || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = lieuDepart && lieuArrivee && Number(cout) > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ gareRoutiereId: gare.id, lieuDepart, lieuArrivee, cout, chefNom, chefContact });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Ligne rattachée à la gare routière <strong>{gare?.sigle || gare?.nom}</strong>
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Lieu de départ"><TextInput value={lieuDepart} onChange={(e) => setLieuDepart(e.target.value)} placeholder="Yopougon" /></Field>
        <Field label="Lieu d'arrivée"><TextInput value={lieuArrivee} onChange={(e) => setLieuArrivee(e.target.value)} placeholder="Man" /></Field>
      </div>
      <Field label="Coût du trajet (FCFA)"><TextInput type="number" min="0" value={cout} onChange={(e) => setCout(e.target.value)} placeholder="5000" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du chef de ligne"><TextInput value={chefNom} onChange={(e) => setChefNom(e.target.value)} /></Field>
        <Field label="Contact du chef de ligne"><TextInput value={chefContact} onChange={(e) => setChefContact(e.target.value)} /></Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer la ligne"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   RÉAFFECTATION d'un véhicule existant à une autre commune/commission mixte/ligne
   ============================================================ */
/* ============================================================
   ÉDITION d'un véhicule existant
   ============================================================ */
function VehicleEditForm({ vehicle, onCancel, onSave }) {
  const [marque, setMarque] = useState(vehicle.marque || "");
  const [modele, setModele] = useState(vehicle.modele || "");
  const [categorie, setCategorie] = useState(vehicle.categorie || "");
  const [nombrePlaces, setNombrePlaces] = useState(vehicle.nombrePlaces ?? "");
  const [chassis, setChassis] = useState(vehicle.chassis || "");
  const [carteGrise, setCarteGrise] = useState(vehicle.carteGrise || "");
  const [nomCarteGrise, setNomCarteGrise] = useState(vehicle.nomCarteGrise || "");
  const [immatriculation, setImmatriculation] = useState(vehicle.immatriculation || "");
  const [dateMiseCirculation, setDateMiseCirculation] = useState(vehicle.dateMiseCirculation || "");
  const [docs, setDocs] = useState({
    visiteTechnique: vehicle.documents?.visiteTechnique || "",
    assuranceAuto: vehicle.documents?.assuranceAuto || "",
    vignette: vehicle.documents?.vignette || "",
    carteStationnement: vehicle.documents?.carteStationnement || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = carteGrise && immatriculation && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ marque, modele, categorie, nombrePlaces, chassis, carteGrise, nomCarteGrise, immatriculation, dateMiseCirculation, documents: docs });
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Marque"><TextInput value={marque} onChange={(e) => setMarque(e.target.value)} /></Field>
        <Field label="Modèle"><TextInput value={modele} onChange={(e) => setModele(e.target.value)} /></Field>
        <Field label="Secteur / catégorie de transport">
          <select style={inputStyle} className="font-body" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {TRANSPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Nombre de places"><TextInput value={nombrePlaces} onChange={(e) => setNombrePlaces(e.target.value.replace(/\D/g, ""))} placeholder="18" /></Field>
        <Field label="Numéro de châssis"><TextInput value={chassis} onChange={(e) => setChassis(e.target.value)} /></Field>
        <Field label="Numéro d'immatriculation"><TextInput value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} /></Field>
        <Field label="Numéro carte grise"><TextInput value={carteGrise} onChange={(e) => setCarteGrise(e.target.value)} /></Field>
        <Field label="Nom sur la carte grise"><TextInput value={nomCarteGrise} onChange={(e) => setNomCarteGrise(e.target.value)} /></Field>
        <Field label="1ère mise en circulation"><DateInput value={dateMiseCirculation} onChange={(e) => setDateMiseCirculation(e.target.value)} /></Field>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs font-semibold mb-3" style={{ color: C.ink }}>Documents administratifs</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Visite technique"><DateInput value={docs.visiteTechnique} onChange={(e) => setDocs({ ...docs, visiteTechnique: e.target.value })} /></Field>
          <Field label="Assurance auto"><DateInput value={docs.assuranceAuto} onChange={(e) => setDocs({ ...docs, assuranceAuto: e.target.value })} /></Field>
          <Field label="Vignette"><DateInput value={docs.vignette} onChange={(e) => setDocs({ ...docs, vignette: e.target.value })} /></Field>
          <Field label="Carte de stationnement"><DateInput value={docs.carteStationnement} onChange={(e) => setDocs({ ...docs, carteStationnement: e.target.value })} /></Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body" style={{ color: C.ink, fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 11 }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed", fontSize: 14.5, fontWeight: 800, padding: "12px 20px", borderRadius: 11, boxShadow: canSave ? `0 4px 12px ${C.green}55` : "none" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}

function ReassignForm({ auth, vehicle, commissionsMixtes, lignes, garesRoutieres, currentAffectation, onCancel, onReassign, onUnassign }) {
  const [ligneId, setLigneId] = useState("");
  const [gareRoutiereId, setGareRoutiereId] = useState(currentAffectation?.gareRoutiereId || "");
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const currentCommission = currentAffectation ? commissionsMixtes.find((c) => c.id === currentAffectation.commissionMixteId) : null;
  const currentLigne = currentAffectation ? lignes.find((l) => l.id === currentAffectation.ligneId) : null;
  const currentGare = currentAffectation ? garesRoutieres.find((g) => g.id === currentAffectation.gareRoutiereId) : null;
  const garesDeMonSyndicat = garesRoutieres.filter((g) => g.syndicatId === vehicle.syndicatId);
  const lignesDeLaGareChoisie = lignes.filter((l) => l.gareRoutiereId === gareRoutiereId);

  const handleReassign = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReassign({ vehiculeId: vehicle.id, ligneId, gareRoutiereId, dateAffectation });
    } catch (err) {
      setError(err.message || "Erreur lors de l'affectation.");
      setBusy(false);
    }
  };
  const handleUnassign = async () => {
    setBusy(true);
    setError(null);
    try {
      await onUnassign(vehicle.id);
    } catch (err) {
      setError(err.message || "Erreur lors de la désaffectation.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        {currentAffectation
          ? <>Actuellement affecté à la gare <strong>{currentGare?.sigle || currentGare?.nom || "—"}</strong> ({currentCommission?.nom}) — ligne {currentLigne?.lieuDepart} → {currentLigne?.lieuArrivee}.</>
          : "Ce véhicule n'est affecté à aucune gare routière pour le moment."}
      </p>

      {garesDeMonSyndicat.length === 0 ? (
        <p className="font-body text-sm" style={{ color: C.slate }}>Aucune gare routière enregistrée pour ce collectif (syndicat) — créez-en une depuis la page "Gares Routières".</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Gare routière (lieu d'opération)">
            <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => { setGareRoutiereId(e.target.value); setLigneId(""); }}>
              <option value="">— Sélectionner —</option>
              {garesDeMonSyndicat.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
            </select>
          </Field>
          <Field label="Ligne">
            <select style={gareRoutiereId ? inputStyle : inputDisabledStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!gareRoutiereId}>
              <option value="">— Sélectionner —</option>
              {lignesDeLaGareChoisie.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
            </select>
          </Field>
          <Field label="Date d'affectation">
            <DateInput value={dateAffectation} onChange={(e) => setDateAffectation(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          {currentAffectation && (
            <button onClick={handleUnassign} disabled={busy} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.red }}>
              Désaffecter
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="font-body text-xs" style={{ color: C.red }}>{error}</span>}
          <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Fermer</button>
          <button
            onClick={handleReassign}
            disabled={!gareRoutiereId || !ligneId || busy}
            className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
            style={{ background: gareRoutiereId && ligneId ? C.orange : "#D8B48A", color: "#fff", cursor: gareRoutiereId && ligneId ? "pointer" : "not-allowed" }}
          >
            <Check size={16} /> {busy ? "…" : "Affecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TABLEAU DES MEMBRES PAR SYNDICAT (vue commission mixte / admin)
   ============================================================ */
function SyndicatMembersTable({ commissionSyndicats, owners, associations = [], onEdit, onDelete, onAddAsso, onEditAsso, onDeleteAsso }) {
  if (commissionSyndicats.length === 0) {
    return <p className="font-body text-sm" style={{ color: C.slate }}>Aucun collectif (syndicat) rattaché.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(commissionSyndicats.length, 4)}, 1fr)` }}>
        {commissionSyndicats.map((s) => {
          const count = owners.filter((o) => o.syndicatId === s.id).length;
          return (
            <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {s.logoUrl && <img src={s.logoUrl} alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }} />}
                  <div className="font-body text-xs font-semibold" style={{ color: C.ink }}>{s.sigle || s.nom}</div>
                </div>
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1.5">
                    {onEdit && <button onClick={() => onEdit(s)} title="Modifier" style={{ color: C.slate }}><Pencil size={11} /></button>}
                    {onDelete && <button onClick={() => onDelete(s.id)} title="Supprimer" style={{ color: C.red }}><Trash2 size={11} /></button>}
                  </div>
                )}
              </div>
              {s.sigle && <div className="font-body text-xs" style={{ color: C.slate }}>{s.nom}</div>}
              {(s.commune || s.type) && (
                <div className="font-body text-xs mt-0.5" style={{ color: C.orangeDark }}>
                  {s.commune}{s.commune && s.type ? " · " : ""}{s.type === "transporteurs" ? "Transporteurs" : s.type === "chauffeurs" ? "Chauffeurs" : ""}
                </div>
              )}
              <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{count}</div>
              {onAddAsso && (() => {
                const assos = associations.filter((a) => a.syndicatId === s.id);
                return (
                  <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8 }}>
                    <span className="font-display" style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>Associations / syndicats ({assos.length})</span>
                    {assos.map((a) => (
                      <div key={a.id} className="flex items-center justify-between mt-1.5">
                        <span className="font-body text-xs" style={{ color: C.slate }}>{a.sigle || a.nom}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => onEditAsso(a)} title="Modifier" style={{ color: C.slate }}><Pencil size={11} /></button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Supprimer l'association "${a.nom}" ?`)) return;
                              try { await onDeleteAsso(a.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                            }}
                            title="Supprimer" style={{ color: C.red }}
                          ><Trash2 size={11} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => onAddAsso(s.id)} className="w-full font-body flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg mt-2" style={{ background: C.orange, color: "#fff", fontSize: 12, fontWeight: 800, boxShadow: `0 3px 9px ${C.orange}44` }}>
                      <Plus size={14} /> Ajouter une association
                    </button>
                  </div>
                );
              })()}
              <div className="font-body text-xs" style={{ color: C.slate }}>transporteur{count > 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>

      {commissionSyndicats.map((s) => {
        const members = owners.filter((o) => o.syndicatId === s.id);
        if (members.length === 0) return null;
        return (
          <div key={s.id}>
            <div className="font-body text-xs font-semibold mb-2" style={{ color: C.ink }}>{s.nom} — {members.length} transporteur{members.length > 1 ? "s" : ""}</div>
            <table className="w-full font-body text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.slate, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Nom & prénoms</th>
                  <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>CNI</th>
                  <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Carte transporteur</th>
                  <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="py-2">{m.prenoms} {m.nom}</td>
                    <td className="font-mono">{m.cni}</td>
                    <td className="font-mono">{m.carteTransporteurNumero || "—"}</td>
                    <td>{m.contact1 || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function VehicleTable({ vehicles, owners, onFiche, onPhoto, commissionsMixtes, lignes, affectations, onReassign, onEdit, onDelete }) {
  return (
    <table className="w-full font-body text-sm" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: C.slate, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Véhicule</th>
          <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Immatriculation</th>
          <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Propriétaire</th>
          <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Commission / Ligne</th>
          <th className="text-left pb-2" style={{ color: C.orangeDark, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Documents</th>
          <th className="text-right pb-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {vehicles.map((v) => {
          const owner = owners.find((o) => o.id === v.proprietaireId);
          const statuses = Object.values(v.documents).map(statusOf);
          const worst = statuses.some((s) => s.key === "expire") ? "expire" : statuses.some((s) => s.key === "alerte") ? "alerte" : "valide";
          const worstStatus = worst === "expire" ? { label: "Document expiré", color: C.red, bg: C.redLight } : worst === "alerte" ? { label: "Échéance proche", color: C.amber, bg: C.amberLight } : { label: "À jour", color: C.green, bg: C.greenLight };
          const affectation = affectations.find((a) => a.vehiculeId === v.id && a.actif);
          const commission = affectation ? commissionsMixtes.find((c) => c.id === affectation.commissionMixteId) : null;
          const ligne = affectation ? lignes.find((l) => l.id === affectation.ligneId) : null;
          return (
            <tr key={v.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <AvatarUpload photo={v.photo} size={38} shape="square" fallbackIcon={<Car size={16} color={C.slate} />} onUpload={(dataUrl) => onPhoto(v.id, dataUrl)} />
                  <div>
                    <div className="font-medium">{v.marque} {v.modele}</div>
                    <div className="text-xs" style={{ color: C.slate }}>{v.chauffeurIds.length} chauffeur{v.chauffeurIds.length > 1 ? "s" : ""}</div>
                  </div>
                </div>
              </td>
              <td className="font-mono">{v.immatriculation}</td>
              <td>{owner ? `${owner.prenoms} ${owner.nom}` : "—"}</td>
              <td>
                {commission ? (
                  <div>
                    <div className="text-xs font-medium">{commission.nom}</div>
                    <div className="text-xs" style={{ color: C.slate }}>{ligne ? `${ligne.lieuDepart} → ${ligne.lieuArrivee}` : ""}</div>
                  </div>
                ) : <span className="text-xs" style={{ color: C.slate }}>Non affecté</span>}
              </td>
              <td><Badge status={worstStatus} /></td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onReassign(v)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.ink }}>Affectation</button>
                  <button onClick={() => onFiche(v)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.ink }}>Fiche</button>
                  <button onClick={() => onEdit(v)} title="Modifier" style={{ color: C.slate }}><Pencil size={15} /></button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Supprimer le véhicule ${v.immatriculation} ? Cette action est définitive.`)) return;
                      try { await onDelete(v.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                    }}
                    title="Supprimer"
                    style={{ color: C.red }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Modal({ children, onClose, title, wide }) {
  return (
    <div className="comix-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(20,24,20,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 60, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div className="modal-box comix-modal" style={{ background: C.cream, borderRadius: 18, width: wide ? 720 : 380, maxWidth: "94vw", padding: 0, marginBottom: 24, display: "flex", flexDirection: "column", position: "relative", boxShadow: "0 18px 48px rgba(0,0,0,0.28)" }}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${C.orange} 0%, ${C.orange} 40%, ${C.green} 40%)`, flexShrink: 0 }} />
        <div
          className="flex items-center justify-between"
          style={{ flexShrink: 0, padding: "14px 18px", background: "#fff", borderBottom: `1.5px solid ${C.border}`, position: "sticky", top: 0, zIndex: 5 }}
        >
          <h2 className="font-display" style={{ fontSize: 18.5, fontWeight: 800, color: C.ink, letterSpacing: -0.35 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 999, background: C.cream, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 18 }}>
        {children}
        </div>
      </div>
    </div>
  );
}
