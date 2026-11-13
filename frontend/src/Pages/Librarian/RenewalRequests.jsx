import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getRenewalRequests, decideRenewal } from '../../Services/circulationService';
import './CirculationModules.css';

const labels = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' };
const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

export default function RenewalRequests({ reader = false, onChange }) {
    const loadVersion = useRef(0);
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState(reader ? '' : 'PENDING');
    const [userCode, setUserCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [selection, setSelection] = useState(null);
    const [note, setNote] = useState('');
    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        setLoading(true); setError('');
        try { const result = await getRenewalRequests({ status, userCode: reader ? undefined : userCode.trim() }); if (version === loadVersion.current) setItems(result); }
        catch (err) { if (version === loadVersion.current) setError(err.message); }
        finally { if (version === loadVersion.current) setLoading(false); }
    }, [status, userCode, reader]);
    useEffect(() => { load(); }, [load]);
    const submit = async (event) => {
        event.preventDefault(); setBusy(true); setError(''); setMessage('');
        try {
            await decideRenewal(selection.id, selection.action, note);
            setSelection(null); setNote(''); setMessage('Đã xử lý yêu cầu gia hạn.'); await load();
            if (onChange) await onChange();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };
    return <section className="circulation-module">
        <div className="cm-heading"><div><h1>Yêu cầu gia hạn</h1><p>Gia hạn tối đa 1 lần, thêm 7 ngày từ hạn trả hiện tại. Cần được thủ thư phê duyệt.</p></div><button onClick={load} disabled={loading || busy}>Làm mới</button></div>
        <div className="cm-filters"><label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(labels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            {!reader && <label>Mã độc giả<input value={userCode} onChange={e => setUserCode(e.target.value)} placeholder="VD: SV001" /></label>}
            <span>{items.length} yêu cầu</span></div>
        {error && <div className="cm-error" role="alert">{error}</div>}{message && <div className="cm-success" role="status">{message}</div>}
        {selection && <form className="cm-decision" onSubmit={submit}><h3>{selection.action === 'approve' ? 'Duyệt' : selection.action === 'reject' ? 'Từ chối' : 'Hủy'} yêu cầu #{selection.id}</h3>
            <label>Ghi chú<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
            <div className="cm-actions"><button disabled={busy} type="submit">{busy ? 'Đang lưu…' : 'Xác nhận'}</button><button type="button" disabled={busy} onClick={() => setSelection(null)}>Đóng</button></div></form>}
        <div className="cm-table-wrap"><table><thead><tr><th>Yêu cầu / Phiếu mượn</th>{!reader && <th>Độc giả</th>}<th>Sách</th><th>Hạn cũ / mới</th><th>Ghi chú</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
            {loading ? <tr><td colSpan={7}>Đang tải…</td></tr> : !items.length ? <tr><td colSpan={7}>Chưa có yêu cầu phù hợp.</td></tr> : items.map(item => <tr key={item.id}>
                <td>#{item.id}<small>Phiếu #{item.borrowRecordId} · {date(item.createdAt)}</small></td>{!reader && <td>{item.borrowerName}<small>{item.borrowerCode}</small></td>}
                <td>{item.bookTitle}<small>{item.barcode}</small></td><td>{date(item.originalDueDate)}<small>→ {date(item.newDueDate)}</small></td>
                <td>{item.note || '—'}{item.adminNote && <small>Thư viện: {item.adminNote}</small>}</td><td><span className={`cm-badge cm-${item.status}`}>{labels[item.status]}</span></td>
                <td>{item.status === 'PENDING' && <div className="cm-actions">{(reader ? ['cancel'] : ['approve','reject']).map(action => <button disabled={busy || !!selection} key={action} onClick={() => { setSelection({ id:item.id, action }); setNote(''); }}>{action === 'approve' ? 'Duyệt +7 ngày' : action === 'reject' ? 'Từ chối' : 'Hủy yêu cầu'}</button>)}</div>}</td>
            </tr>)}
        </tbody></table></div>
    </section>;
}
