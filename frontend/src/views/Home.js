import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';

/**
 * Home: mono-make風に統一しつつ要望反映
 * - ヒーロー見出しとサブ2行をそれぞれ改行で独立表示
 * - ボタン2つも縦並びで1行ずつ表示
 * - 既存の構成/演出は維持
 */

function Home() {
  useEffect(() => {
    document.title = '株式会社メメント｜Memento';
  }, []);

  // スムーズスクロール
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const headerOffset = 80;
    const elementPosition = section.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  };

  // 出現アニメ
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

  // スライド埋め込み（既存）
  const slidesEmbedUrl =
    'https://docs.google.com/presentation/d/1-1ogWEprs_wNI0mcxvGjUvORIdZ4OXZSIqajL_t56xI/embed?start=false&loop=false&delayms=3000&rm=minimal';

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.navContainer}>
          <span className={styles.logo}>Memento</span>
          <nav className={styles.nav}>
            <button onClick={() => scrollToSection('home')} className={`${styles.navLink} ${styles.navUnderline}`}>ホーム</button>
            <button onClick={() => scrollToSection('message')} className={`${styles.navLink} ${styles.navUnderline}`}>創業の思い</button>
            <button onClick={() => scrollToSection('company')} className={`${styles.navLink} ${styles.navUnderline}`}>会社情報</button>
            <button onClick={() => scrollToSection('founder')} className={`${styles.navLink} ${styles.navUnderline}`}>代表紹介</button>
            <button onClick={() => scrollToSection('services')} className={`${styles.navLink} ${styles.navUnderline}`}>事業内容</button>
            <Link to="/jizo-1on1" className={`${styles.navLink} ${styles.navLinkJizo}`}>1on1事業</Link>
            <button onClick={() => scrollToSection('trial')} className={`${styles.navLink} ${styles.navUnderline}`}>無料相談</button>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* ===== HERO ===== */}
        <section
          id="home"
          className={styles.hero}
          style={{
            backgroundImage: `
              linear-gradient(
                to top,
                rgba(0,0,0,0.50) 0%,
                rgba(0,0,0,0.30) 35%,
                rgba(0,0,0,0.12) 65%,
                rgba(0,0,0,0.00) 100%
              ),
              url(${process.env.PUBLIC_URL + '/assets/homepage_background.png'})
            `
          }}
        >
          <div className={`${styles.heroInner} ${styles.maskIn}`} data-reveal>
            {/* それぞれ改行で独立表示 */}
            <h1 className={`${styles.mainTitle} ${styles.flowStagger}`}>
              <span>メメント・モリ</span>
            </h1>
            <p className={`${styles.subline} ${styles.flowStagger}`}>
              <span>死を思うことで、今日を大切に生きる。</span>
            </p>
            <p className={`${styles.subline} ${styles.flowStagger}`}>
              <span>株式会社メメントは、人の記憶や想いを大切にし、未来へつなぐサービスを展開しています。</span>
            </p>

            {/* ボタンは1行ずつ縦並び */}
            <div className={`${styles.ctaColumn} ${styles.stagger}`}>
              <Link to="/jizo-1on1" className={styles.primaryBtn}>1on1事業を見る</Link>
              <button
                onClick={() => scrollToSection('message')}
                className={styles.linkBtn}
                aria-label="次のセクションへスクロール"
              >
                もっと見る
              </button>
            </div>
          </div>
        </section>

        {/* ===== MESSAGE ===== */}
        <section id="message" className={styles.section} data-reveal>
          {/* 見出しを2行で表示 */}
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}>
            <span>創業の思い</span><br />
            <span className={styles.sectionTitleSub}>明日死ぬなら今何をするか。</span>
          </h2>

          <div className={`${styles.messageBody} ${styles.stagger}`}>
            <p>
              「メメント・モリ」は、ラテン語で「いつか必ず死ぬことを忘れるな」という意味です。私は生死をさまよう経験を通じて、「明日死ぬなら今何をするか」を常に意識するようになりました。
            </p>
            <p>
              人は本当にいつ亡くなるか分かりません。だからこそ、毎日を楽しく、精一杯生きたいと考えています。
            </p>
            <p>
              まだ生まれたばかりの会社ですが、皆さまと一緒に思い出をつくりながら成長していきたいと思っています。何をするかではなく、誰とするか。新しいご縁を楽しみに、日々取り組んでまいります。
            </p>
          </div>
        </section>

        {/* ===== COMPANY ===== */}
        <section id="company" className={styles.section} data-reveal>
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}><span>COMPANY / 会社情報</span></h2>

          <div className={`${styles.companyGrid} ${styles.stagger}`}>
            {/* 左カード：ロゴ + 左カラム情報 */}
            <div className={styles.card}>
              <div className={styles.companyLogoWrap}>
                <img
                  src={process.env.PUBLIC_URL + '/assets/memento_logo.png'}
                  alt="株式会社メメント ロゴ"
                  className={styles.companyLogo}
                  loading="lazy"
                />
              </div>

              <h3 className={styles.cardTitle}>会社概要</h3>

              <div className={styles.companyTwoCols}>
                <dl className={styles.kvList}>
                  <div><dt>会社名</dt><dd>株式会社メメント</dd></div>
                  <div><dt>ミッション</dt><dd>30分で社会を前進させます。</dd></div>
                  <div><dt>ビジョン</dt><dd>人々がハッとする瞬間を増やします。</dd></div>
                  <div><dt>バリュー</dt><dd>幸せのバケツを満たし、分け与えます。</dd></div>
                  <div><dt>所在地</dt><dd>福岡県福岡市早良区南庄6丁目1-12 602</dd></div>
                </dl>

                <dl className={styles.kvList}>
                  <div><dt>設立</dt><dd>令和4年4月12日</dd></div>
                  <div><dt>取引銀行</dt><dd>福岡県信用組合 周船寺支店、楽天銀行</dd></div>
                  <div><dt>TEL</dt><dd>080-2744-8543</dd></div>
                  <div>
                    <dt>企業WEBサイト</dt>
                    <dd>
                      <a href="https://mementoink.wixsite.com/memento" target="_blank" rel="noopener noreferrer">
                        https://mementoink.wixsite.com/memento
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* 右カード：メメント・モリとは */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>メメント・モリとは</h3>
              <p className={styles.sectionText}>
                私が起業した理由は、会社員時代に過労で倒れた経験がきっかけです。以降、「明日死ぬなら今何をするか」をモットーに生きています。この思いに共感してくださる仲間とともに、一人ひとりに合った働き方をつくり、毎日を大切にできる社会づくりに貢献していきます。
              </p>
            </div>
          </div>
        </section>

        {/* ===== FOUNDER ===== */}
        <section id="founder" className={styles.section} data-reveal>
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}><span>代表紹介</span></h2>
          <div className={`${styles.founderRow} ${styles.stagger}`}>
            <div className={styles.founderAvatar}>
              <img
                src={process.env.PUBLIC_URL + '/assets/daihyou.png'}
                alt="代表写真"
                loading="lazy"
              />
            </div>
            <div>
              <p className={styles.sectionText}>
                大学卒業後、株式会社マイナビで求人広告の営業職として入社しました。アルバイト情報サイト・就職情報サイトにおける求人広告の営業や、採用HP・パンフレット等の新卒採用に関わるディレクション、その他中途採用業務に従事しました。趣味はサウナや筋トレ、落語（好きな演目：芝浜）です。
              </p>
              <p className={styles.sectionText}>
                6年間勤めた後、養鶏事業を行う CraftFoodClub 株式会社を創業し、同年9月に退任しました。2023年4月、株式会社メメントを創業し、人材事業を展開しています。翌年9月には福岡県飯塚市の養鶏場を事業譲渡により取得し、人材と養鶏の事業を行っています。
              </p>
            </div>
          </div>
        </section>

        {/* ===== SERVICES ===== */}
        <section id="services" className={styles.section} data-reveal>
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}><span>事業内容</span></h2>

          {/* 左寄せ・枠線なし・約1/3幅 */}
          <Link to="/jizo-1on1" className={styles.serviceBannerLink} aria-label="1on1詳細ページへ">
            <img
              src={process.env.PUBLIC_URL + '/assets/1on1_banner.png'}
              alt="1on1コミュニケーション事業のご案内"
              className={styles.serviceBanner}
              loading="lazy"
            />
          </Link>

          <div className={`${styles.serviceStack} ${styles.stagger}`}>
            <article className={styles.serviceBlock}>
              <h3 className={styles.cardTitle}>1on1推進事業</h3>
              <p className={styles.sectionText}>
                AIを活用した1on1支援ツール「地蔵1on1」により、上司と部下の継続的なコミュニケーションを支援します。対話の質を高め、エンゲージメントと生産性の向上につなげます。
              </p>
              <Link to="/jizo-1on1" className={styles.textLink}>1on1の詳細を見る</Link>
            </article>

            <article className={styles.serviceBlock}>
              <h3 className={styles.cardTitle}>新卒採用支援（追記）</h3>
              <p className={styles.sectionText}>
                当社の新卒採用支援は、現場のマネジメント層と1on1ミーティングを行うための社内の状況や強みの分析と、これまでの新卒採用経験を融合させています。単なるノウハウ提供にとどまらず、現場の課題やニーズを深く理解し、貴社独自の採用戦略を共に構築します。
              </p>
            </article>

            <article className={styles.serviceBlock}>
              <h3 className={styles.cardTitle}>養鶏事業</h3>
              <p className={styles.sectionText}>
                福岡県飯塚市の平飼い養鶏場「あかね農場」を運営し、安心でおいしい卵を生産しています。
              </p>
              <a
                href="https://akanefarm.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.textLink}
              >
                あかね農場ウェブサイト
              </a>
            </article>

            <article className={styles.serviceBlock}>
              <h3 className={styles.cardTitle}>人材紹介事業</h3>
              <p className={styles.sectionText}>
                企業と求職者の最適なマッチングを支援します（許可 No. 40-ユ-301391）。
              </p>
            </article>
          </div>
        </section>

        {/* ===== PRESENTATION（既存） ===== */}
        <section id="presentation" className={styles.section} data-reveal>
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}><span>企画書</span></h2>
          <div className={`${styles.embed} ${styles.stagger}`}>
            <iframe
              src={slidesEmbedUrl}
              frameBorder="0"
              allowFullScreen={true}
              title="企画書スライド"
              style={{ aspectRatio: '16 / 9', border: 0 }}
            />
          </div>
        </section>

        {/* ===== CLIENTS（残す） ===== */}
        <section id="clients" className={styles.section} data-reveal>
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}><span>主な取引企業</span></h2>
          <p className={styles.sectionText}>
            日野出株式会社、タンスのゲン株式会社、第一交通産業グループ、麻生セメント株式会社、双日九州株式会社、
            自然電力株式会社、株式会社タカミヤ、株式会社福住、エフコープ生活協同組合（順不同）とお取引があります。
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

        {/* ===== TRIAL（無料相談→Jizoフォーム） ===== */}
        <section id="trial" className={styles.section} data-reveal>
          <h2 className={`${styles.sectionTitle} ${styles.underlineGrow} ${styles.flowStagger}`}><span>無料相談・フリートライアルのご案内</span></h2>
          <div className={`${styles.card} ${styles.center} ${styles.stagger}`}>
            <p className={styles.sectionText}>
              導入前の無料相談と、1名30分の1on1フリートライアルをご用意しています。お気軽にご相談ください。
              <br />
              <small className={styles.smallNote}>無料体験後のアンケートでは、92%の方が「1on1に満足」と回答しました。</small>
            </p>
            <a href="/jizo-1on1#form" className={styles.primaryBtn}>お問い合わせフォームへ</a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Memento Inc. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
