import React from 'react';
import { Link } from 'react-router-dom';
import './about.css';
import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';

const features = [
  {
    number: '01',
    icon: '⌕',
    title: 'Tra cứu sách dễ dàng',
    description:
      'Tìm kiếm sách theo tên, tác giả, ISBN hoặc danh mục. Nhanh chóng tiếp cận những tài liệu bạn cần.',
    color: 'blue',
  },
  {
    number: '02',
    icon: '▤',
    title: 'Khám phá kho tri thức',
    description:
      'Khám phá nhiều danh mục sách thuộc công nghệ, khoa học, kinh tế và các lĩnh vực học thuật khác.',
    color: 'purple',
  },
  {
    number: '03',
    icon: '✦',
    title: 'Cập nhật sách mới',
    description:
      'Theo dõi những đầu sách mới được cập nhật và tìm thêm nguồn tài liệu hữu ích cho việc học tập.',
    color: 'orange',
  },
];

const steps = [
  {
    number: '01',
    title: 'Tìm kiếm',
    description:
      'Nhập tên sách, tác giả hoặc từ khóa vào thanh tìm kiếm.',
  },
  {
    number: '02',
    title: 'Khám phá',
    description:
      'Xem thông tin chi tiết và khám phá những cuốn sách phù hợp.',
  },
  {
    number: '03',
    title: 'Tiếp cận tri thức',
    description:
      'Sử dụng thông tin sách để lựa chọn tài liệu phục vụ học tập và nghiên cứu.',
  },
];

function About() {
  return (
    <main className="about-page">
        <Header/>
      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero__background about-hero__background--one" />
        <div className="about-hero__background about-hero__background--two" />

        <div className="about-container about-hero__inner">
          <div className="about-hero__content">
            <span className="about-eyebrow">
              <span className="about-eyebrow__dot" />
              KHÔNG GIAN TRI THỨC SỐ
            </span>

            <h1>
              Mở ra thế giới
              <br />
              tri thức cùng <span>BK Library.</span>
            </h1>

            <p>
              Mỗi cuốn sách là một hành trình khám phá. BK Library giúp bạn
              tìm kiếm tài liệu, khám phá những lĩnh vực mới và đến gần hơn
              với kho tàng tri thức rộng lớn.
            </p>

            <div className="about-hero__actions">
              <Link to="/search" className="about-button about-button--primary">
                Khám phá sách
                <span aria-hidden="true">↗</span>
              </Link>

              <a href="#about-mission" className="about-button about-button--secondary">
                Tìm hiểu thêm
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="about-hero__note">
              <span className="about-hero__note-icon">✦</span>
              <span>
                <strong>Học hỏi mỗi ngày</strong>
                <small>Khám phá tri thức theo cách của bạn</small>
              </span>
            </div>
          </div>

          <div className="about-hero__visual" aria-label="Minh họa những cuốn sách">
            <div className="about-book-scene">
              <div className="about-book-scene__glow" />

              <div className="about-floating-card about-floating-card--top">
                <span>✦</span>
                <div>
                  <strong>Khám phá</strong>
                  <small>Những ý tưởng mới</small>
                </div>
              </div>

              <div className="about-books">
                <div className="about-book about-book--back">
                  <span>KNOWLEDGE</span>
                </div>
                <div className="about-book about-book--middle">
                  <span>EXPLORE</span>
                </div>
                <div className="about-book about-book--front">
                  <div className="about-book__symbol">✳</div>
                  <span>THE WORLD<br />OF IDEAS</span>
                  <small>BK LIBRARY</small>
                </div>
              </div>

              <div className="about-floating-card about-floating-card--bottom">
                <span className="about-floating-card__check">✓</span>
                <div>
                  <strong>Tri thức trong tầm tay</strong>
                  <small>Bắt đầu từ một cuốn sách</small>
                </div>
              </div>

              <div className="about-orbit about-orbit--one" />
              <div className="about-orbit about-orbit--two" />
            </div>
          </div>
        </div>

        <div className="about-hero__bottom">
          <span>TRI THỨC</span>
          <span className="about-hero__bottom-line" />
          <span>KHÁM PHÁ</span>
          <span className="about-hero__bottom-line" />
          <span>PHÁT TRIỂN</span>
        </div>
      </section>

      {/* Introduction */}
      <section className="about-intro" id="about-mission">
        <div className="about-container about-intro__grid">
          <div className="about-section-heading">
            <span className="about-section-label">VỀ BK LIBRARY</span>
            <h2>
              Một không gian
              <br />
              dành cho <span>người ham học.</span>
            </h2>
          </div>

          <div className="about-intro__content">
            <p className="about-intro__lead">
              BK Library là hệ thống hỗ trợ tra cứu và khám phá sách, được
              xây dựng nhằm giúp người đọc tiếp cận thông tin tài liệu thuận
              tiện hơn.
            </p>

            <p>
              Thay vì mất nhiều thời gian tìm kiếm thủ công, bạn có thể chủ
              động tra cứu sách, khám phá các danh mục và xem thông tin tài
              liệu thông qua một giao diện trực quan, dễ sử dụng.
            </p>

            <p>
              Chúng tôi hướng đến một trải nghiệm tìm kiếm đơn giản, giúp
              việc học tập và nghiên cứu trở nên thuận tiện hơn.
            </p>

            <Link to="/search" className="about-text-link">
              Bắt đầu tìm kiếm
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="about-features">
        <div className="about-container">
          <div className="about-centered-heading">
            <span className="about-section-label">ĐIỀU BẠN CÓ THỂ LÀM</span>
            <h2>Khám phá nhiều hơn với BK Library</h2>
            <p>
              Những công cụ thiết thực giúp bạn tìm kiếm và tiếp cận tài liệu
              một cách thuận tiện.
            </p>
          </div>

          <div className="about-feature-grid">
            {features.map((feature) => (
              <article
                className="about-feature-card"
                key={feature.number}
              >
                <div className="about-feature-card__top">
                  <div className={`about-feature-card__icon ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <span className="about-feature-card__number">
                    {feature.number}
                  </span>
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <Link
                  to="/search"
                  className="about-feature-card__link"
                  aria-label={`${feature.title} - Khám phá sách`}
                >
                  Khám phá ngay
                  <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="about-steps">
        <div className="about-container about-steps__grid">
          <div className="about-steps__intro">
            <span className="about-section-label">BẮT ĐẦU THẬT ĐƠN GIẢN</span>

            <h2>
              Ba bước để
              <br />
              tìm thấy cuốn sách
              <br />
              <span>bạn cần.</span>
            </h2>

            <p>
              Không cần quy trình phức tạp. Bắt đầu bằng một từ khóa và để
              BK Library hỗ trợ bạn khám phá những tài liệu phù hợp.
            </p>

            <Link to="/search" className="about-button about-button--primary">
              Tra cứu sách
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="about-step-list">
            {steps.map((step) => (
              <article className="about-step" key={step.number}>
                <div className="about-step__number">{step.number}</div>

                <div className="about-step__content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>

                <span className="about-step__arrow" aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="about-container">
          <div className="about-cta__inner">
            <div className="about-cta__decoration">✳</div>

            <div className="about-cta__content">
              <span className="about-section-label">
                HÀNH TRÌNH TRI THỨC BẮT ĐẦU TỪ ĐÂY
              </span>

              <h2>
                Cuốn sách tiếp theo
                <br />
                của bạn đang chờ được khám phá.
              </h2>

              <p>
                Bắt đầu tìm kiếm và mở ra những góc nhìn mới ngay hôm nay.
              </p>

              <Link to="/search" className="about-button about-button--light">
                Khám phá kho sách
                <span aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className="about-cta__mark" aria-hidden="true">
              BK
              <span>LIBRARY</span>
            </div>
          </div>
        </div>
      </section>
      <Footer/>
    </main>
  );
}

export default About;