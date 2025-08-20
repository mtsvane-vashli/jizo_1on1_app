import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi';
import styles from './Home.module.css';

/**
 * Home: トップページ
 * - 既存のスクロールリビール演出を維持
 * - 新規: Careers / Message / Vision / Company セクションを追記
 * - 既存: Hero / 1on1推進事業 / 会社概要(サマリ) / 事業内容 / 企画書 / 取引企業 / お問い合わせ
 */
function Home() {
  // スムーズスクロール
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const headerOffset = 80;
    const elementPosition = section.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  };

  // セクションのリビール
  const observed = useRef([]);
  useEffect(() => {
    const targets = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.revealed);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((el) => {
      io.observe(el);
      observed.current.push(el);
    });
    return () => io.disconnect();
  }, []);

  const slidesEmbedUrl =
    'https://docs.google.com/presentation/d/1-1ogWEprs_wNI0mcxvGjUvORIdZ4OXZSIqajL_t56xI/embed?start=false&loop=false&delayms=3000&rm=minimal';

  return (
    <div className={styles.pageContainer}>
      {/* Sticky Glass Header */}
      <header className={styles.header}>
        <div className={styles.navContainer}>
          <span className={styles.logo}>Memento</span>
          <nav className={styles.nav}>
            <button onClick={() => scrollToSection('home')} className={styles.navLink}>ホーム</button>
            <button onClick={() => scrollToSection('careers')} className={styles.navLink}>採用</button>
            <button onClick={() => scrollToSection('about')} className={styles.navLink}>会社概要</button>
            <button onClick={() => scrollToSection('services')} className={styles.navLink}>事業内容</button>
            <button onClick={() => scrollToSection('clients')} className={styles.navLink}>取引企業</button>
            <button onClick={() => scrollToSection('contact')} className={styles.navLink}>お問い合わせ</button>
            <Link to="/login" className={`${styles.navLink} ${styles.navLinkJizo}`}>地蔵1on1</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section id="home" className={styles.hero}>
          {/* 背景オーナメント */}
          <div className={styles.heroBg}>
            <span className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
            <span className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
            <span className={styles.gridGlow} aria-hidden="true" />
          </div>

          <div className={styles.heroContent} data-reveal>
            <h1 className={styles.mainTitle}>
              人の記憶や想いを大切にし、<br />未来へと繋ぐ。
            </h1>
            <p className={styles.subtitle}>
              株式会社メメントは、人の記憶や想いを大切にし、未来へと繋ぐサービスを展開するである。
            </p>
            <Link to="/login" className={styles.ctaButton}>地蔵1on1を始める</Link>

            <button
              onClick={() => scrollToSection('careers')}
              className={styles.scrollDown}
              aria-label="採用セクションへスクロール"
            >
              <span className={styles.scrollDot} />
            </button>
          </div>
        </section>

        {/* ====== CAREERS（採用） ====== */}
        <section id="careers" className={`${styles.section} ${styles.careersSection}`} data-reveal>
          <div className={styles.careersHeader}>
            <span className={styles.eyebrow}>careers at 株式会社メメント</span>
            <h2 className={styles.careersTitle}>今日を一生懸命生きる</h2>
            <p className={styles.careersStat}>1 職種で積極採用中！</p>
          </div>

          <div className={styles.jobsGrid}>
            <article className={styles.jobCard}>
              <div className={styles.jobMeta}>
                <span className={styles.pill}>業務委託</span>
                <span className={styles.pillMuted}>リモート可</span>
              </div>
              <h3 className={styles.jobTitle}>
                1on1ミーティング導入支援のベンチャーで、事業の仕組み化のアシスタント募集
              </h3>
              <p className={styles.jobDesc}>
                1on1導入支援事業のオペレーション構築を、経営直下で推進するポジションである。
                ドキュメント整備、ワークフロー設計、ナレッジ基盤づくり等を担い、0→1 / 1→10の拡張を加速させるである。
              </p>
              <div className={styles.jobActions}>
                <a href="#job-details" className={styles.jobButtonPrimary}>
                  募集要項を見る <FiArrowRight aria-hidden="true" />
                </a>
                <a
                  href="mailto:info@memento-inc.net?subject=%E6%8E%A1%E7%94%A8%E5%BF%9C%E5%8B%9F%20%28%E4%BA%8B%E6%A5%AD%E3%81%AE%E4%BB%95%E7%B5%84%E3%81%BF%E5%8C%96ASST%29"
                  className={styles.jobButtonGhost}
                >
                  応募する <FiArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </article>
          </div>

          {/* 募集要項（簡易版） */}
          <div id="job-details" className={styles.jobDetails}>
            <div className={styles.detailCol}>
              <h4>業務内容</h4>
              <ul className={styles.bulletList}>
                <li>1on1導入支援の標準オペレーション策定・改善</li>
                <li>テンプレート・ガイド・チェックリストの整備</li>
                <li>顧客オンボーディング〜運用の仕組み化</li>
                <li>ナレッジ管理と事例の体系化</li>
              </ul>
            </div>
            <div className={styles.detailCol}>
              <h4>歓迎要件</h4>
              <ul className={styles.bulletList}>
                <li>誰かのサポートにやりがいを感じる姿勢</li>
                <li>0→1、1→10の変化を楽しめる適応力</li>
                <li>経営近接で事業創造プロセスを学ぶ意欲</li>
                <li>自分のアイデアを発信し、仕組みを磨く実行力</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ====== MESSAGE（創業の思い） ====== */}
        <section id="message" className={`${styles.section} ${styles.messageSection}`} data-reveal>
          <div className={styles.messageHeader}>
            <span className={styles.eyebrow}>MESSAGE</span>
            <h2 className={styles.sectionTitle}>創業の思い</h2>
            <p className={styles.messageLead}>明日死ぬなら今何をするか</p>
          </div>

          <div className={styles.messageBody}>
            <p>
              メメント・モリという言葉はご存知だろうか。ラテン語で「自分がいつか必ず死ぬことを忘れるな」「人に訪れる死を忘ることなかれ」を意味するである。
            </p>
            <p>
              私はあることがきっかけで生死をさまよった。以降、常に意識しているのは「明日死ぬなら今何をするか」である。人は本当にいつ死ぬか分からない。であれば、毎日を楽しく生きるべきである。
            </p>
            <p>
              私はあなたと一緒に思い出を作り、そして死んでいきたいと思っている。まだ生まれたばかりの会社である。何をするかではなく誰とするか。新しく出会うご縁を楽しみに、今日も一生懸命に生きていくである。
            </p>
          </div>
        </section>

        {/* ====== VISION / MORE INFO ====== */}
        <section id="vision" className={`${styles.section} ${styles.visionSection} ${styles.bgGray}`} data-reveal>
          <div className={styles.visionHeader}>
            <span className={styles.eyebrow}>MORE INFO</span>
            <h2 className={styles.sectionTitle}>(株)メメントが目指すビジョン</h2>
            <p className={styles.visionTagline}>「これやってみたい！」を形にできる会社にする</p>
          </div>

          <div className={styles.visionBody}>
            <h3 className={styles.visionSub}>当社の理念「今日を一生懸命生きる」</h3>
            <p>
              多くの会社が顧客第一を掲げるが、私は違うと考えるである。身の回りの人の心が満たされてこそ、顧客の課題や幸せを真に考えられるのである。
            </p>
            <p>
              そして「何をするかではなく誰とするか」である。私は100億、1000億を目指す巨大企業ではなく、朝起きて「今日も楽しく生きよう」と思える会社をつくりたい。超優秀な人材が揃った楽しくない組織より、毎日楽しくイキイキしている組織の方が、事業は成功すると確信しているである。
            </p>
            <p>
              商売とは「誰かの課題を解決する＝助ける」ことであり、卵であれ採用であれ形が変わるだけである。極論を言えば、扱う商品そのものより「人」が一番大事である。特殊な技術を除けば、うまくいく人は何をしてもうまくいく。そんな仲間が集まったとき、「これ、面白そうだからやってみよう」と言える会社。それが私の目標であり、ビジョンである。
            </p>

            <div className={styles.fitListWrap}>
              <h4 className={styles.visionSubSmall}>こんな方と働きたい</h4>
              <ul className={styles.checkList}>
                <li>誰かのサポートをすることにやりがいを感じる方</li>
                <li>0→1、1→10のフェーズを楽しみながら、変化に対応できる方</li>
                <li>経営者の近くで、事業創造のプロセスを学びたい方</li>
                <li>自分のアイデアや意見を発信し、事業をより良くしていくことに意欲的な方</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ====== COMPANY（詳細情報） ====== */}
        <section id="company" className={`${styles.section} ${styles.companySection}`} data-reveal>
          <h2 className={styles.sectionTitle}>COMPANY / 会社情報</h2>

          <div className={styles.companyGrid}>
            <div className={styles.infoCard}>
              <h4>会社概要</h4>
              <dl className={styles.kvList}>
                <div><dt>会社名</dt><dd>株式会社メメント</dd></div>
                <div><dt>事業内容</dt><dd>
                  人材サービス事業（1on1ミーティング推進、新卒採用支援、新規事業開発支援）
                </dd></div>
                <div><dt>企業WEBサイト</dt><dd>
                  <a href="https://mementoink.wixsite.com/memento" target="_blank" rel="noopener noreferrer">
                    https://mementoink.wixsite.com/memento
                  </a>
                </dd></div>
                <div><dt>企業SNS</dt><dd>—</dd></div>
              </dl>
            </div>

            <div className={styles.infoCard}>
              <h4>所在地</h4>
              <div className={styles.addressBlock}>
                <p><strong>本社</strong><br />福岡県福岡市西区横浜3丁目6番31ー105号</p>
              </div>
              <div className={styles.addressBlock}>
                <p><strong>養鶏事業所</strong><br />福岡県飯塚市馬敷1321-2</p>
              </div>
            </div>

            <div className={styles.infoCard}>
              <h4>メメント・モリとは</h4>
              <p className={styles.smallNote}>
                起業の原点は、サラリーマン時代に過労で倒れた経験にある。それ以来のモットーは
                「明日死ぬなら今何をするか」であり、この思いに賛同する仲間と共に、人生に沿った働き方を提供する企業を目指すである。
              </p>
            </div>
          </div>
        </section>

        {/* ====== 1on1 推進事業（既存） ====== */}
        <section id="promotion" className={styles.section} data-reveal>
          <h2 className={styles.sectionTitle}>1on1推進事業</h2>
          <p className={styles.sectionText}>
            AIを活用した1on1支援ツール「地蔵1on1」で、効果的な対話を促進し、組織と個人の成長をサポートするである。
            上司と部下の継続的なコミュニケーションを通じて、エンゲージメントと生産性の向上を実現するである。
          </p>
        </section>

        {/* ====== 会社概要（サマリ：既存） ====== */}
        <section id="about" className={`${styles.section} ${styles.bgGray}`} data-reveal>
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

        {/* ====== 事業内容（既存） ====== */}
        <section id="services" className={styles.section} data-reveal>
          <h2 className={styles.sectionTitle}>事業内容</h2>
          <div className={styles.serviceGrid}>
            <div className={`${styles.serviceCard} ${styles.tilt}`}>
              <h3>人材事業</h3>
              <p>
                企業向け1on1導入支援、当社オリジナル「地蔵1on1メソッド」、管理職向け研修などを通じて、
                組織のコミュニケーションを活性化させるである。
              </p>
              <button onClick={() => scrollToSection('presentation')} className={styles.serviceLink}>
                企画書を見る
              </button>
            </div>
            <div className={`${styles.serviceCard} ${styles.tilt}`}>
              <h3>養鶏事業</h3>
              <p>福岡県飯塚市にて平飼い養鶏場「あかね農場」を運営。健康で美味しいたまごを生産するである。</p>
              <a
                href="https://akanefarm.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.serviceLink}
              >
                あかね農場ウェブサイト
              </a>
            </div>
            <div className={`${styles.serviceCard} ${styles.tilt}`}>
              <h3>人材紹介事業</h3>
              <p>企業と求職者の最適なマッチングを支援（許可No. 40-ユ-301391）である。</p>
            </div>
          </div>
        </section>

        {/* 企画書（既存） */}
        <section
          id="presentation"
          className={`${styles.section} ${styles.bgGray} ${styles.presentationSection}`}
          data-reveal
        >
          <h2 className={styles.sectionTitle}>企画書</h2>
          <div className={styles.presentationContainer}>
            <iframe
              src={slidesEmbedUrl}
              frameBorder="0"
              allowFullScreen={true}
              title="企画書スライド"
            />
          </div>
        </section>

        {/* 取引企業（既存） */}
        <section id="clients" className={styles.section} data-reveal>
          <h2 className={styles.sectionTitle}>主な取引企業</h2>
          <p className={styles.sectionText}>
            日野出株式会社, タンスのゲン株式会社, 第一交通産業グループ, 麻生セメント株式会社,
            双日九州株式会社, 自然電力株式会社, 株式会社タカミヤ, 株式会社福住, エフコープ生活協同組合（順不同）である。
          </p>

          <div className={styles.marqueeWrap} aria-hidden="true">
            <div className={styles.marqueeTrack}>
              {[
                'HINODE', 'TANSUNOGEN', 'DAIICHI-KOTSU', 'ASO CEMENT',
                'SOJITZ KYUSHU', 'SHIZEN ENERGY', 'TAKAMIYA', 'FUKUZUMI', 'FCOOP'
              ].map((name, i) => (
                <span key={`m-${i}`} className={styles.marqueeItem}>{name}</span>
              ))}
              {[
                'HINODE', 'TANSUNOGEN', 'DAIICHI-KOTSU', 'ASO CEMENT',
                'SOJITZ KYUSHU', 'SHIZEN ENERGY', 'TAKAMIYA', 'FUKUZUMI', 'FCOOP'
              ].map((name, i) => (
                <span key={`m2-${i}`} className={styles.marqueeItem}>{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* お問い合わせ（既存） */}
        <section id="contact" className={`${styles.section} ${styles.bgGray}`} data-reveal>
          <h2 className={styles.sectionTitle}>お問い合わせ</h2>
          <p className={styles.sectionText}>
            事業に関するご相談、お見積もりのご依頼は、下記より気軽に連絡されたいである。
          </p>
          <a href="mailto:info@memento-inc.net" className={styles.contactButton}>
            メールで問い合わせる
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Memento Inc. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
