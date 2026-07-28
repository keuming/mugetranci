import React, { useState, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Car, User, Users, Bell, Plus, X, Check, AlertTriangle, CreditCard,
  Camera, Printer, Search, Home, FileText, Phone, Mail, MapPin,
  BadgeCheck, Calendar, ChevronRight, ChevronLeft, RotateCw, Trash2, Building2, QrCode, Fuel, Pencil, LogOut
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
const TRANSPORT_CATEGORIES = ["VTC", "Minibus", "Taxi brousse", "Taxi compteur"];

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

function VehicleForm({ auth, owners, drivers, syndicats, garesRoutieres, commissionsMixtes, lignes, onCancel, onSave, addOwner, addDriver, affecterVehicule }) {
  const [step, setStep] = useState(0);
  const isAdmin = auth?.role === "admin";
  const [syndicatIdSel, setSyndicatIdSel] = useState(isAdmin ? "" : (auth?.syndicatId || ""));

  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [categorie, setCategorie] = useState("");
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
  const isSyndicatAccount = auth?.role === "syndicat";
  const communes = [...new Set(commissionsMixtes.map((c) => c.commune))].sort();
  const [communeSel, setCommuneSel] = useState("");
  const [commissionId, setCommissionId] = useState(isSyndicatAccount ? auth.commissionMixteId : "");
  const [ligneId, setLigneId] = useState("");
  const [gareRoutiereId, setGareRoutiereId] = useState("");
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().slice(0, 10));
  const commissionsDeLaCommune = commissionsMixtes.filter((c) => c.commune === communeSel);
  const lignesDeLaCommission = lignes.filter((l) => l.commissionMixteId === commissionId);
  const gareOwnerSyndicatId = isSyndicatAccount ? auth.syndicatId : syndicatIdSel;
  const garesDeMonSyndicat = garesRoutieres.filter((g) => g.syndicatId === gareOwnerSyndicatId);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const stepValid = [
    !!(marque && modele && chassis && immatriculation) && (!isAdmin || !!syndicatIdSel),
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
        const payload = isAdmin && syndicatIdSel ? { ...newOwner, syndicatId: syndicatIdSel } : newOwner;
        const created = await addOwner(payload); // POST /api/proprietaires — id réel renvoyé par Neon
        finalOwnerId = created.id;
      }

      const finalDriverIds = [];
      for (const row of driverRows) {
        if (row.mode === "existing") {
          if (row.id) finalDriverIds.push(row.id);
        } else {
          const draftPayload = isAdmin && syndicatIdSel ? { ...row.draft, syndicatId: syndicatIdSel } : row.draft;
          const created = await addDriver(draftPayload); // POST /api/chauffeurs
          finalDriverIds.push(created.id);
        }
      }

      const createdVehicle = await onSave({
        marque, modele, categorie, chassis, carteGrise, nomCarteGrise, immatriculation, dateMiseCirculation, photo,
        documents: docs,
        proprietaireId: finalOwnerId || null,
        chauffeurIds: finalDriverIds,
        ...(isAdmin && syndicatIdSel ? { syndicatId: syndicatIdSel } : {}),
      }); // POST /api/vehicules

      if (commissionId && ligneId && createdVehicle?.id) {
        await affecterVehicule({ vehiculeId: createdVehicle.id, commissionMixteId: commissionId, ligneId, gareRoutiereId, dateAffectation });
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
                <Field label="Syndicat gestionnaire" hint="Obligatoire : détermine à quel syndicat ce véhicule, son transporteur et ses chauffeurs seront rattachés">
                  <select style={inputStyle} className="font-body" value={syndicatIdSel} onChange={(e) => setSyndicatIdSel(e.target.value)}>
                    <option value="">— Sélectionner un syndicat —</option>
                    {syndicats.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </Field>
                {syndicats.length === 0 && <p className="font-body text-xs mt-1.5" style={{ color: C.red }}>Aucun syndicat enregistré — créez-en un depuis la page "Commissions Mixtes" avant d'ajouter un véhicule.</p>}
              </div>
            )}
            <PhotoUpload value={photo} onChange={setPhoto} label="Photo du véhicule" shape="square" />
            <div className="grid grid-cols-2 gap-4 mt-5">
              <Field label="Marque"><TextInput value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Toyota" /></Field>
              <Field label="Modèle"><TextInput value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Hiace 18 places" /></Field>
              <Field label="Secteur / catégorie de transport">
                <select style={inputStyle} className="font-body" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {TRANSPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
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
          <SectionCard accent={C.orangeDark} icon={<MapPin size={18} />} title="Affectation (commission mixte, gare & ligne)">
            <p className="font-body text-xs mb-4 px-3 py-2.5 rounded-lg" style={{ color: C.slate, background: C.cream }}>
              💡 Étape optionnelle. Un véhicule peut être affecté plus tard, ou réaffecté depuis la liste des véhicules.
            </p>
            {isSyndicatAccount ? (
              lignesDeLaCommission.length === 0 ? (
                <p className="font-body text-sm" style={{ color: C.slate }}>Votre commission mixte n'a encore aucune ligne enregistrée.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ligne (votre commission mixte)">
                    <select style={inputStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {lignesDeLaCommission.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
                    </select>
                  </Field>
                  <Field label="Gare routière (lieu d'opération)">
                    <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => setGareRoutiereId(e.target.value)}>
                      <option value="">— Aucune / non renseignée —</option>
                      {garesDeMonSyndicat.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
                    </select>
                  </Field>
                  <Field label="Date d'affectation">
                    <DateInput value={dateAffectation} onChange={(e) => setDateAffectation(e.target.value)} />
                  </Field>
                </div>
              )
            ) : commissionsMixtes.length === 0 ? (
              <p className="font-body text-sm" style={{ color: C.slate }}>Aucune commission mixte enregistrée pour le moment — créez-en une depuis la page "Commissions Mixtes", puis revenez affecter ce véhicule.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Commune">
                  <select style={inputStyle} className="font-body" value={communeSel} onChange={(e) => { setCommuneSel(e.target.value); setCommissionId(""); setLigneId(""); }}>
                    <option value="">— Sélectionner —</option>
                    {communes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Commission mixte">
                  <select style={inputStyle} className="font-body" value={commissionId} onChange={(e) => { setCommissionId(e.target.value); setLigneId(""); }} disabled={!communeSel}>
                    <option value="">— Sélectionner —</option>
                    {commissionsDeLaCommune.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </Field>
                <Field label="Ligne">
                  <select style={inputStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!commissionId}>
                    <option value="">— Sélectionner —</option>
                    {lignesDeLaCommission.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
                  </select>
                </Field>
                <Field label="Gare routière (lieu d'opération)">
                  <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => setGareRoutiereId(e.target.value)}>
                    <option value="">— Aucune / non renseignée —</option>
                    {garesDeMonSyndicat.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
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
                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Commissions Mixtes de Côte d'Ivoire — COMIX-CI</div>
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
                <div><span style={{ color: C.slate, fontSize: 8.5 }}>Carte transporteur</span><div className="font-mono font-medium" style={{ lineHeight: 1.3 }}>{owner.carteTransporteurNumero || "—"}</div></div>
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

function CardFace({ driver, vehicle, side, scale = 1 }) {
  const isRecto = side === "recto";
  const card = (
    <div
      style={{
        width: 340, height: 214, borderRadius: 16, position: "relative", flexShrink: 0,
        background: isRecto ? "#fff" : `linear-gradient(135deg, ${C.green} 0%, ${C.green} 60%, ${C.orange} 130%)`,
        border: isRecto ? `1px solid ${C.border}` : "none",
        color: isRecto ? C.ink : "#fff", padding: 18, boxShadow: scale === 1 ? "0 12px 28px rgba(11,110,79,0.28)" : "none",
      }}
    >
      {isRecto ? (
        // Recto (fond blanc) : QR de pointage carburant en station, généré par l'application.
        <div className="flex flex-col h-full items-center justify-center gap-2">
          <div style={{ background: "#fff", borderRadius: 8, padding: 6, border: `1px solid ${C.border}` }}>
            <QRCodeSVG value={fuelQrData(driver.id, vehicle?.carteGrise)} size={130} bgColor="#ffffff" fgColor={C.ink} level="M" />
          </div>
          <div className="font-body text-center" style={{ fontSize: 9.5, color: C.slate }}>
            Pointage carburant en station · Carte n° {driver.id.slice(0, 8)}
            <br />En cas de perte, contactez la Mutuelle.
          </div>
        </div>
      ) : (
        // Verso : identité du chauffeur + QR de paiement Mobile Money (image
        // importée depuis son wallet, pas générée par l'application).
        <div className="flex flex-col h-full justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>COMIX-CI</div>
              <div className="font-body" style={{ fontSize: 9.5, opacity: 0.85 }}>COMMISSIONS MIXTES DE CÔTE D'IVOIRE</div>
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
            <div style={{ background: "#fff", borderRadius: 6, padding: 3, width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {driver.qrPaiement ? (
                <img src={driver.qrPaiement} alt="QR paiement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span className="font-body" style={{ fontSize: 6.5, color: C.slate, textAlign: "center", lineHeight: 1.15 }}>QR MobilePay<br />non importé</span>
              )}
            </div>
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
              COMIX-CI — Planche de production, cartes de membre chauffeurs ({selected.length} carte{selected.length > 1 ? "s" : ""}) — recto/verso par ligne, {CARDS_PER_SHEET} cartes/feuille.
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
const SYNDICAT_SUSPECT_THRESHOLD = 3; // en dessous de ce nombre de membres, un syndicat est signalé comme à surveiller

/* ============================================================
   PANNEAU HAUT CONSEIL DU TRANSPORT — accueil admin
   Recherche véhicule → fiche transporteur, + vue d'ensemble
   commissions mixtes / syndicats / effectifs.
   ============================================================ */
const NON_COMPLIANT_GROUPINGS = [
  { key: "commission", label: "Par commission mixte" },
  { key: "syndicat", label: "Par syndicat" },
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
      return { key: s?.id || "none", label: s?.nom || "Non rattaché à un syndicat" };
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

      <div className="flex gap-4">
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

      <SectionCard accent={C.orangeDark} icon={<Building2 size={18} />} title={`Commissions mixtes & syndicats (${commissionsMixtes.length} commission${commissionsMixtes.length > 1 ? "s" : ""}, ${syndicats.length} syndicat${syndicats.length > 1 ? "s" : ""})`}>
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
                    <div className="font-body text-xs" style={{ color: C.slate }}>{commissionSyndicats.length} syndicat{commissionSyndicats.length > 1 ? "s" : ""} · {totalMembres} membre{totalMembres > 1 ? "s" : ""}</div>
                  </div>
                  {commissionSyndicats.length === 0 ? (
                    <p className="font-body text-xs" style={{ color: C.slate }}>Aucun syndicat pour cette commission.</p>
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
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
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
      onLogin(data.token, { role: data.role, commissionMixteId: data.commissionMixteId || null, syndicatId: data.syndicatId || null, nom: data.nom });
    } catch (err) {
      setError(err.message || "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="font-body flex items-center justify-center" style={{ minHeight: "100vh", background: C.cream }}>
      <style>{FONTS}</style>
      <form onSubmit={handleSubmit} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 380, maxWidth: "92vw" }}>
        <div className="flex flex-col items-center mb-6">
          <div style={{ width: 44, height: 44, borderRadius: 11, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Car size={22} color="#fff" />
          </div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>COMIX-CI</div>
          <div className="text-xs text-center mt-1" style={{ color: C.slate }}>Commissions Mixtes de Côte d'Ivoire</div>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Identifiant (administrateur, commission mixte ou syndicat)">
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
      </form>
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
  const [lignes, setLignes] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [showSyndicatFormFor, setShowSyndicatFormFor] = useState(null); // commissionMixteId
  const [ligneFormCommissionId, setLigneFormCommissionId] = useState(null);
  const [editCommission, setEditCommission] = useState(null);
  const [editSyndicat, setEditSyndicat] = useState(null);
  const [editLigne, setEditLigne] = useState(null);
  const [reassignVehicle, setReassignVehicle] = useState(null);
  const [editVehicle, setEditVehicle] = useState(null);
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet("/api/bootstrap");
        if (cancelled) return;
        const { proprietaires: o, chauffeurs: d, vehicules: v, carburant: ac, commissionsMixtes: cm, syndicats: sy, garesRoutieres: gr, lignes: li, affectations: af } = data;
        setOwners(o);
        setDrivers(d);
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
    const updated = await apiPatch(`/api/chauffeurs?id=${driverId}`, { photo: photoDataUrl });
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
  };
  const updateDriverQr = async (driverId, qrDataUrl) => {
    const updated = await apiPatch(`/api/chauffeurs?id=${driverId}`, { qrPaiement: qrDataUrl });
    setDrivers((s) => s.map((d) => (d.id === driverId ? updated : d)));
  };
  const updateOwnerPhoto = async (ownerId, photoDataUrl) => {
    const updated = await apiPatch(`/api/proprietaires?id=${ownerId}`, { photo: photoDataUrl });
    setOwners((s) => s.map((o) => (o.id === ownerId ? updated : o)));
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
    const created = await apiPost("/api/carburant", payload);
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
    { key: "owners", label: "Membres", icon: <User size={17} /> },
    { key: "drivers", label: "Chauffeurs", icon: <Users size={17} /> },
    ...(auth.role === "admin" ? [{ key: "commissions", label: "Commissions Mixtes", icon: <MapPin size={17} /> }] : []),
    ...(auth.role === "admin" || auth.role === "commission_mixte" ? [{ key: "syndicats", label: "Syndicats", icon: <Building2 size={17} /> }] : []),
    ...(auth.role === "syndicat" ? [{ key: "garesroutieres", label: "Gares Routières", icon: <MapPin size={17} /> }] : []),
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
                <div className="font-display" style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>COMIX-CI</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }}>Commissions Mixtes des Transporteurs</div>
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
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div>
                <div className="font-body" style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{auth.nom}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>
                  {auth.role === "admin" ? "Administrateur général" : auth.role === "commission_mixte" ? "Commission Mixte" : "Syndicat"}
                </div>
              </div>
              <button onClick={onLogout} title="Déconnexion" style={{ color: "rgba(255,255,255,0.7)" }}>
                <LogOut size={15} />
              </button>
            </div>
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
                {{ dashboard: "Tableau de bord", vehicles: "Véhicules", owners: "Membres", drivers: "Chauffeurs", commissions: "Commissions Mixtes", syndicats: "Syndicats", carburant: "Carburant", alerts: "Alertes documents" }[page]}
              </h1>
              <p className="text-sm" style={{ color: C.slate }}>Registre unifié véhicules · membres · chauffeurs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
                <Search size={15} color={C.slate} />
                <input placeholder="Rechercher un véhicule…" value={search} onChange={(e) => setSearch(e.target.value)} className="font-body text-sm" style={{ border: "none", outline: "none", width: 180 }} />
              </div>
              {auth.role !== "commission_mixte" && (
                <button onClick={() => setShowForm(true)} disabled={loading} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: loading ? "#D8B48A" : C.orange, color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>
                  <Plus size={16} /> Ajouter un véhicule
                </button>
              )}
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

              <div className="flex gap-4">
                {auth.role === "admin" ? (
                  <>
                    <StatCard icon={<MapPin size={17} />} label="Commissions mixtes" value={commissionsMixtes.length} accent={C.orange} />
                    <StatCard icon={<Building2 size={17} />} label="Syndicats" value={syndicats.length} accent={C.green} />
                    <StatCard icon={<User size={17} />} label="Membres (transporteurs)" value={owners.length} accent={C.greenDark} />
                    <StatCard icon={<AlertTriangle size={17} />} label="Documents à traiter (≤ 30 j)" value={critical.length} accent={C.red} />
                  </>
                ) : (
                  <>
                    <StatCard icon={<Car size={17} />} label="Véhicules enregistrés" value={vehicles.length} accent={C.green} />
                    <StatCard icon={<User size={17} />} label="Membres" value={owners.length} accent={C.orange} />
                    <StatCard icon={<Users size={17} />} label="Chauffeurs" value={drivers.length} accent={C.greenDark} />
                    <StatCard icon={<AlertTriangle size={17} />} label="Documents à traiter (≤ 30 j)" value={critical.length} accent={C.red} />
                  </>
                )}
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

                  <SectionCard accent={C.green} icon={<Building2 size={18} />} title="Syndicats récemment ajoutés" right={<button onClick={() => setPage("syndicats")} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: C.green }}>Tout voir <ChevronRight size={13} /></button>}>
                    {syndicats.length === 0 ? (
                      <div className="text-sm" style={{ color: C.slate }}>Aucun syndicat enregistré.</div>
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
                              <span className="text-xs" style={{ color: C.slate }}>{count} membre(s)</span>
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
            <SectionCard accent={C.green} icon={<Car size={18} />} title={`Tous les véhicules (${filteredVehicles.length})`}>
              <VehicleTable vehicles={filteredVehicles} owners={owners} onFiche={openFiche} onPhoto={updateVehiclePhoto} commissionsMixtes={commissionsMixtes} lignes={lignes} affectations={affectations} onReassign={setReassignVehicle} onEdit={setEditVehicle} onDelete={deleteVehicle} />
            </SectionCard>
          )}

          {page === "owners" && (
            <div className="flex flex-col gap-4">
              {auth.role === "syndicat" && (
                <div className="flex justify-end">
                  <button onClick={() => setShowMemberFormFor(true)} className="font-body text-sm font-semibold flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                    <Plus size={16} /> Ajouter un membre
                  </button>
                </div>
              )}
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
                    const commissionLignes = lignes.filter((l) => l.commissionMixteId === c.id);
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
                            <p className="font-body text-xs mt-1.5 mb-2" style={{ color: C.slate }}>Aucun syndicat pour cette commission.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-1.5 mb-2">
                              {commissionSyndicats.map((s) => (
                                <div key={s.id} className="flex items-center justify-between font-body text-xs" style={{ color: C.ink }}>
                                  <span>{s.nom}</span>
                                  <div className="flex items-center gap-2">
                                    <span style={{ color: C.slate }}>{owners.filter((o) => o.syndicatId === s.id).length} membre(s)</span>
                                    <button onClick={() => setEditSyndicat(s)} title="Modifier le syndicat" style={{ color: C.slate }}><Pencil size={12} /></button>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Supprimer le syndicat "${s.nom}" ?`)) return;
                                        try { await deleteSyndicat(s.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                                      }}
                                      title="Supprimer le syndicat"
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
                            <Plus size={14} /> Ajouter un syndicat à cette commission
                          </button>
                        </div>

                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                          <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>Lignes ({commissionLignes.length})</span>
                          {commissionLignes.length === 0 ? (
                            <p className="font-body text-xs mt-1.5 mb-2" style={{ color: C.slate }}>Aucune ligne pour cette commission.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-1.5 mb-2">
                              {commissionLignes.map((l) => (
                                <div key={l.id} className="flex items-center justify-between font-body text-xs" style={{ color: C.ink }}>
                                  <span>{l.lieuDepart} → {l.lieuArrivee}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold">{l.cout.toLocaleString("fr-FR")} F</span>
                                    <button onClick={() => setEditLigne(l)} title="Modifier la ligne" style={{ color: C.slate }}><Pencil size={12} /></button>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm(`Supprimer la ligne "${l.lieuDepart} → ${l.lieuArrivee}" ?`)) return;
                                        try { await deleteLigne(l.id); } catch (err) { alert(err.message || "Suppression impossible."); }
                                      }}
                                      title="Supprimer la ligne"
                                      style={{ color: C.red }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setLigneFormCommissionId(c.id)} className="w-full font-body text-xs font-semibold flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: C.orangeLight, color: C.orangeDark }}>
                            <Plus size={14} /> Ajouter une ligne à cette commission
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
                    <SectionCard key={c.id} accent={C.orangeDark} icon={<MapPin size={18} />} title={`${c.nom} (${c.commune}) — ${totalMembres} membre(s) au total`}>
                      <SyndicatMembersTable commissionSyndicats={commissionSyndicats} owners={owners} />
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
                      title={`${commission?.nom || "Ma commission mixte"} — ${totalMembres} membre(s) au total`}
                      right={
                        <button onClick={() => setShowSyndicatFormFor(auth.commissionMixteId)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.orange, color: "#fff" }}>
                          <Plus size={14} /> Ajouter un syndicat
                        </button>
                      }
                    >
                      <SyndicatMembersTable
                        commissionSyndicats={syndicats}
                        owners={owners}
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
                    </div>
                  ))}
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
        <VehicleForm auth={auth} owners={owners} drivers={drivers} syndicats={syndicats} garesRoutieres={garesRoutieres} commissionsMixtes={commissionsMixtes} lignes={lignes} onCancel={() => setShowForm(false)} onSave={addVehicle} addOwner={addOwner} addDriver={addDriver} affecterVehicule={affecterVehicule} />
      </Modal>}

      {ficheVehicle && <Modal onClose={closeFiche} title="Fiche d'Identification du Transporteur" wide>
        <FicheVehicule vehicle={ficheVehicle} owners={owners} drivers={drivers} onClose={closeFiche} />
      </Modal>}

      {cardDriver && <Modal onClose={closeCard} title="Carte de membre">
        <MembershipCard driver={cardDriver} vehicle={vehicles.find((v) => v.chauffeurIds.includes(cardDriver.id))} initialFace={cardFace} />
      </Modal>}

      <CardSheet drivers={drivers} vehicles={vehicles} selectedIds={selectedDriverIds} />

      {showFuelForm && <Modal onClose={() => setShowFuelForm(false)} title="Enregistrer un achat de carburant" wide>
        <FuelPurchaseForm drivers={drivers} vehicles={vehicles} onCancel={() => setShowFuelForm(false)} onSave={async (payload) => { await addAchat(payload); setShowFuelForm(false); }} />
      </Modal>}

      {showCommissionForm && <Modal onClose={() => setShowCommissionForm(false)} title="Ajouter une commission mixte" wide>
        <CommissionMixteForm onCancel={() => setShowCommissionForm(false)} onSave={async (payload) => { await addCommission(payload); setShowCommissionForm(false); }} />
      </Modal>}

      {editCommission && <Modal onClose={() => setEditCommission(null)} title={`Modifier — ${editCommission.nom}`} wide>
        <CommissionMixteForm initialCommission={editCommission} onCancel={() => setEditCommission(null)} onSave={async (payload) => { await updateCommission(editCommission.id, payload); setEditCommission(null); }} />
      </Modal>}

      {showSyndicatFormFor && <Modal onClose={() => setShowSyndicatFormFor(null)} title="Ajouter un syndicat" wide>
        <SyndicatForm commission={commissionsMixtes.find((c) => c.id === showSyndicatFormFor)} onCancel={() => setShowSyndicatFormFor(null)} onSave={async (payload) => { await addSyndicat(payload); setShowSyndicatFormFor(null); }} />
      </Modal>}

      {editSyndicat && <Modal onClose={() => setEditSyndicat(null)} title={`Modifier — ${editSyndicat.nom}`} wide>
        <SyndicatForm commission={commissionsMixtes.find((c) => c.id === editSyndicat.commissionMixteId)} initialSyndicat={editSyndicat} onCancel={() => setEditSyndicat(null)} onSave={async (payload) => { await updateSyndicat(editSyndicat.id, payload); setEditSyndicat(null); }} />
      </Modal>}

      {showGareRoutiereFormFor && <Modal onClose={() => setShowGareRoutiereFormFor(null)} title="Ajouter une gare routière" wide>
        <GareRoutiereForm syndicat={syndicats.find((s) => s.id === showGareRoutiereFormFor) || { id: showGareRoutiereFormFor, nom: auth.nom }} onCancel={() => setShowGareRoutiereFormFor(null)} onSave={async (payload) => { await addGareRoutiere(payload); setShowGareRoutiereFormFor(null); }} />
      </Modal>}

      {showMemberFormFor && <Modal onClose={() => setShowMemberFormFor(false)} title="Ajouter un membre" wide>
        <MemberForm onCancel={() => setShowMemberFormFor(false)} onSave={async (payload) => { await addOwner(payload); setShowMemberFormFor(false); }} />
      </Modal>}

      {editGareRoutiere && <Modal onClose={() => setEditGareRoutiere(null)} title={`Modifier — ${editGareRoutiere.nom}`} wide>
        <GareRoutiereForm syndicat={syndicats.find((s) => s.id === editGareRoutiere.syndicatId) || { nom: auth.nom }} initialGare={editGareRoutiere} onCancel={() => setEditGareRoutiere(null)} onSave={async (payload) => { await updateGareRoutiere(editGareRoutiere.id, payload); setEditGareRoutiere(null); }} />
      </Modal>}

      {ligneFormCommissionId && <Modal onClose={() => setLigneFormCommissionId(null)} title="Ajouter une ligne" wide>
        <LigneForm commission={commissionsMixtes.find((c) => c.id === ligneFormCommissionId)} onCancel={() => setLigneFormCommissionId(null)} onSave={async (payload) => { await addLigne(payload); setLigneFormCommissionId(null); }} />
      </Modal>}

      {editLigne && <Modal onClose={() => setEditLigne(null)} title="Modifier la ligne" wide>
        <LigneForm commission={commissionsMixtes.find((c) => c.id === editLigne.commissionMixteId)} initialLigne={editLigne} onCancel={() => setEditLigne(null)} onSave={async (payload) => { await updateLigne(editLigne.id, payload); setEditLigne(null); }} />
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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
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
      await onSave({ commissionMixteId: commission.id, nom, sigle, logoUrl, presidentNom, presidentContact, login, pinCode });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Syndicat rattaché à <strong>{commission?.nom}</strong> ({commission?.commune})
      </p>
      <PhotoUpload value={logoUrl} onChange={setLogoUrl} label="Logo du syndicat" shape="square" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom du syndicat"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Syndicat des Transporteurs de Yopougon" /></Field>
        <Field label="Sigle" hint="Affiché sur le tableau de bord"><TextInput value={sigle} onChange={(e) => setSigle(e.target.value)} placeholder="STY" maxLength={20} /></Field>
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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer le syndicat"}
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
function MemberForm({ onCancel, onSave }) {
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [cni, setCni] = useState("");
  const [carteTransporteurNumero, setCarteTransporteurNumero] = useState("");
  const [numeroPermis, setNumeroPermis] = useState("");
  const [contact1, setContact1] = useState("");
  const [contact2, setContact2] = useState("");
  const [contact3, setContact3] = useState("");
  const [email, setEmail] = useState("");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSave = nom && prenoms && cni && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ nom, prenoms, cni, carteTransporteurNumero, numeroPermis, contact1, contact2, contact3, email, ville, quartier, photo });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PhotoUpload value={photo} onChange={setPhoto} label="Photo du membre" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nom"><TextInput value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        <Field label="Prénoms"><TextInput value={prenoms} onChange={(e) => setPrenoms(e.target.value)} /></Field>
        <Field label="Numéro CNI"><TextInput value={cni} onChange={(e) => setCni(e.target.value)} /></Field>
        <Field label="Numéro carte transporteur"><TextInput value={carteTransporteurNumero} onChange={(e) => setCarteTransporteurNumero(e.target.value)} /></Field>
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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer le membre"}
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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer la gare routière"}
        </button>
      </div>
    </div>
  );
}

function LigneForm({ commission, initialLigne, onCancel, onSave }) {
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
      await onSave({ commissionMixteId: commission.id, lieuDepart, lieuArrivee, cout, chefNom, chefContact });
    } catch (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs px-3 py-2.5 rounded-lg" style={{ background: C.cream, color: C.slate }}>
        Ligne rattachée à <strong>{commission?.nom}</strong> ({commission?.commune})
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

  const canSave = marque && modele && chassis && immatriculation && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ marque, modele, categorie, chassis, carteGrise, nomCarteGrise, immatriculation, dateMiseCirculation, documents: docs });
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
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button onClick={handleSave} disabled={!canSave} className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2" style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}>
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}

function ReassignForm({ auth, vehicle, commissionsMixtes, lignes, garesRoutieres, currentAffectation, onCancel, onReassign, onUnassign }) {
  const isSyndicatAccount = auth?.role === "syndicat";
  const communes = [...new Set(commissionsMixtes.map((c) => c.commune))].sort();
  const [communeSel, setCommuneSel] = useState("");
  const [commissionId, setCommissionId] = useState(isSyndicatAccount ? auth.commissionMixteId : "");
  const [ligneId, setLigneId] = useState("");
  const [gareRoutiereId, setGareRoutiereId] = useState(currentAffectation?.gareRoutiereId || "");
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const commissionsDeLaCommune = commissionsMixtes.filter((c) => c.commune === communeSel);
  const lignesDeLaCommission = lignes.filter((l) => l.commissionMixteId === commissionId);
  const currentCommission = currentAffectation ? commissionsMixtes.find((c) => c.id === currentAffectation.commissionMixteId) : null;
  const currentLigne = currentAffectation ? lignes.find((l) => l.id === currentAffectation.ligneId) : null;
  const garesDeMonSyndicat = garesRoutieres.filter((g) => g.syndicatId === vehicle.syndicatId);

  const handleReassign = async () => {
    setBusy(true);
    setError(null);
    try {
      await onReassign({ vehiculeId: vehicle.id, commissionMixteId: commissionId, ligneId, gareRoutiereId, dateAffectation });
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
          ? <>Actuellement affecté à <strong>{currentCommission?.nom}</strong> ({currentCommission?.commune}) — ligne {currentLigne?.lieuDepart} → {currentLigne?.lieuArrivee}.</>
          : "Ce véhicule n'est affecté à aucune commission mixte pour le moment."}
      </p>

      {isSyndicatAccount ? (
        lignesDeLaCommission.length === 0 ? (
          <p className="font-body text-sm" style={{ color: C.slate }}>Votre commission mixte n'a encore aucune ligne enregistrée.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ligne (votre commission mixte)">
              <select style={inputStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {lignesDeLaCommission.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
              </select>
            </Field>
            <Field label="Gare routière (lieu d'opération)">
              <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => setGareRoutiereId(e.target.value)}>
                <option value="">— Aucune / non renseignée —</option>
                {garesDeMonSyndicat.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
              </select>
            </Field>
            <Field label="Date d'affectation">
              <DateInput value={dateAffectation} onChange={(e) => setDateAffectation(e.target.value)} />
            </Field>
          </div>
        )
      ) : commissionsMixtes.length === 0 ? (
        <p className="font-body text-sm" style={{ color: C.slate }}>Aucune commission mixte enregistrée — créez-en une depuis la page "Commissions Mixtes".</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Commune">
            <select style={inputStyle} className="font-body" value={communeSel} onChange={(e) => { setCommuneSel(e.target.value); setCommissionId(""); setLigneId(""); }}>
              <option value="">— Sélectionner —</option>
              {communes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Commission mixte">
            <select style={inputStyle} className="font-body" value={commissionId} onChange={(e) => { setCommissionId(e.target.value); setLigneId(""); }} disabled={!communeSel}>
              <option value="">— Sélectionner —</option>
              {commissionsDeLaCommune.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Field>
          <Field label="Ligne">
            <select style={inputStyle} className="font-body" value={ligneId} onChange={(e) => setLigneId(e.target.value)} disabled={!commissionId}>
              <option value="">— Sélectionner —</option>
              {lignesDeLaCommission.map((l) => <option key={l.id} value={l.id}>{l.lieuDepart} → {l.lieuArrivee} ({l.cout.toLocaleString("fr-FR")} F)</option>)}
            </select>
          </Field>
          <Field label="Gare routière (lieu d'opération)">
            <select style={inputStyle} className="font-body" value={gareRoutiereId} onChange={(e) => setGareRoutiereId(e.target.value)}>
              <option value="">— Aucune / non renseignée —</option>
              {garesDeMonSyndicat.map((g) => <option key={g.id} value={g.id}>{g.sigle || g.nom}</option>)}
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
            disabled={!commissionId || !ligneId || busy}
            className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
            style={{ background: commissionId && ligneId ? C.orange : "#D8B48A", color: "#fff", cursor: commissionId && ligneId ? "pointer" : "not-allowed" }}
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
function SyndicatMembersTable({ commissionSyndicats, owners, onEdit, onDelete }) {
  if (commissionSyndicats.length === 0) {
    return <p className="font-body text-sm" style={{ color: C.slate }}>Aucun syndicat rattaché.</p>;
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
              <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{count}</div>
              <div className="font-body text-xs" style={{ color: C.slate }}>membre{count > 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>

      {commissionSyndicats.map((s) => {
        const members = owners.filter((o) => o.syndicatId === s.id);
        if (members.length === 0) return null;
        return (
          <div key={s.id}>
            <div className="font-body text-xs font-semibold mb-2" style={{ color: C.ink }}>{s.nom} — {members.length} membre{members.length > 1 ? "s" : ""}</div>
            <table className="w-full font-body text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.slate, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  <th className="text-left pb-2 font-medium">Nom & prénoms</th>
                  <th className="text-left pb-2 font-medium">CNI</th>
                  <th className="text-left pb-2 font-medium">Carte transporteur</th>
                  <th className="text-left pb-2 font-medium">Contact</th>
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
          <th className="text-left pb-2 font-medium">Véhicule</th>
          <th className="text-left pb-2 font-medium">Immatriculation</th>
          <th className="text-left pb-2 font-medium">Propriétaire</th>
          <th className="text-left pb-2 font-medium">Commission / Ligne</th>
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
