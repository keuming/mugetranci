import React, { useState, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Car, User, Users, Bell, Plus, X, Check, AlertTriangle, CreditCard,
  Camera, Printer, Search, Home, FileText, Phone, Mail, MapPin,
  BadgeCheck, Calendar, ChevronRight, ChevronLeft, RotateCw, Trash2, Building2, QrCode, Fuel
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
  @page { margin: 14mm; }
}
`;

const TODAY = new Date("2026-07-27");

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
      <span className="text-xs font-semibold tracking-wide" style={{ color: C.slate }}>{label}</span>
      {children}
      {hint && <span className="text-[11px]" style={{ color: C.slate }}>{hint}</span>}
    </label>
  );
}

const inputStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  background: "#fff",
  color: C.ink,
  outline: "none",
  width: "100%",
};

function TextInput(props) {
  return <input {...props} className="font-body" style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function DateInput(props) {
  return <input type="date" {...props} className="font-mono" style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function PhotoUpload({ value, onChange, label, shape = "circle" }) {
  const ref = useRef(null);
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(f);
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
      <div className="flex flex-col gap-1">
        <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>{label}</span>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="font-body text-xs font-semibold"
          style={{ color: C.green, textAlign: "left" }}
        >
          {value ? "Changer la photo" : "Importer une photo"}
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </div>
  );
}

/* Bouton compact déclenchant un import de fichier immédiat (upload direct,
   pas de formulaire). Utilisé pour le QR de paiement d'un chauffeur existant. */
function FileUploadButton({ label, icon, onUpload, style }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setBusy(true);
      try {
        await onUpload(ev.target.result);
      } catch (err) {
        alert(err.message || "Échec de l'envoi du fichier.");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(f);
  };
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={style}>
        {icon} {busy ? "Envoi…" : label}
      </button>
      <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </>
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
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setUploading(true);
      try {
        await onUpload(ev.target.result);
      } catch (err) {
        alert(err.message || "Échec de l'envoi de la photo. Vérifiez la connexion à la base.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(f);
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
    <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${C.border}`, borderLeft: `4px solid ${accent}` }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: accent }}>{icon}</span>
          <h3 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: C.ink }}>{title}</h3>
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

function VehicleForm({ owners, drivers, gares, lignes, onCancel, onSave, addOwner, addDriver, addGare, addLigne, affecterVehicule }) {
  const [step, setStep] = useState(0);

  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [chassis, setChassis] = useState("");
  const [carteGrise, setCarteGrise] = useState("");
  const [nomCarteGrise, setNomCarteGrise] = useState("");
  const [immatriculation, setImmatriculation] = useState("");
  const [dateMiseCirculation, setDateMiseCirculation] = useState("");
  const [photo, setPhoto] = useState(null);
  const [docs, setDocs] = useState({ visiteTechnique: "", assuranceAuto: "", vignette: "", carteStationnement: "" });

  const [ownerMode, setOwnerMode] = useState(owners.length ? "existing" : "new"); // existing | new
  const [ownerId, setOwnerId] = useState(owners[0]?.id || "");
  const [newOwner, setNewOwner] = useState({ nom: "", prenoms: "", cni: "", carteTransporteurNumero: "", numeroPermis: "", contact1: "", contact2: "", contact3: "", email: "", ville: "", quartier: "", photo: null });

  const [driverRows, setDriverRows] = useState([{ mode: drivers.length ? "existing" : "new", id: drivers[0]?.id || "", draft: { nom: "", prenoms: "", cni: "", permisNumero: "", permisDateFin: "", contact1: "", contact2: "", contact3: "", email: "", photo: null, qrPaiement: null } }]);

  const addDriverRow = () => setDriverRows((r) => r.length >= 3 ? r : [...r, { mode: "existing", id: drivers[0]?.id || "", draft: { nom: "", prenoms: "", cni: "", permisNumero: "", permisDateFin: "", contact1: "", contact2: "", contact3: "", email: "", photo: null, qrPaiement: null } }]);
  const removeDriverRow = (i) => setDriverRows((r) => r.filter((_, idx) => idx !== i));
  const updateDriverRow = (i, patch) => setDriverRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const updateDriverDraft = (i, patch) => setDriverRows((r) => r.map((row, idx) => (idx === i ? { ...row, draft: { ...row.draft, ...patch } } : row)));

  // Affectation (étape 5, optionnelle)
  const communes = [...new Set(gares.map((g) => g.commune))].sort();
  const [communeSel, setCommuneSel] = useState("");
  const [gareId, setGareId] = useState("");
  const [ligneId, setLigneId] = useState("");
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().slice(0, 10));
  const garesDeLaCommune = gares.filter((g) => g.commune === communeSel);
  const lignesDeLaGare = lignes.filter((l) => l.gareId === gareId);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const stepValid = [
    !!(marque && modele && chassis && immatriculation),
    true, // documents are optional at creation time
    ownerMode === "existing" ? !!ownerId : !!(newOwner.nom && newOwner.prenoms && newOwner.cni),
    driverRows.every((row) => row.mode === "existing" ? true : !!(row.draft.nom && row.draft.prenoms && row.draft.cni && row.draft.permisNumero && row.draft.permisDateFin)),
    true, // affectation is optional
  ];
  const canSave = stepValid.every(Boolean) && !saving;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let finalOwnerId = ownerId;
      if (ownerMode === "new") {
        const created = await addOwner(newOwner); // POST /api/proprietaires — id réel renvoyé par Neon
        finalOwnerId = created.id;
      }

      const finalDriverIds = [];
      for (const row of driverRows) {
        if (row.mode === "existing") {
          if (row.id) finalDriverIds.push(row.id);
        } else {
          const created = await addDriver(row.draft); // POST /api/chauffeurs
          finalDriverIds.push(created.id);
        }
      }

      const createdVehicle = await onSave({
        marque, modele, chassis, carteGrise, nomCarteGrise, immatriculation, dateMiseCirculation, photo,
        documents: docs,
        proprietaireId: finalOwnerId || null,
        chauffeurIds: finalDriverIds,
      }); // POST /api/vehicules

      if (gareId && ligneId && createdVehicle?.id) {
        await affecterVehicule({ vehiculeId: createdVehicle.id, gareId, ligneId, dateAffectation });
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
            <PhotoUpload value={photo} onChange={setPhoto} label="Photo du véhicule" shape="square" />
            <div className="grid grid-cols-2 gap-4 mt-5">
              <Field label="Marque"><TextInput value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Toyota" /></Field>
              <Field label="Modèle"><TextInput value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Hiace 18 places" /></Field>
              <Field label="Numéro de châssis"><TextInput value={chassis} onChange={(e) => setChassis(e.target.value)} placeholder="JT731HB0900123456" /></Field>
              <Field label="Numéro carte grise"><TextInput value={carteGrise} onChange={(e) => setCarteGrise(e.target.value)} placeholder="CG-2024-000000" /></Field>
              <Field label="Nom sur la carte grise" hint="Peut différer du propriétaire actuel"><TextInput value={nomCarteGrise} onChange={(e) => setNomCarteGrise(e.target.value)} placeholder="Nom du titulaire inscrit sur le document" /></Field>
              <Field label="Numéro d'immatriculation"><TextInput value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} placeholder="CI 1234 AB 01" /></Field>
              <Field label="1ère mise en circulation"><DateInput value={dateMiseCirculation} onChange={(e) => setDateMiseCirculation(e.target.value)} /></Field>
            </div>
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
            <div className="flex gap-2 mb-5">
              <button type="button" onClick={() => setOwnerMode("existing")} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: ownerMode === "existing" ? C.orangeLight : "transparent", color: ownerMode === "existing" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "existing" ? C.orange : C.border}` }}>Propriétaire existant</button>
              <button type="button" onClick={() => setOwnerMode("new")} className="font-body text-xs font-semibold px-3.5 py-2 rounded-full" style={{ background: ownerMode === "new" ? C.orangeLight : "transparent", color: ownerMode === "new" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "new" ? C.orange : C.border}` }}>+ Nouveau propriétaire</button>
            </div>

            {ownerMode === "existing" ? (
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
                <PhotoUpload value={newOwner.photo} onChange={(v) => setNewOwner({ ...newOwner, photo: v })} label="Photo du propriétaire" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nom"><TextInput value={newOwner.nom} onChange={(e) => setNewOwner({ ...newOwner, nom: e.target.value })} /></Field>
                  <Field label="Prénoms"><TextInput value={newOwner.prenoms} onChange={(e) => setNewOwner({ ...newOwner, prenoms: e.target.value })} /></Field>
                  <Field label="Numéro CNI"><TextInput value={newOwner.cni} onChange={(e) => setNewOwner({ ...newOwner, cni: e.target.value })} /></Field>
                  <Field label="Numéro carte transporteur"><TextInput value={newOwner.carteTransporteurNumero} onChange={(e) => setNewOwner({ ...newOwner, carteTransporteurNumero: e.target.value })} /></Field>
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
            <div className="flex flex-col gap-5">
              {driverRows.map((row, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateDriverRow(i, { mode: "existing" })} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: row.mode === "existing" ? C.greenLight : "transparent", color: row.mode === "existing" ? C.greenDark : C.slate, border: `1px solid ${row.mode === "existing" ? C.green : C.border}` }}>Chauffeur existant</button>
                      <button type="button" onClick={() => updateDriverRow(i, { mode: "new" })} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: row.mode === "new" ? C.greenLight : "transparent", color: row.mode === "new" ? C.greenDark : C.slate, border: `1px solid ${row.mode === "new" ? C.green : C.border}` }}>+ Nouveau chauffeur</button>
                    </div>
                    {driverRows.length > 1 && (
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
          <SectionCard accent={C.orangeDark} icon={<MapPin size={18} />} title="Affectation (gare & ligne)">
            <p className="font-body text-xs mb-4 px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
              💡 Étape optionnelle. Un véhicule peut être affecté plus tard, ou réaffecté à une autre commune / gare / ligne depuis la liste des véhicules.
            </p>
            {gares.length === 0 ? (
              <p className="font-body text-sm" style={{ color: C.slate }}>Aucune gare enregistrée pour le moment — créez-en une depuis la page "Gares", puis revenez affecter ce véhicule.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Commune">
                  <select style={inputStyle} className="font-body" value={communeSel} onChange={(e) => { setCommuneSel(e.target.value); setGareId(""); setLigneId(""); }}>
                    <option value="">— Sélectionner —</option>
                    {communes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Gare">
                  <select style={inputStyle} className="font-body" value={gareId} onChange={(e) => { setGareId(e.target.value); setLigneId(""); }} disabled={!communeSel}>
                    <option value="">— Sélectionner —</option>
                    {garesDeLaCommune.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
                  </select>
                </Field>
                <Field label="Ligne">
                  <select style={inputStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!gareId}>
                    <option value="">— Sélectionner —</option>
                    {lignesDeLaGare.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
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
function FicheVehicule({ vehicle, owners, drivers, onClose }) {
  const owner = owners.find((o) => o.id === vehicle.proprietaireId);
  const vDrivers = vehicle.chauffeurIds.map((id) => drivers.find((d) => d.id === id)).filter(Boolean);

  return (
    <div className="fiche-modal-scroll flex flex-col gap-4">
      <div className="print-area" style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(120deg, ${C.green} 0%, ${C.greenDark} 75%)`, padding: "20px 28px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 8, background: C.orange }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 size={20} color="#fff" />
              </div>
              <div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Mutuelle Générale des Transporteurs de Côte d'Ivoire — MUGETRAN-CI</div>
                <div className="font-body" style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>Fiche Véhicule Commercial — Réf. {vehicle.id}</div>
              </div>
            </div>
            <button onClick={() => window.print()} className="no-print font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ border: `1px solid rgba(255,255,255,0.4)`, color: "#fff", background: "rgba(255,255,255,0.1)" }}>
              <Printer size={14} /> Imprimer
            </button>
          </div>
        </div>
        <TricolorRule />

        <div style={{ padding: "16px 22px 14px" }}>

        {/* Véhicule */}
        <div className="mb-3">
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

        {/* Propriétaire */}
        <div className="my-3">
          <div className="font-display flex items-center gap-1.5 mb-2" style={{ fontSize: 12.5, fontWeight: 700, color: C.orangeDark }}>
            <User size={13} /> Propriétaire
          </div>
          {owner ? (
            <div className="flex gap-3">
              <div style={{ width: 44, height: 44, borderRadius: 999, overflow: "hidden", background: C.cream, flexShrink: 0, border: `1px solid ${C.border}` }}>
                {owner.photo ? <img src={owner.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-semibold" style={{ color: C.slate, fontSize: 11 }}>{initials(owner.nom, owner.prenoms)}</div>}
              </div>
              <div className="font-body grid grid-cols-4 gap-x-3 gap-y-1 flex-1" style={{ color: C.ink, fontSize: 10.5 }}>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Nom & prénoms</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.prenoms} {owner.nom}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>CNI</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.cni}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Carte transporteur</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.carteTransporteurNumero || "—"}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Permis de conduire</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.numeroPermis || "—"}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Contacts</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{[owner.contact1, owner.contact2, owner.contact3].filter(Boolean).join(" · ")}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Email</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.email || "—"}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Ville</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.ville}</div></div>
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Quartier</span><div className="font-medium" style={{ lineHeight: 1.3 }}>{owner.quartier}</div></div>
              </div>
            </div>
          ) : <div className="font-body text-xs" style={{ color: C.slate }}>Aucun propriétaire enregistré.</div>}
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
                <QRCodeSVG value={ficheUrl(vehicle.id)} size={72} bgColor="#ffffff" fgColor={C.ink} level="M" />
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
                CACHET<br />MUGETRAN-CI
              </div>
              <div style={{ width: 170, borderBottom: `1px solid ${C.ink}`, height: 22 }} />
              <div className="font-body text-center" style={{ fontSize: 9.5, color: C.ink, marginTop: 4 }}>
                <div style={{ fontWeight: 700 }}>Le Président de la Mutuelle</div>
                <div style={{ color: C.slate, fontSize: 8.5 }}>MUGETRAN-CI</div>
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

function CardFace({ driver, vehicle, side, scale = 1 }) {
  const isRecto = side === "recto";
  const card = (
    <div
      style={{
        width: 340, height: 214, borderRadius: 16, position: "relative", flexShrink: 0,
        background: isRecto
          ? `linear-gradient(135deg, ${C.green} 0%, ${C.green} 60%, ${C.orange} 130%)`
          : `linear-gradient(135deg, ${C.greenDark}, ${C.green})`,
        color: "#fff", padding: 18, boxShadow: scale === 1 ? "0 12px 28px rgba(11,110,79,0.28)" : "none",
      }}
    >
      {isRecto ? (
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>MUGETRAN-CI</div>
              <div className="font-body" style={{ fontSize: 9.5, opacity: 0.85 }}>MUTUELLE GÉNÉRALE DES TRANSPORTEURS DE CI</div>
            </div>
            <BadgeCheck size={22} />
          </div>
          <div className="flex items-center gap-3">
            <div style={{ width: 52, height: 52, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.6)", flexShrink: 0 }}>
              {driver.photo ? <img src={driver.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-bold text-sm">{initials(driver.nom, driver.prenoms)}</div>}
            </div>
            <div className="font-body">
              <div style={{ fontSize: 14, fontWeight: 700 }}>{driver.prenoms} {driver.nom}</div>
              <div style={{ fontSize: 10.5, opacity: 0.9 }}>Chauffeur agréé</div>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="font-body" style={{ fontSize: 10 }}>
              <div style={{ opacity: 0.75 }}>Véhicule</div>
              <div className="font-mono" style={{ fontWeight: 600, fontSize: 12 }}>{vehicle?.immatriculation || "—"}</div>
              <div style={{ opacity: 0.75, marginTop: 4 }}>{driver.contact1}{driver.contact2 ? " · " + driver.contact2 : ""}</div>
            </div>
            {/* QR de paiement Mobile Money : image importée depuis le wallet du
                chauffeur (pas générée par l'application). */}
            <div style={{ background: "#fff", borderRadius: 6, padding: 3, width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {driver.qrPaiement ? (
                <img src={driver.qrPaiement} alt="QR paiement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span className="font-body" style={{ fontSize: 6.5, color: C.slate, textAlign: "center", lineHeight: 1.15 }}>QR MobilePay<br />non importé</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full items-center justify-center gap-2">
          <div style={{ background: "#fff", borderRadius: 8, padding: 6 }}>
            <QRCodeSVG value={fuelQrData(driver.id, vehicle?.carteGrise)} size={92} bgColor="#ffffff" fgColor={C.ink} level="M" />
          </div>
          <div className="font-body text-center" style={{ fontSize: 9.5, opacity: 0.85 }}>
            Pointage carburant en station · Carte n° {driver.id.slice(0, 8)}
            <br />En cas de perte, contactez la Mutuelle.
          </div>
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

function MembershipCard({ driver, vehicle, initialFace = "recto" }) {
  const [flipped, setFlipped] = useState(initialFace === "verso");
  if (!driver) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="no-print">
        <CardFace driver={driver} vehicle={vehicle} side={flipped ? "verso" : "recto"} />
      </div>

      {/* Rendu recto + verso côte à côte, uniquement visible à l'impression */}
      <div className="print-area print-card-duo flex items-center gap-6">
        <CardFace driver={driver} vehicle={vehicle} side="recto" />
        <CardFace driver={driver} vehicle={vehicle} side="verso" />
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

/* ============================================================
   PLANCHE D'IMPRESSION GROUPÉE (pour l'imprimerie)
   6 chauffeurs par feuille, recto + verso côte à côte par ligne
   ============================================================ */
const CARDS_PER_SHEET = 6;
const SHEET_CARD_SCALE = 254 / 340; // ~0.747 — réduit la carte pour que 6 lignes tiennent sur une page A4

function CardSheet({ drivers, vehicles, selectedIds }) {
  const selected = drivers.filter((d) => selectedIds.includes(d.id));
  if (!selected.length) return null;

  const groups = [];
  for (let i = 0; i < selected.length; i += CARDS_PER_SHEET) groups.push(selected.slice(i, i + CARDS_PER_SHEET));

  return (
    <div className="print-area print-card-sheet">
      {groups.map((group, gi) => (
        <div key={gi} className="card-sheet-page" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: gi === 0 ? 0 : 10 }}>
          {gi === 0 && (
            <div className="font-body" style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>
              MUGETRAN-CI — Planche de production, cartes de membre chauffeurs ({selected.length} carte{selected.length > 1 ? "s" : ""}) — recto/verso par ligne, {CARDS_PER_SHEET} cartes/feuille.
              Planche de référence pour impression ; l'imprimerie ajuste l'échelle exacte selon le support (CR80, 85,6 × 54 mm).
            </div>
          )}
          {group.map((d) => {
            const v = vehicles.find((vv) => vv.chauffeurIds.includes(d.id));
            return (
              <div key={d.id} className="flex items-center gap-4" style={{ borderBottom: `1px dashed ${C.border}`, paddingBottom: 8 }}>
                <CardFace driver={d} vehicle={v} side="recto" scale={SHEET_CARD_SCALE} />
                <CardFace driver={d} vehicle={v} side="verso" scale={SHEET_CARD_SCALE} />
                <div className="font-body" style={{ fontSize: 10, color: C.slate }}>{d.prenoms} {d.nom}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   DASHBOARD / LIST PAGES
   ============================================================ */
function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, flex: 1 }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ width: 34, height: 34, borderRadius: 9, background: accent + "1A", display: "flex", alignItems: "center", justifyContent: "center", color: accent }}>{icon}</div>
      </div>
      <div className="font-display" style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{value}</div>
      <div className="font-body text-xs" style={{ color: C.slate }}>{label}</div>
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

async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} a répondu ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${path} a répondu ${res.status}`);
  }
  return res.json();
}
async function apiPatch(path, body) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${path} a répondu ${res.status}`);
  }
  return res.json();
}

export default function App() {
  const [owners, setOwners] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [ficheVehicle, setFicheVehicle] = useState(null);
  const [cardDriver, setCardDriver] = useState(null);
  const [cardFace, setCardFace] = useState("recto");
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [achats, setAchats] = useState([]);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [gares, setGares] = useState([]);
  const [lignes, setLignes] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [showGareForm, setShowGareForm] = useState(false);
  const [ligneFormGareId, setLigneFormGareId] = useState(null);
  const [reassignVehicle, setReassignVehicle] = useState(null);
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, d, v, ac, ga, li, af] = await Promise.all([
          apiGet("/api/proprietaires"),
          apiGet("/api/chauffeurs"),
          apiGet("/api/vehicules"),
          apiGet("/api/carburant"),
          apiGet("/api/gares"),
          apiGet("/api/lignes"),
          apiGet("/api/affectations"),
        ]);
        if (cancelled) return;
        setOwners(o);
        setDrivers(d);
        setVehicles(v);
        setAchats(ac);
        setGares(ga);
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

        // Ouvre automatiquement la carte de membre si l'URL contient
        // ?carte=ID&face=paiement|carburant (les 2 QR codes de la carte).
        const carteId = params.get("carte");
        if (carteId) {
          const match = d.find((dd) => dd.id === carteId);
          if (match) {
            setCardDriver(match);
            setCardFace(params.get("face") === "carburant" ? "verso" : "recto");
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
    window.history.pushState({}, "", `?carte=${d.id}&face=paiement`);
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
    const created = await apiPost("/api/proprietaires", o);
    setOwners((s) => [...s, created]);
    return created;
  };
  const addDriver = async (d) => {
    const created = await apiPost("/api/chauffeurs", d);
    setDrivers((s) => [...s, created]);
    return created;
  };
  const updateDriverPhoto = async (driverId, photoDataUrl) => {
    const updated = await apiPatch(`/api/chauffeurs/${driverId}`, { photo: photoDataUrl });
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
  };
  const updateDriverQr = async (driverId, qrDataUrl) => {
    const updated = await apiPatch(`/api/chauffeurs/${driverId}`, { qrPaiement: qrDataUrl });
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
  };
  const updateOwnerPhoto = async (ownerId, photoDataUrl) => {
    const updated = await apiPatch(`/api/proprietaires/${ownerId}`, { photo: photoDataUrl });
    setOwners((s) => s.map((o) => (o.id === ownerId ? updated : o)));
  };
  const updateVehiclePhoto = async (vehiculeId, photoDataUrl) => {
    const updated = await apiPatch(`/api/vehicules/${vehiculeId}`, { photo: photoDataUrl });
    // La route renvoie une forme "plate" (sans documents/chauffeurIds imbriqués) :
    // on ne fusionne que la photo pour ne pas perdre le reste de l'objet local.
    setVehicles((s) => s.map((v) => (v.id === vehiculeId ? { ...v, photo: updated.photo } : v)));
  };
  const addAchat = async (payload) => {
    const created = await apiPost("/api/carburant", payload);
    setAchats((s) => [created, ...s]);
    return created;
  };
  const addGare = async (payload) => {
    const created = await apiPost("/api/gares", payload);
    setGares((s) => [...s, created]);
    return created;
  };
  const addLigne = async (payload) => {
    const created = await apiPost("/api/lignes", payload);
    setLignes((s) => [...s, created]);
    return created;
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
    const created = await apiPost("/api/vehicules", v);
    setVehicles((s) => [...s, created]);
    setShowForm(false);
    openFiche(created);
    return created;
  };

  const filteredVehicles = vehicles.filter((v) =>
    !search || v.immatriculation.toLowerCase().includes(search.toLowerCase()) || v.marque.toLowerCase().includes(search.toLowerCase()) || v.modele.toLowerCase().includes(search.toLowerCase())
  );

  const nav = [
    { key: "dashboard", label: "Tableau de bord", icon: <Home size={17} /> },
    { key: "vehicles", label: "Véhicules", icon: <Car size={17} /> },
    { key: "owners", label: "Propriétaires", icon: <User size={17} /> },
    { key: "drivers", label: "Chauffeurs", icon: <Users size={17} /> },
    { key: "gares", label: "Gares", icon: <MapPin size={17} /> },
    { key: "carburant", label: "Carburant", icon: <Fuel size={17} /> },
    { key: "alerts", label: "Alertes documents", icon: <Bell size={17} />, count: critical.length },
  ];

  return (
    <div className="font-body" style={{ background: C.cream, minHeight: "100vh", color: C.ink }}>
      <style>{FONTS}</style>
      <div className="flex" style={{ minHeight: "100vh" }}>
        {/* SIDEBAR */}
        <aside style={{ width: 232, background: C.greenDark, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div className="px-5 py-6">
            <div className="flex items-center gap-2.5">
              <div style={{ width: 34, height: 34, borderRadius: 9, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Car size={17} color="#fff" />
              </div>
              <div>
                <div className="font-display" style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>MUGETRAN-CI</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }}>Mutuelle Générale des Transporteurs</div>
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => setPage(n.key)}
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: page === n.key ? "rgba(255,255,255,0.12)" : "transparent", color: page === n.key ? "#fff" : "rgba(255,255,255,0.68)" }}
              >
                <span className="flex items-center gap-2.5">{n.icon}{n.label}</span>
                {!!n.count && <span style={{ background: C.orange, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>{n.count}</span>}
              </button>
            ))}
          </nav>
          <div className="mt-auto p-4">
            <TricolorRule />
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 8 }}>Abidjan · Côte d'Ivoire</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-8" style={{ maxWidth: 1180 }}>
          {/* TOP BAR */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700 }}>
                {{ dashboard: "Tableau de bord", vehicles: "Véhicules", owners: "Propriétaires", drivers: "Chauffeurs", gares: "Gares", carburant: "Carburant", alerts: "Alertes documents" }[page]}
              </h1>
              <p className="text-sm" style={{ color: C.slate }}>Registre unifié véhicules · propriétaires · chauffeurs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
                <Search size={15} color={C.slate} />
                <input placeholder="Rechercher un véhicule…" value={search} onChange={(e) => setSearch(e.target.value)} className="font-body text-sm" style={{ border: "none", outline: "none", width: 180 }} />
              </div>
              <button onClick={() => setShowForm(true)} disabled={loading} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: loading ? "#D8B48A" : C.orange, color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>
                <Plus size={16} /> Ajouter un véhicule
              </button>
            </div>
          </div>

          {loadError && (
            <div className="font-body text-sm mb-5 px-4 py-3 rounded-lg" style={{ background: C.redLight, color: C.red }}>
              {loadError} — vérifiez que <code>DATABASE_URL</code> est bien configurée (Vercel en production, <code>.env.local</code> en local avec <code>vercel dev</code>).
            </div>
          )}

          {loading && !loadError && (
            <div className="font-body text-sm mb-5" style={{ color: C.slate }}>Chargement des données depuis la base…</div>
          )}

          {!loading && !loadError && vehicles.length === 0 && owners.length === 0 && drivers.length === 0 && page === "dashboard" && (
            <div className="font-body text-sm mb-5 px-4 py-3 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
              La base est vide. Ajoutez un véhicule pour commencer, ou lancez <code>npm run db:seed</code> depuis votre terminal pour charger des données de démonstration.
            </div>
          )}

          {!loading && (
          <>
          {page === "dashboard" && (
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <StatCard icon={<Car size={17} />} label="Véhicules enregistrés" value={vehicles.length} accent={C.green} />
                <StatCard icon={<User size={17} />} label="Propriétaires" value={owners.length} accent={C.orange} />
                <StatCard icon={<Users size={17} />} label="Chauffeurs" value={drivers.length} accent={C.greenDark} />
                <StatCard icon={<AlertTriangle size={17} />} label="Documents à traiter (≤ 30 j)" value={critical.length} accent={C.red} />
              </div>

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
                <VehicleTable vehicles={vehicles.slice(-5).reverse()} owners={owners} onFiche={openFiche} onPhoto={updateVehiclePhoto} gares={gares} lignes={lignes} affectations={affectations} onReassign={setReassignVehicle} />
              </SectionCard>
            </div>
          )}

          {page === "vehicles" && (
            <SectionCard accent={C.green} icon={<Car size={18} />} title={`Tous les véhicules (${filteredVehicles.length})`}>
              <VehicleTable vehicles={filteredVehicles} owners={owners} onFiche={openFiche} onPhoto={updateVehiclePhoto} gares={gares} lignes={lignes} affectations={affectations} onReassign={setReassignVehicle} />
            </SectionCard>
          )}

          {page === "owners" && (
            <div className="grid grid-cols-3 gap-4">
              {owners.map((o) => {
                const ownedCount = vehicles.filter((v) => v.proprietaireId === o.id).length;
                return (
                  <div key={o.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarUpload photo={o.photo} nom={o.nom} prenoms={o.prenoms} size={48} onUpload={(dataUrl) => updateOwnerPhoto(o.id, dataUrl)} />
                      <div>
                        <div className="font-semibold text-sm">{o.prenoms} {o.nom}</div>
                        <div className="text-xs" style={{ color: C.slate }}>{ownedCount} véhicule{ownedCount > 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs" style={{ color: C.slate }}>
                      <div className="flex items-center gap-2"><BadgeCheck size={13} /> {o.cni}</div>
                      <div className="flex items-center gap-2"><Phone size={13} /> {o.contact1}{o.contact2 ? " · " + o.contact2 : ""}</div>
                      {o.email && <div className="flex items-center gap-2"><Mail size={13} /> {o.email}</div>}
                      <div className="flex items-center gap-2"><MapPin size={13} /> {o.quartier}, {o.ville}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {page === "drivers" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                <div className="font-body text-sm" style={{ color: C.slate }}>
                  {selectedDriverIds.length > 0 ? `${selectedDriverIds.length} chauffeur${selectedDriverIds.length > 1 ? "s" : ""} sélectionné${selectedDriverIds.length > 1 ? "s" : ""}` : "Sélectionnez des chauffeurs pour générer une planche de cartes à imprimer"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDriverIds(selectedDriverIds.length === drivers.length ? [] : drivers.map((d) => d.id))}
                    className="font-body text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ border: `1px solid ${C.border}`, color: C.ink }}
                  >
                    {selectedDriverIds.length === drivers.length && drivers.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    disabled={selectedDriverIds.length === 0}
                    className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: selectedDriverIds.length ? C.orange : "#D8B48A", color: "#fff", cursor: selectedDriverIds.length ? "pointer" : "not-allowed" }}
                  >
                    <Printer size={13} /> Générer la planche PDF ({CARDS_PER_SHEET} cartes/feuille)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
              {drivers.map((d) => {
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
                        <div className="font-semibold text-sm">{d.prenoms} {d.nom}</div>
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
                          <CreditCard size={13} /> Carte membre
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {page === "gares" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm" style={{ color: C.slate }}>{gares.length} gare{gares.length > 1 ? "s" : ""} enregistrée{gares.length > 1 ? "s" : ""}</p>
                <button onClick={() => setShowGareForm(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                  <Plus size={16} /> Ajouter une gare
                </button>
              </div>

              {gares.length === 0 ? (
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }} className="font-body text-sm text-center" >
                  <span style={{ color: C.slate }}>Aucune gare enregistrée. Ajoutez la première gare pour commencer à y rattacher des lignes et affecter des véhicules.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {gares.map((g) => {
                    const gareLignes = lignes.filter((l) => l.gareId === g.id);
                    return (
                      <div key={g.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-sm">{g.nom}</div>
                            <div className="text-xs" style={{ color: C.slate }}>{g.commune}{g.localisation ? " · " + g.localisation : ""}</div>
                          </div>
                          {g.latitude && g.longitude && (
                            <a href={`https://www.google.com/maps?q=${g.latitude},${g.longitude}`} target="_blank" rel="noreferrer" className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.green }}>
                              <MapPin size={13} /> Carte
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-xs mb-3" style={{ color: C.slate }}>
                          {g.chefNom && <div className="flex items-center gap-2"><User size={12} /> Chef de gare : {g.chefNom}{g.chefContact ? " · " + g.chefContact : ""}</div>}
                          {g.login && <div className="flex items-center gap-2"><BadgeCheck size={12} /> Compte gare : {g.login} {g.pinCode ? "· PIN configuré" : ""}</div>}
                        </div>

                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>Lignes ({gareLignes.length})</span>
                          </div>
                          {gareLignes.length === 0 ? (
                            <p className="font-body text-xs mb-2" style={{ color: C.slate }}>Aucune ligne pour cette gare.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5 mb-2">
                              {gareLignes.map((l) => (
                                <div key={l.id} className="flex items-center justify-between font-body text-xs" style={{ color: C.ink }}>
                                  <span>{l.lieuDepart} → {l.lieuArrivee}</span>
                                  <span className="font-mono font-semibold">{l.cout.toLocaleString("fr-FR")} F</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setLigneFormGareId(g.id)} className="w-full font-body text-xs font-semibold flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
                            <Plus size={14} /> Ajouter une ligne à cette gare
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {page === "carburant" && (
            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
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
                        <th className="text-left pb-2 font-medium">Date</th>
                        <th className="text-left pb-2 font-medium">Chauffeur</th>
                        <th className="text-left pb-2 font-medium">Carte grise</th>
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

      {/* MODALS */}
      {showForm && <Modal onClose={() => setShowForm(false)} title="Ajouter un véhicule" wide>
        <VehicleForm owners={owners} drivers={drivers} gares={gares} lignes={lignes} onCancel={() => setShowForm(false)} onSave={addVehicle} addOwner={addOwner} addDriver={addDriver} addGare={addGare} addLigne={addLigne} affecterVehicule={affecterVehicule} />
      </Modal>}

      {ficheVehicle && <Modal onClose={closeFiche} title="Fiche Véhicule Commercial" wide>
        <FicheVehicule vehicle={ficheVehicle} owners={owners} drivers={drivers} onClose={closeFiche} />
      </Modal>}

      {cardDriver && <Modal onClose={closeCard} title="Carte de membre">
        <MembershipCard driver={cardDriver} vehicle={vehicles.find((v) => v.chauffeurIds.includes(cardDriver.id))} initialFace={cardFace} />
      </Modal>}

      <CardSheet drivers={drivers} vehicles={vehicles} selectedIds={selectedDriverIds} />

      {showFuelForm && <Modal onClose={() => setShowFuelForm(false)} title="Enregistrer un achat de carburant" wide>
        <FuelPurchaseForm drivers={drivers} vehicles={vehicles} onCancel={() => setShowFuelForm(false)} onSave={async (payload) => { await addAchat(payload); setShowFuelForm(false); }} />
      </Modal>}

      {showGareForm && <Modal onClose={() => setShowGareForm(false)} title="Ajouter une gare" wide>
        <GareForm onCancel={() => setShowGareForm(false)} onSave={async (payload) => { await addGare(payload); setShowGareForm(false); }} />
      </Modal>}

      {ligneFormGareId && <Modal onClose={() => setLigneFormGareId(null)} title="Ajouter une ligne" wide>
        <LigneForm gare={gares.find((g) => g.id === ligneFormGareId)} onCancel={() => setLigneFormGareId(null)} onSave={async (payload) => { await addLigne(payload); setLigneFormGareId(null); }} />
      </Modal>}

      {reassignVehicle && <Modal onClose={() => setReassignVehicle(null)} title={`Affectation — ${reassignVehicle.immatriculation}`} wide>
        <ReassignForm
          vehicle={reassignVehicle}
          gares={gares}
          lignes={lignes}
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
const FUEL_COMMISSION_RATE = 0.02; // doit rester cohérent avec api/carburant.js

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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
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
function GareForm({ onCancel, onSave }) {
  const [nom, setNom] = useState("");
  const [commune, setCommune] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [chefNom, setChefNom] = useState("");
  const [chefContact, setChefContact] = useState("");
  const [login, setLogin] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pinValid = !pinCode || /^\d{4}$/.test(pinCode);
  const canSave = nom && commune && pinValid && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nom, commune, localisation, latitude, longitude, chefNom, chefContact, login, pinCode });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom de la gare"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Gare de Yopougon Sicogi" /></Field>
        <Field label="Commune"><TextInput value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Yopougon" /></Field>
      </div>
      <Field label="Localisation (adresse / repère)"><TextInput value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Carrefour Sicogi, près du marché" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitude" hint="Coordonnées GPS — via Google Maps"><TextInput type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="5.345317" /></Field>
        <Field label="Longitude"><TextInput type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-4.076083" /></Field>
      </div>
      {latitude && longitude && (
        <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="font-body text-xs font-semibold flex items-center gap-1.5" style={{ color: C.green }}>
          <MapPin size={13} /> Vérifier cet emplacement sur Google Maps
        </a>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du chef de gare"><TextInput value={chefNom} onChange={(e) => setChefNom(e.target.value)} /></Field>
        <Field label="Contact du chef de gare"><TextInput value={chefContact} onChange={(e) => setChefContact(e.target.value)} /></Field>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <p className="font-body text-xs mb-3" style={{ color: C.slate }}>
          Compte de la gare (créé par l'administrateur MUGETRAN-CI) — identifiants préparatoires pour un futur accès dédié du personnel de la gare.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Login (numéro de téléphone)"><TextInput value={login} onChange={(e) => setLogin(e.target.value)} placeholder="07 08 12 34 56" /></Field>
          <Field label="Code PIN (4 chiffres)">
            <TextInput
              value={pinCode}
              maxLength={4}
              inputMode="numeric"
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
            />
          </Field>
        </div>
        {!pinValid && <p className="font-body text-xs mt-1.5" style={{ color: C.red }}>Le code PIN doit comporter exactement 4 chiffres.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {error && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{error}</span>}
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.orange : "#D8B48A", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer la gare"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   LIGNE — formulaire d'ajout, rattaché à une gare
   ============================================================ */
function LigneForm({ gare, onCancel, onSave }) {
  const [lieuDepart, setLieuDepart] = useState("");
  const [lieuArrivee, setLieuArrivee] = useState("");
  const [cout, setCout] = useState("");
  const [chefNom, setChefNom] = useState("");
  const [chefContact, setChefContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = lieuDepart && lieuArrivee && Number(cout) > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ gareId: gare.id, lieuDepart, lieuArrivee, cout, chefNom, chefContact });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Ligne rattachée à <strong>{gare.nom}</strong> ({gare.commune})
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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer la ligne"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   RÉAFFECTATION d'un véhicule existant à une autre commune/gare/ligne
   ============================================================ */
function ReassignForm({ vehicle, gares, lignes, currentAffectation, onCancel, onReassign, onUnassign }) {
  const communes = [...new Set(gares.map((g) => g.commune))].sort();
  const [communeSel, setCommuneSel] = useState("");
  const [gareId, setGareId] = useState("");
  const [ligneId, setLigneId] = useState("");
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const garesDeLaCommune = gares.filter((g) => g.commune === communeSel);
  const lignesDeLaGare = lignes.filter((l) => l.gareId === gareId);
  const currentGare = currentAffectation ? gares.find((g) => g.id === currentAffectation.gareId) : null;
  const currentLigne = currentAffectation ? lignes.find((l) => l.id === currentAffectation.ligneId) : null;

  const handleReassign = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReassign({ vehiculeId: vehicle.id, gareId, ligneId, dateAffectation });
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
          ? <>Actuellement affecté à <strong>{currentGare?.nom}</strong> ({currentGare?.commune}) — ligne {currentLigne?.lieuDepart} → {currentLigne?.lieuArrivee}.</>
          : "Ce véhicule n'est affecté à aucune gare pour le moment."}
      </p>

      {gares.length === 0 ? (
        <p className="font-body text-sm" style={{ color: C.slate }}>Aucune gare enregistrée — créez-en une depuis la page "Gares".</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Commune">
            <select style={inputStyle} className="font-body" value={communeSel} onChange={(e) => { setCommuneSel(e.target.value); setGareId(""); setLigneId(""); }}>
              <option value="">— Sélectionner —</option>
              {communes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Gare">
            <select style={inputStyle} className="font-body" value={gareId} onChange={(e) => { setGareId(e.target.value); setLigneId(""); }} disabled={!communeSel}>
              <option value="">— Sélectionner —</option>
              {garesDeLaCommune.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </Field>
          <Field label="Ligne">
            <select style={inputStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!gareId}>
              <option value="">— Sélectionner —</option>
              {lignesDeLaGare.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
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
            disabled={!gareId || !ligneId || busy}
            className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
            style={{ background: gareId && ligneId ? C.orange : "#D8B48A", color: "#fff", cursor: gareId && ligneId ? "pointer" : "not-allowed" }}
          >
            <Check size={16} /> {busy ? "…" : "Affecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleTable({ vehicles, owners, onFiche, onPhoto, gares, lignes, affectations, onReassign }) {
  return (
    <table className="w-full font-body text-sm" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: C.slate, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <th className="text-left pb-2 font-medium">Véhicule</th>
          <th className="text-left pb-2 font-medium">Immatriculation</th>
          <th className="text-left pb-2 font-medium">Propriétaire</th>
          <th className="text-left pb-2 font-medium">Gare / Ligne</th>
          <th className="text-left pb-2 font-medium">Documents</th>
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
          const gare = affectation ? gares.find((g) => g.id === affectation.gareId) : null;
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
                {gare ? (
                  <div>
                    <div className="text-xs font-medium">{gare.nom}</div>
                    <div className="text-xs" style={{ color: C.slate }}>{ligne ? `${ligne.lieuDepart} → ${ligne.lieuArrivee}` : ""}</div>
                  </div>
                ) : <span className="text-xs" style={{ color: C.slate }}>Non affecté</span>}
              </td>
              <td><Badge status={worstStatus} /></td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onReassign(v)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.ink }}>Affectation</button>
                  <button onClick={() => onFiche(v)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.ink }}>Fiche</button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,24,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24, overflowY: "auto" }}>
      <div className="modal-box" style={{ background: C.cream, borderRadius: 16, width: wide ? 720 : 380, maxWidth: "94vw", maxHeight: "90vh", padding: 20, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between mb-4" style={{ flexShrink: 0 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ color: C.slate }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
