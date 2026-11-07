import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { fileToDataUrl } from './lib/utils.js';

export function ImageInput({ value, onChange, label = 'IMAGE' }) {
  const ref = useRef(null);
  const [err, setErr] = useState('');
  async function pick(e) {
    const f = e.target.files?.[0]; if (!f) return;
    try { setErr(''); onChange(await fileToDataUrl(f)); } catch (x) { setErr(x.message); }
    e.target.value = '';
  }
  return (
    <div className="img-input">
      <label className="fld-label">{label}</label>
      <div className="img-input-row">
        <div className="img-preview">{value ? <img src={value} alt="" /> : <ImagePlus size={22} />}</div>
        <div className="img-input-actions">
          <input type="text" placeholder="Paste an image link (https://…)" value={value?.startsWith('data:') ? '' : value || ''} onChange={(e) => onChange(e.target.value)} />
          <div className="img-input-buttons">
            <button type="button" className="btn-light" onClick={() => ref.current?.click()}>Upload from device</button>
            {value && <button type="button" className="btn-light" onClick={() => onChange('')}>Remove</button>}
          </div>
          <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
          {err && <small className="fld-error">{err}</small>}
        </div>
      </div>
    </div>
  );
}

export function Modal({ title, kicker, onClose, children, wide }) {
  return (
    <div className="hp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`hp-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="hp-modal-head">
          <div>{kicker && <div className="section-kicker">{kicker}</div>}<h2>{title}</h2></div>
          <button className="hp-x" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const cls = { Confirmed: 'ok', 'Checked-in': 'info', Completed: 'done', Cancelled: 'bad', Paid: 'ok', Pending: 'warn', Refunded: 'info', Available: 'ok', Maintenance: 'warn', Hidden: 'done', Active: 'ok', Inactive: 'bad' }[status] || 'done';
  return <span className={`pill pill-${cls}`}><i />{status}</span>;
}

export function Confirm({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-msg">{message}</p>
      <div className="form-actions">
        <button className="btn-light" onClick={onClose}>Keep it</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Please wait…' : confirmLabel}</button>
      </div>
    </Modal>
  );
}
