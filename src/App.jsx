import React, { useState, useMemo, useRef } from "react";
import {
  Car, User, Users, Bell, Plus, X, Check, AlertTriangle, CreditCard,
  Camera, Printer, Search, Home, FileText, Phone, Mail, MapPin,
  BadgeCheck, Calendar, ChevronRight, ChevronLeft, RotateCw, Trash2, Building2
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

/* Deterministic pseudo-QR pattern (visual mockup only — swap for a real
   QR encoder like the `qrcode` package once wired to a backend). */
function seededRand(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
function QRMock({ data, size = 96, fg = C.ink }) {
  const grid = 21;
  const rand = seededRand(data || "MTCI");
  const cell = size / grid;
  const isFinder = (x, y) => {
    const inBlock = (bx, by) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
    return inBlock(0, 0) || inBlock(grid - 7, 0) || inBlock(0, grid - 7);
  };
  const finderCell = (x, y, bx, by) => {
    const lx = x - bx, ly = y - by;
    const border = lx === 0 || lx === 6 || ly === 0 || ly === 6;
    const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
    return border || core;
  };
  const rects = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      let on;
      if (isFinder(x, y)) {
        const bx = x >= grid - 7 ? grid - 7 : 0;
        const by = y >= grid - 7 ? grid - 7 : 0;
        on = finderCell(x, y, bx, by);
      } else {
        on = rand() > 0.56;
      }
      if (on) rects.push(<rect key={x + "-" + y} x={x * cell} y={y * cell} width={cell} height={cell} fill={fg} />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: "#fff", borderRadius: 6 }}>
      {rects}
    </svg>
  );
}

/* Les données de démonstration sont désormais insérées directement en base
   via `npm run db:seed` (voir db/seed.js) plutôt que codées en dur ici. */

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function Badge({ status }) {
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
function VehicleForm({ owners, drivers, onCancel, onSave, addOwner, addDriver }) {
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [chassis, setChassis] = useState("");
  const [carteGrise, setCarteGrise] = useState("");
  const [immatriculation, setImmatriculation] = useState("");
  const [dateMiseCirculation, setDateMiseCirculation] = useState("");
  const [photo, setPhoto] = useState(null);
  const [docs, setDocs] = useState({ visiteTechnique: "", assuranceAuto: "", vignette: "", carteStationnement: "" });

  const [ownerMode, setOwnerMode] = useState(owners.length ? "existing" : "new"); // existing | new
  const [ownerId, setOwnerId] = useState(owners[0]?.id || "");
  const [newOwner, setNewOwner] = useState({ nom: "", prenoms: "", cni: "", contact1: "", contact2: "", contact3: "", email: "", ville: "", quartier: "", photo: null });

  const [driverRows, setDriverRows] = useState([{ mode: drivers.length ? "existing" : "new", id: drivers[0]?.id || "", draft: { nom: "", prenoms: "", cni: "", permisNumero: "", permisDateFin: "", contact1: "", contact2: "", contact3: "", email: "", photo: null } }]);

  const addDriverRow = () => setDriverRows((r) => [...r, { mode: "existing", id: drivers[0]?.id || "", draft: { nom: "", prenoms: "", cni: "", permisNumero: "", permisDateFin: "", contact1: "", contact2: "", contact3: "", email: "", photo: null } }]);
  const removeDriverRow = (i) => setDriverRows((r) => r.filter((_, idx) => idx !== i));
  const updateDriverRow = (i, patch) => setDriverRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const updateDriverDraft = (i, patch) => setDriverRows((r) => r.map((row, idx) => (idx === i ? { ...row, draft: { ...row.draft, ...patch } } : row)));

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const canSave = marque && modele && immatriculation && chassis && !saving;

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

      await onSave({
        marque, modele, chassis, carteGrise, immatriculation, dateMiseCirculation, photo,
        documents: docs,
        proprietaireId: finalOwnerId || null,
        chauffeurIds: finalDriverIds,
      }); // POST /api/vehicules
    } catch (err) {
      setSaveError(err.message || "Erreur lors de l'enregistrement. Vérifiez la connexion à la base.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" style={{ maxHeight: "78vh", overflowY: "auto", paddingRight: 4 }}>
      <SectionCard accent={C.green} icon={<Car size={18} />} title="Véhicule">
        <PhotoUpload value={photo} onChange={setPhoto} label="Photo du véhicule" shape="square" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Marque"><TextInput value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Toyota" /></Field>
          <Field label="Modèle"><TextInput value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Hiace 18 places" /></Field>
          <Field label="Numéro de châssis"><TextInput value={chassis} onChange={(e) => setChassis(e.target.value)} placeholder="JT731HB0900123456" /></Field>
          <Field label="Numéro carte grise"><TextInput value={carteGrise} onChange={(e) => setCarteGrise(e.target.value)} placeholder="CG-2024-000000" /></Field>
          <Field label="Numéro d'immatriculation"><TextInput value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} placeholder="CI 1234 AB 01" /></Field>
          <Field label="1ère mise en circulation"><DateInput value={dateMiseCirculation} onChange={(e) => setDateMiseCirculation(e.target.value)} /></Field>
        </div>
      </SectionCard>

      <SectionCard accent={C.amber} icon={<FileText size={18} />} title="Documents administratifs — dates de fin de validité">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Visite technique"><DateInput value={docs.visiteTechnique} onChange={(e) => setDocs({ ...docs, visiteTechnique: e.target.value })} /></Field>
          <Field label="Assurance auto"><DateInput value={docs.assuranceAuto} onChange={(e) => setDocs({ ...docs, assuranceAuto: e.target.value })} /></Field>
          <Field label="Vignette"><DateInput value={docs.vignette} onChange={(e) => setDocs({ ...docs, vignette: e.target.value })} /></Field>
          <Field label="Carte de stationnement"><DateInput value={docs.carteStationnement} onChange={(e) => setDocs({ ...docs, carteStationnement: e.target.value })} /></Field>
        </div>
        <p className="font-body text-[11px] mt-3" style={{ color: C.slate }}>
          Le permis de conduire est suivi au niveau de la fiche de chaque chauffeur ci-dessous et apparaît automatiquement dans les alertes de ce véhicule.
        </p>
      </SectionCard>

      <SectionCard accent={C.orange} icon={<User size={18} />} title="Propriétaire">
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setOwnerMode("existing")} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: ownerMode === "existing" ? C.orangeLight : "transparent", color: ownerMode === "existing" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "existing" ? C.orange : C.border}` }}>Propriétaire existant</button>
          <button type="button" onClick={() => setOwnerMode("new")} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: ownerMode === "new" ? C.orangeLight : "transparent", color: ownerMode === "new" ? C.orangeDark : C.slate, border: `1px solid ${ownerMode === "new" ? C.orange : C.border}` }}>+ Nouveau propriétaire</button>
        </div>

        {ownerMode === "existing" ? (
          <Field label="Sélectionner un propriétaire">
            <select style={inputStyle} className="font-body" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.prenoms} {o.nom} — {o.quartier}</option>)}
            </select>
          </Field>
        ) : (
          <div className="flex flex-col gap-4">
            <PhotoUpload value={newOwner.photo} onChange={(v) => setNewOwner({ ...newOwner, photo: v })} label="Photo du propriétaire" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nom"><TextInput value={newOwner.nom} onChange={(e) => setNewOwner({ ...newOwner, nom: e.target.value })} /></Field>
              <Field label="Prénoms"><TextInput value={newOwner.prenoms} onChange={(e) => setNewOwner({ ...newOwner, prenoms: e.target.value })} /></Field>
              <Field label="Numéro CNI"><TextInput value={newOwner.cni} onChange={(e) => setNewOwner({ ...newOwner, cni: e.target.value })} /></Field>
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

      <SectionCard
        accent={C.greenDark}
        icon={<Users size={18} />}
        title="Chauffeur(s)"
        right={
          <button type="button" onClick={addDriverRow} className="font-body flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: C.greenLight, color: C.greenDark }}>
            <Plus size={14} /> Ajouter un chauffeur
          </button>
        }
      >
        <div className="flex flex-col gap-5">
          {driverRows.map((row, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateDriverRow(i, { mode: "existing" })} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: row.mode === "existing" ? C.greenLight : "transparent", color: row.mode === "existing" ? C.greenDark : C.slate, border: `1px solid ${row.mode === "existing" ? C.green : C.border}` }}>Chauffeur existant</button>
                  <button type="button" onClick={() => updateDriverRow(i, { mode: "new" })} className="font-body text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: row.mode === "new" ? C.greenLight : "transparent", color: row.mode === "new" ? C.greenDark : C.slate, border: `1px solid ${row.mode === "new" ? C.green : C.border}` }}>+ Nouveau chauffeur</button>
                </div>
                {driverRows.length > 1 && (
                  <button type="button" onClick={() => removeDriverRow(i)} style={{ color: C.red }} title="Retirer"><Trash2 size={16} /></button>
                )}
              </div>

              {row.mode === "existing" ? (
                <Field label="Sélectionner un chauffeur">
                  <select style={inputStyle} className="font-body" value={row.id} onChange={(e) => updateDriverRow(i, { id: e.target.value })}>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.prenoms} {d.nom} — permis {d.permisNumero}</option>)}
                  </select>
                </Field>
              ) : (
                <div className="flex flex-col gap-4">
                  <PhotoUpload value={row.draft.photo} onChange={(v) => updateDriverDraft(i, { photo: v })} label="Photo du chauffeur" />
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

      <div className="flex items-center justify-end gap-3 pb-1">
        {saveError && <span className="font-body text-xs" style={{ color: C.red, flex: 1 }}>{saveError}</span>}
        <button onClick={onCancel} className="font-body text-sm font-semibold px-4 py-2.5 rounded-lg" style={{ color: C.slate }}>Annuler</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
          style={{ background: canSave ? C.green : "#B9C4BE", color: "#fff", cursor: canSave ? "pointer" : "not-allowed" }}
        >
          <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer le véhicule"}
        </button>
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
    <div className="flex flex-col gap-4" style={{ maxHeight: "82vh", overflowY: "auto" }}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 28 }}>
        <TricolorRule />
        <div className="flex items-center justify-between mt-5 mb-6">
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={20} color="#fff" />
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Mutuelle des Transporteurs de Côte d'Ivoire — MUGETRAN-CI</div>
              <div className="font-body" style={{ fontSize: 11, color: C.slate }}>Fiche Véhicule Commercial — Réf. {vehicle.id}</div>
            </div>
          </div>
          <button onClick={() => window.print()} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.ink }}>
            <Printer size={14} /> Imprimer
          </button>
        </div>

        {/* Véhicule */}
        <div className="mb-6">
          <div className="font-display flex items-center gap-2 mb-3" style={{ fontSize: 15, fontWeight: 600, color: C.green }}>
            <Car size={16} /> Véhicule
          </div>
          <div className="flex gap-5">
            <div style={{ width: 84, height: 84, borderRadius: 10, overflow: "hidden", background: C.cream, flexShrink: 0, border: `1px solid ${C.border}` }}>
              {vehicle.photo ? <img src={vehicle.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center"><Car size={26} color={C.slate} /></div>}
            </div>
            <div className="font-body grid grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1" style={{ color: C.ink }}>
              <div><span style={{ color: C.slate }}>Marque</span><div className="font-medium">{vehicle.marque}</div></div>
              <div><span style={{ color: C.slate }}>Modèle</span><div className="font-medium">{vehicle.modele}</div></div>
              <div><span style={{ color: C.slate }}>Immatriculation</span><div className="font-mono font-medium">{vehicle.immatriculation}</div></div>
              <div><span style={{ color: C.slate }}>Châssis</span><div className="font-mono font-medium">{vehicle.chassis}</div></div>
              <div><span style={{ color: C.slate }}>Carte grise</span><div className="font-mono font-medium">{vehicle.carteGrise}</div></div>
              <div><span style={{ color: C.slate }}>Mise en circulation</span><div className="font-medium">{fmt(vehicle.dateMiseCirculation)}</div></div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[["Visite technique", vehicle.documents.visiteTechnique], ["Assurance auto", vehicle.documents.assuranceAuto], ["Vignette", vehicle.documents.vignette], ["Carte stationnement", vehicle.documents.carteStationnement]].map(([label, date]) => {
              const s = statusOf(date);
              return (
                <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                  <div className="font-body text-[11px] mb-1" style={{ color: C.slate }}>{label}</div>
                  <div className="font-mono text-xs mb-1.5" style={{ color: C.ink }}>{fmt(date)}</div>
                  <Badge status={s} />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Propriétaire */}
        <div className="my-6">
          <div className="font-display flex items-center gap-2 mb-3" style={{ fontSize: 15, fontWeight: 600, color: C.orangeDark }}>
            <User size={16} /> Propriétaire
          </div>
          {owner ? (
            <div className="flex gap-5">
              <div style={{ width: 64, height: 64, borderRadius: 999, overflow: "hidden", background: C.cream, flexShrink: 0, border: `1px solid ${C.border}` }}>
                {owner.photo ? <img src={owner.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-semibold" style={{ color: C.slate }}>{initials(owner.nom, owner.prenoms)}</div>}
              </div>
              <div className="font-body grid grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1" style={{ color: C.ink }}>
                <div><span style={{ color: C.slate }}>Nom & prénoms</span><div className="font-medium">{owner.prenoms} {owner.nom}</div></div>
                <div><span style={{ color: C.slate }}>CNI</span><div className="font-mono font-medium">{owner.cni}</div></div>
                <div><span style={{ color: C.slate }}>Email</span><div className="font-medium">{owner.email || "—"}</div></div>
                <div><span style={{ color: C.slate }}>Contacts</span><div className="font-medium">{[owner.contact1, owner.contact2, owner.contact3].filter(Boolean).join(" · ")}</div></div>
                <div><span style={{ color: C.slate }}>Ville</span><div className="font-medium">{owner.ville}</div></div>
                <div><span style={{ color: C.slate }}>Quartier</span><div className="font-medium">{owner.quartier}</div></div>
              </div>
            </div>
          ) : <div className="font-body text-sm" style={{ color: C.slate }}>Aucun propriétaire enregistré.</div>}
          {vehicle.historiqueProprietaires.length > 1 && (
            <div className="font-body text-[11px] mt-3" style={{ color: C.slate }}>
              Historique : {vehicle.historiqueProprietaires.map((h, i) => {
                const o = owners.find((x) => x.id === h.proprietaireId);
                return `${o ? o.prenoms + " " + o.nom : "?"} (depuis ${fmt(h.depuis)})`;
              }).join("  →  ")}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: C.border }} />

        {/* Chauffeurs */}
        <div className="mt-6">
          <div className="font-display flex items-center gap-2 mb-3" style={{ fontSize: 15, fontWeight: 600, color: C.greenDark }}>
            <Users size={16} /> Chauffeur{vDrivers.length > 1 ? "s" : ""}
          </div>
          <div className="flex flex-col gap-4">
            {vDrivers.map((d) => {
              const s = statusOf(d.permisDateFin);
              return (
                <div key={d.id} className="flex gap-5">
                  <div style={{ width: 64, height: 64, borderRadius: 999, overflow: "hidden", background: C.cream, flexShrink: 0, border: `1px solid ${C.border}` }}>
                    {d.photo ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-body font-semibold" style={{ color: C.slate }}>{initials(d.nom, d.prenoms)}</div>}
                  </div>
                  <div className="font-body grid grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1" style={{ color: C.ink }}>
                    <div><span style={{ color: C.slate }}>Nom & prénoms</span><div className="font-medium">{d.prenoms} {d.nom}</div></div>
                    <div><span style={{ color: C.slate }}>CNI</span><div className="font-mono font-medium">{d.cni}</div></div>
                    <div><span style={{ color: C.slate }}>Permis n°</span><div className="font-mono font-medium">{d.permisNumero}</div></div>
                    <div><span style={{ color: C.slate }}>Fin validité permis</span><div className="font-medium flex items-center gap-2">{fmt(d.permisDateFin)} <Badge status={s} /></div></div>
                    <div><span style={{ color: C.slate }}>Contacts</span><div className="font-medium">{[d.contact1, d.contact2, d.contact3].filter(Boolean).join(" · ")}</div></div>
                    <div><span style={{ color: C.slate }}>Email</span><div className="font-medium">{d.email || "—"}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <button onClick={onClose} className="font-body text-sm font-semibold self-end px-4 py-2" style={{ color: C.slate }}>Fermer</button>
    </div>
  );
}

/* ============================================================
   CARTE DE MEMBRE (chauffeur)
   ============================================================ */
function MembershipCard({ driver, vehicle }) {
  const [flipped, setFlipped] = useState(false);
  if (!driver) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{
          width: 340, height: 214, borderRadius: 16, position: "relative",
          background: flipped
            ? `linear-gradient(135deg, ${C.greenDark}, ${C.green})`
            : `linear-gradient(135deg, ${C.green} 0%, ${C.green} 60%, ${C.orange} 130%)`,
          color: "#fff", padding: 18, boxShadow: "0 12px 28px rgba(11,110,79,0.28)",
          transition: "background .3s",
        }}
      >
        {!flipped ? (
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>MUGETRAN-CI</div>
                <div className="font-body" style={{ fontSize: 9.5, opacity: 0.85 }}>MUTUELLE DES TRANSPORTEURS DE CÔTE D'IVOIRE</div>
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
              <div style={{ background: "#fff", borderRadius: 6, padding: 3 }}>
                <QRMock data={"PAY:" + driver.id} size={54} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full items-center justify-center gap-2">
            <div style={{ background: "#fff", borderRadius: 8, padding: 6 }}>
              <QRMock data={"FUEL:" + driver.id} size={92} />
            </div>
            <div className="font-body text-center" style={{ fontSize: 9.5, opacity: 0.85 }}>
              Pointage carburant en station · Carte n° {driver.id}
              <br />En cas de perte, contactez la Mutuelle.
            </div>
          </div>
        )}
      </div>
      <button onClick={() => setFlipped((f) => !f)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ border: `1px solid ${C.border}`, color: C.ink }}>
        <RotateCw size={13} /> {flipped ? "Voir le recto" : "Voir le verso"}
      </button>
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
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, d, v] = await Promise.all([
          apiGet("/api/proprietaires"),
          apiGet("/api/chauffeurs"),
          apiGet("/api/vehicules"),
        ]);
        if (cancelled) return;
        setOwners(o);
        setDrivers(d);
        setVehicles(v);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Impossible de charger les données depuis la base.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
  const addVehicle = async (v) => {
    const created = await apiPost("/api/vehicules", v);
    setVehicles((s) => [...s, created]);
    setShowForm(false);
    setFicheVehicle(created);
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
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }}>Mutuelle des transporteurs</div>
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
                {{ dashboard: "Tableau de bord", vehicles: "Véhicules", owners: "Propriétaires", drivers: "Chauffeurs", alerts: "Alertes documents" }[page]}
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
                <VehicleTable vehicles={vehicles.slice(-5).reverse()} owners={owners} onFiche={setFicheVehicle} />
              </SectionCard>
            </div>
          )}

          {page === "vehicles" && (
            <SectionCard accent={C.green} icon={<Car size={18} />} title={`Tous les véhicules (${filteredVehicles.length})`}>
              <VehicleTable vehicles={filteredVehicles} owners={owners} onFiche={setFicheVehicle} />
            </SectionCard>
          )}

          {page === "owners" && (
            <div className="grid grid-cols-3 gap-4">
              {owners.map((o) => {
                const ownedCount = vehicles.filter((v) => v.proprietaireId === o.id).length;
                return (
                  <div key={o.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ width: 48, height: 48, borderRadius: 999, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                        {o.photo ? <img src={o.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-semibold text-sm" style={{ color: C.slate }}>{initials(o.nom, o.prenoms)}</div>}
                      </div>
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
            <div className="grid grid-cols-3 gap-4">
              {drivers.map((d) => {
                const veh = vehicles.find((v) => v.chauffeurIds.includes(d.id));
                const s = statusOf(d.permisDateFin);
                return (
                  <div key={d.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ width: 48, height: 48, borderRadius: 999, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                        {d.photo ? <img src={d.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center font-semibold text-sm" style={{ color: C.slate }}>{initials(d.nom, d.prenoms)}</div>}
                      </div>
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
                      <button onClick={() => setCardDriver(d)} className="font-body text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.greenLight, color: C.greenDark }}>
                        <CreditCard size={13} /> Carte membre
                      </button>
                    </div>
                  </div>
                );
              })}
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
        <VehicleForm owners={owners} drivers={drivers} onCancel={() => setShowForm(false)} onSave={addVehicle} addOwner={addOwner} addDriver={addDriver} />
      </Modal>}

      {ficheVehicle && <Modal onClose={() => setFicheVehicle(null)} title="Fiche Véhicule Commercial" wide>
        <FicheVehicule vehicle={ficheVehicle} owners={owners} drivers={drivers} onClose={() => setFicheVehicle(null)} />
      </Modal>}

      {cardDriver && <Modal onClose={() => setCardDriver(null)} title="Carte de membre">
        <MembershipCard driver={cardDriver} vehicle={vehicles.find((v) => v.chauffeurIds.includes(cardDriver.id))} />
      </Modal>}
    </div>
  );
}

function VehicleTable({ vehicles, owners, onFiche }) {
  return (
    <table className="w-full font-body text-sm" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: C.slate, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
          <th className="text-left pb-2 font-medium">Véhicule</th>
          <th className="text-left pb-2 font-medium">Immatriculation</th>
          <th className="text-left pb-2 font-medium">Propriétaire</th>
          <th className="text-left pb-2 font-medium">Documents</th>
          <th className="text-right pb-2 font-medium">Fiche</th>
        </tr>
      </thead>
      <tbody>
        {vehicles.map((v) => {
          const owner = owners.find((o) => o.id === v.proprietaireId);
          const statuses = Object.values(v.documents).map(statusOf);
          const worst = statuses.some((s) => s.key === "expire") ? "expire" : statuses.some((s) => s.key === "alerte") ? "alerte" : "valide";
          const worstStatus = worst === "expire" ? { label: "Document expiré", color: C.red, bg: C.redLight } : worst === "alerte" ? { label: "Échéance proche", color: C.amber, bg: C.amberLight } : { label: "À jour", color: C.green, bg: C.greenLight };
          return (
            <tr key={v.id} style={{ borderTop: `1px solid ${C.border}` }}>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 38, height: 38, borderRadius: 8, overflow: "hidden", background: C.cream, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                    {v.photo ? <img src={v.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div className="w-full h-full flex items-center justify-center"><Car size={16} color={C.slate} /></div>}
                  </div>
                  <div>
                    <div className="font-medium">{v.marque} {v.modele}</div>
                    <div className="text-xs" style={{ color: C.slate }}>{v.chauffeurIds.length} chauffeur{v.chauffeurIds.length > 1 ? "s" : ""}</div>
                  </div>
                </div>
              </td>
              <td className="font-mono">{v.immatriculation}</td>
              <td>{owner ? `${owner.prenoms} ${owner.nom}` : "—"}</td>
              <td><Badge status={worstStatus} /></td>
              <td className="text-right">
                <button onClick={() => onFiche(v)} className="font-body text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.border}`, color: C.ink }}>Voir la fiche</button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,24,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}>
      <div style={{ background: C.cream, borderRadius: 16, width: wide ? 720 : 380, maxWidth: "94vw", padding: 20 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{title}</h2>
          <button onClick={onClose} style={{ color: C.slate }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
