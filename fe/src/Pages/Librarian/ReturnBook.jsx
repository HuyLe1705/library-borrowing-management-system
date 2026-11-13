import React, { useState } from "react";
import "./LibrarianPages.css";

const API_BASE_URL = "http://localhost:5000/api";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("vi-VN");
}

export default function ReturnBook() {
  const [barcode, setBarcode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [returnedBook, setReturnedBook] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedBarcode = barcode.trim();

    setMessage(null);
    setReturnedBook(null);

    if (!normalizedBarcode) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập barcode sách cần trả.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/borrowings/return`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            barcode: normalizedBarcode,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ??
            result?.error ??
            `Không thể xác nhận trả sách (${response.status}).`
        );
      }

      const data = result?.data ?? result?.result ?? result;

      setReturnedBook(data);

      setMessage({
        type: "success",
        text:
          result?.message ??
          data?.message ??
          "Xác nhận trả sách thành công.",
      });

      setBarcode("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Có lỗi xảy ra khi trả sách.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setBarcode("");
    setMessage(null);
    setReturnedBook(null);
  }

  const bookTitle =
    returnedBook?.book?.title ??
    returnedBook?.bookTitle ??
    returnedBook?.title;

  const readerName =
    returnedBook?.user?.fullName ??
    returnedBook?.reader?.fullName ??
    returnedBook?.readerName ??
    returnedBook?.userName;

  const returnDate =
    returnedBook?.returnDate ??
    returnedBook?.returnedAt ??
    returnedBook?.actualReturnDate;

  const dueDate =
    returnedBook?.dueDate ??
    returnedBook?.returnDueDate;

  return (
    <div className="librarian-page">
      <div className="librarian-page-heading">
        <div>
          <div className="librarian-eyebrow">CIRCULATION / CHECK-IN</div>
          <h1>Trả sách</h1>
          <p>Tiếp nhận sách và cập nhật giao dịch trả sách của độc giả.</p>
        </div>

        <div className="librarian-process-chip">
          <span className="librarian-process-dot" />
          Quy trình trả sách
        </div>
      </div>

      <div className="librarian-workflow-grid">
        <section className="librarian-panel librarian-form-panel">
          <div className="librarian-panel-heading">
            <div>
              <h2>Tiếp nhận sách trả</h2>
              <p>Quét barcode để gửi yêu cầu xác nhận trả sách.</p>
            </div>

            <span className="librarian-step-number">01</span>
          </div>

          {message && (
            <div
              className={`librarian-alert ${
                message.type === "success"
                  ? "librarian-alert-success"
                  : "librarian-alert-error"
              }`}
              role="status"
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="librarian-form">
            <div className="librarian-field">
              <label htmlFor="return-book-barcode">
                Barcode sách <span>*</span>
              </label>

              <div className="librarian-input-with-icon">
                <span aria-hidden="true">▥</span>

                <input
                  id="return-book-barcode"
                  type="text"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Quét hoặc nhập barcode sách"
                  autoComplete="off"
                  required
                  autoFocus
                />
              </div>

              <small>
                Sử dụng barcode của cuốn sách đang được ghi nhận là cho mượn.
              </small>
            </div>

            <div className="librarian-form-note">
              <span>ⓘ</span>
              <p>
                Chỉ xác nhận trả khi backend xác định được giao dịch mượn hợp
                lệ của cuốn sách.
              </p>
            </div>

            <div className="librarian-form-actions">
              <button
                type="button"
                className="librarian-button librarian-button-secondary"
                onClick={handleReset}
                disabled={submitting}
              >
                Làm mới
              </button>

              <button
                type="submit"
                className="librarian-button librarian-button-primary"
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "✓ Xác nhận trả sách"}
              </button>
            </div>
          </form>
        </section>

        <aside className="librarian-panel librarian-guide-panel">
          <div className="librarian-guide-illustration">↙</div>

          <h2>Quy trình nhận trả</h2>

          <p className="librarian-guide-description">
            Đảm bảo giao dịch được cập nhật chính xác.
          </p>

          <div className="librarian-guide-step">
            <span>1</span>
            <div>
              <strong>Tiếp nhận sách</strong>
              <p>Nhận sách từ độc giả và quét barcode.</p>
            </div>
          </div>

          <div className="librarian-guide-step">
            <span>2</span>
            <div>
              <strong>Kiểm tra giao dịch</strong>
              <p>Backend kiểm tra trạng thái mượn và hạn trả.</p>
            </div>
          </div>

          <div className="librarian-guide-step">
            <span>3</span>
            <div>
              <strong>Hoàn tất trả sách</strong>
              <p>Chỉ hoàn tất khi backend trả về kết quả thành công.</p>
            </div>
          </div>
        </aside>
      </div>

      {message?.type === "success" && (
        <section className="librarian-panel librarian-return-result">
          <div className="librarian-return-result-heading">
            <span className="librarian-result-check">✓</span>

            <div>
              <h2>Giao dịch đã được xác nhận</h2>
              <p>Kết quả trả về từ backend.</p>
            </div>
          </div>

          <div className="librarian-result-grid">
            <div className="librarian-result-item">
              <span>Barcode</span>
              <strong>
                {returnedBook?.barcode ??
                  returnedBook?.book?.barcode ??
                  "Đã xử lý"}
              </strong>
            </div>

            <div className="librarian-result-item">
              <span>Tên sách</span>
              <strong>{bookTitle ?? "Backend không trả về thông tin"}</strong>
            </div>

            <div className="librarian-result-item">
              <span>Độc giả</span>
              <strong>{readerName ?? "Backend không trả về thông tin"}</strong>
            </div>

            <div className="librarian-result-item">
              <span>Hạn trả</span>
              <strong>{formatDate(dueDate)}</strong>
            </div>

            <div className="librarian-result-item">
              <span>Ngày trả</span>
              <strong>{formatDate(returnDate)}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}