import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import ThemeToggleButton from '../components/ThemeToggleButton';

// propsとして theme と toggleTheme を受け取ります
function Home({ theme, toggleTheme }) {
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const headerOffset = 80;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
         top: offsetPosition,
         behavior: "smooth"
      });
    }
  };

  const slidesEmbedUrl = "https://docs.google.com/presentation/d/1-1ogWEprs_wNI0mcxvGjUvORIdZ4OXZSIqajL_t56xI/embed?start=false&loop=false&delayms=3000&rm=minimal";

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.navContainer}>
          <span className={styles.logo}>Memento</span>
          <nav className={styles.nav}>
            <button onClick={() => scrollToSection('home')} className={styles.navLink}>ホーム</button>
            <button onClick={() => scrollToSection('about')} className={styles.navLink}>会社概要</button>
            <button onClick={() => scrollToSection('services')} className={styles.navLink}>事業内容</button>
            <button onClick={() => scrollToSection('clients')} className={styles.navLink}>取引企業</button>
            <button onClick={() => scrollToSection('contact')} className={styles.navLink}>お問い合わせ</button>
            <Link to="/login" className={`${styles.navLink} ${styles.navLinkJizo}`}>地蔵1on1</Link>
            {/* ★ テーマ切り替えボタンを設置 */}
            <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
          </nav>
        </div>
      </header>

      <main>
        <section id="home" className={styles.hero}>
            <div className={styles.heroContent}>
                <h1 className={styles.mainTitle}>人の記憶や想いを大切にし、<br />未来へと繋ぐ。</h1>
                <p className={styles.subtitle}>株式会社メメントは、人の記憶や想いを大切にし、未来へと繋ぐサービスを展開しています。</p>
                <Link to="/login" className={styles.ctaButton}>地蔵1on1を始める</Link>
            </div>
        </section>

        <section id="promotion" className={styles.section}>
            <h2 className={styles.sectionTitle}>1on1推進事業</h2>
            <p className={styles.sectionText}>AIを活用した1on1支援ツール「地蔵1on1」で、効果的な対話を促進し、組織と個人の成長をサポートします。上司と部下の継続的なコミュニケーションを通じて、エンゲージメントと生産性の向上を実現します。</p>
        </section>

        <section id="about" className={`${styles.section} ${styles.bgGray}`}>
            <h2 className={styles.sectionTitle}>会社概要</h2>
            <div className={styles.aboutGrid}>
                <div>
                    <p><strong>会社名:</strong> 株式会社メメント (Memento Inc.)</p>
                    <p><strong>設立:</strong> 2023年4月</p>
                    <p><strong>代表取締役:</strong> 森 智寛</p>
                    <p><strong>所在地:</strong> 福岡県福岡市西区横浜3丁目6番31 105号</p>
                </div>
                <div>
                    <p><strong>ミッション:</strong> 30分で社会を前進させる</p>
                    <p><strong>ビジョン:</strong> 人々がハッとなる瞬間を</p>
                    <p><strong>バリュー:</strong> 幸せのバケツを満たし、分け与える</p>
                    <p><strong>取引銀行:</strong> 福岡県信用組合 周船寺支店、楽天銀行</p>
                </div>
            </div>
        </section>
        
        <section id="services" className={styles.section}>
            <h2 className={styles.sectionTitle}>事業内容</h2>
            <div className={styles.serviceGrid}>
                <div className={styles.serviceCard}>
                    <h3>人材事業</h3>
                    <p>企業向け1on1導入支援、当社オリジナル「地蔵1on1メソッド」、管理職向け研修などを通じて、組織のコミュニケーションを活性化させます。</p>
                    <button onClick={() => scrollToSection('presentation')} className={styles.serviceLink}>
                        企画書を見る
                    </button>
                </div>
                <div className={styles.serviceCard}>
                    <h3>養鶏事業</h3>
                    <p>福岡県飯塚市にて平飼い養鶏場「あかね農場」を運営。健康で美味しいたまごを生産しています。</p>
                    <a href="https://akanefarm.com/" target="_blank" rel="noopener noreferrer" className={styles.serviceLink}>あかね農場ウェブサイト</a>
                </div>
                <div className={styles.serviceCard}>
                    <h3>人材紹介事業</h3>
                    <p>企業と求職者の最適なマッチングを支援します。(許可No. 40-ユ-301391)</p>
                </div>
            </div>
        </section>
        
        <section id="presentation" className={`${styles.section} ${styles.bgGray} ${styles.presentationSection}`}>
            <h2 className={styles.sectionTitle}>企画書</h2>
            <div className={styles.presentationContainer}>
                <iframe
                    src={slidesEmbedUrl}
                    frameBorder="0"
                    allowFullScreen={true}
                    title="企画書スライド"
                ></iframe>
            </div>
        </section>

        <section id="clients" className={styles.section}>
            <h2 className={styles.sectionTitle}>主な取引企業</h2>
            <p className={styles.sectionText}>日野出株式会社, タンスのゲン株式会社, 第一交通産業グループ, 麻生セメント株式会社, 双日九州株式会社, 自然電力株式会社, 株式会社タカミヤ, 株式会社福住, エフコープ生活協同組合 (順不同)</p>
        </section>

        <section id="contact" className={`${styles.section} ${styles.bgGray}`}>
            <h2 className={styles.sectionTitle}>お問い合わせ</h2>
            <p className={styles.sectionText}>事業に関するご相談、お見積もりのご依頼は、下記よりお気軽にご連絡ください。</p>
            <a href="mailto:info@memento-inc.net" className={styles.contactButton}>メールで問い合わせる</a>
        </section>
      </main>
      
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Memento Inc. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default Home;