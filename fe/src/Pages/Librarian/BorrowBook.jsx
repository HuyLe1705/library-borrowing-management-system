import React, { useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import "./LibrarianPages.css";

const API_BASE_URL = "http://localhost:5000/api";

export default function BorrowBook() {
  const { user } = useAuth();

  const [userCode, setUserCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    const normalizedUserCode = userCode.trim();
    const normalizedBarcode = barcode.trim();

    if (!normalizedUserCode || !normalizedBarcode) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập đầy đủ mã độc giả và barcode sách.",
      });
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage({
        type: "error",
        text: "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.",
      });
      return;
    }

    // Lấy mã thủ thư từ tài khoản đang đăng nhập.
    const librarianCode =
      user?.userCode ||
      user?.code ||
      user?.username;

    if (!librarianCode) {
      setMessage({
        type: "error",
        text: "Không tìm thấy mã thủ thư. Vui lòng kiểm tra thông tin tài khoản đăng nhập.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/borrows/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userCode: normalizedUserCode,
            barcode: normalizedBarcode,
            librarianCode,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        throw new Error(
          "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."
        );
      }

      if (response.status === 403) {
        throw new Error(
          result?.message || "Bạn không có quyền thực hiện giao dịch này."
        );
      }

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Không thể tạo giao dịch mượn (${response.status}).`
        );
      }

      setMessage({
        type: "success",
        text:
          result?.message ||
          "Ghi nhận mượn sách thành công.",
      });

      setUserCode("");
      setBarcode("");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Có lỗi xảy ra khi tạo giao dịch mượn.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="librarian-page">
      <div className="librarian-page-heading">
        <div>
          <div className="librarian-eyebrow">
            CIRCULATION / CHECKOUT
          </div>
          <h1>Mượn sách</h1>
          <p>Ghi nhận giao dịch mượn sách cho độc giả tại quầy.</p>
        </div>

        <div className="librarian-process-chip">
          <span className="librarian-process-dot" />
          Quy trình mượn sách
        </div>
      </div>

      <div className="librarian-workflow-grid">
        <section className="librarian-panel librarian-form-panel">
          <div className="librarian-panel-heading">
            <div>
              <h2>Thông tin giao dịch</h2>
              <p>Nhập mã độc giả và mã vạch của sách cần mượn.</p>
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
              <label htmlFor="borrow-user-code">
                Mã độc giả <span>*</span>
              </label>

              <div className="librarian-input-with-icon">
                <span aria-hidden="true">♙</span>

                <input
                  id="borrow-user-code"
                  type="text"
                  value={userCode}
                  onChange={(event) => setUserCode(event.target.value)}
                  placeholder="Nhập hoặc quét mã độc giả"
                  autoComplete="off"
                  required
                />
              </div>

              <small>
                Nhập mã định danh của độc giả trong hệ thống.
              </small>
            </div>

            <div className="librarian-field">
              <label htmlFor="borrow-book-barcode">
                Barcode sách <span>*</span>
              </label>

              <div className="librarian-input-with-icon">
                <span aria-hidden="true">▥</span>

                <input
                  id="borrow-book-barcode"
                  type="text"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Quét hoặc nhập barcode sách"
                  autoComplete="off"
                  required
                />
              </div>

              <small>
                Đầu đọc barcode hoạt động như bàn phím sẽ nhập mã vào ô này.
              </small>
            </div>

            <div className="librarian-form-note">
              <span>ⓘ</span>
              <p>
                Hệ thống sẽ kiểm tra tình trạng sách, điều kiện mượn
                và giới hạn mượn của độc giả trước khi tạo giao dịch.
              </p>
            </div>

            <div className="librarian-form-actions">
              <button
                type="button"
                className="librarian-button librarian-button-secondary"
                onClick={() => {
                  setUserCode("");
                  setBarcode("");
                  setMessage(null);
                }}
                disabled={submitting}
              >
                Xóa dữ liệu
              </button>

              <button
                type="submit"
                className="librarian-button librarian-button-primary"
                disabled={submitting}
              >
                {submitting
                  ? "Đang xử lý..."
                  : "✓ Xác nhận mượn"}
              </button>
            </div>
          </form>
        </section>

        <aside className="librarian-panel librarian-guide-panel">
          <div className="librarian-guide-illustration">▥</div>

          <h2>Quy trình mượn sách</h2>

          <p className="librarian-guide-description">
            Kiểm tra thông tin trước khi xác nhận giao dịch.
          </p>

          <div className="librarian-guide-step">
            <span>1</span>
            <div>
              <strong>Xác định độc giả</strong>
              <p>Nhập mã độc giả cần mượn sách.</p>
            </div>
          </div>

          <div className="librarian-guide-step">
            <span>2</span>
            <div>
              <strong>Quét barcode sách</strong>
              <p>Đảm bảo mã vạch thuộc đúng cuốn sách.</p>
            </div>
          </div>

          <div className="librarian-guide-step">
            <span>3</span>
            <div>
              <strong>Xác nhận giao dịch</strong>
              <p>Chờ backend kiểm tra và trả kết quả.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}