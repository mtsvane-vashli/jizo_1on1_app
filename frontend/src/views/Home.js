import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi';
import styles from './Home.module.css';

/**
 * Home: トップページ（コピー統合・重複解消版）
 * - スクロールリビール演出を維持
 * - 追加/更新: Careers / Message / Vision / Company の文面を提供コピーに合わせて反映
 * - 重複解消: 既存の「会社概要（サマリ）」セクションを削除し、Companyに一本化
 * - 既存維持: Hero / 1on1推進事業 / 事業内容 / 企画書 / 取引企業 / お問い合わせ
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
            <button onClick={() => scrollToSection('company')} className={styles.navLink}>会社情報</button>
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
              株式会社メメントは、人の記憶や想いを大切にし、未来へと繋ぐサービスを展開する。
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
                1on1ミーティング導入支援のベンチャーで、事業の仕組み化のアシスタント募集（業務委託）
              </h3>
              <p className={styles.jobDesc}>
                1on1導入支援事業のオペレーション構築を、経営直下で推進するポジション。
                ドキュメント整備、ワークフロー設計、ナレッジ基盤づくり等を担い、0→1 / 1→10の拡張を加速させる。
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
              メメント・モリという言葉はご存知でしょうか？ラテン語で「自分がいつか必ず死ぬことを忘れるな」「人に訪れる死を忘ることなかれ」という意味です。
            </p>
            <p>
              私はあることがきっかけで生死をさまよいました。以降、私が常に意識していることは「明日死ぬなら今何をするか」。
            </p>
            <p>
              人は本当にいつ死ぬか分かりません。だったら毎日楽しく生きていこうと考えています。
            </p>
            <p>
              そして、あなたと一緒に思い出を作り、死んでいきたいと思っています。まだ生まれたばかりの会社です。あなたと作り上げていきたい。
            </p>
            <p>
              何をするかではなく誰とするか。新しく出会うご縁を楽しみに、今日も一生懸命生きていきます。
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
              普通の会社は恐らく顧客第一という会社が多いと思います。私は違うと考えています。身の回りの人の心が豊かになって初めて、顧客の課題や幸せを考えることができると考えています。
            </p>
            <p>
              そして、「何をするかではなく誰とするか」。私が目指す道は、先程も申し上げた通り100億・1000億という大きな会社ではありません。朝起きて、「よし！今日も楽しく生きよう」と毎日が楽しくなる会社を作りたいと考えています。
            </p>
            <p>
              超優秀なメンバーが揃った楽しくない組織よりも、毎日楽しくイキイキとしている組織の方が事業は成功すると確信しています。
            </p>
            <p>
              そもそも商売とは「誰かの課題を解決する＝助ける」ことです。それが卵だったり、採用だったりと形が変わるだけです。極論を言えば、扱う商品なんてどうでも良い。商品を扱っている「人」が一番大事です。
            </p>
            <p>
              私は初めての起業で一番そこを学びました。特殊な技術を除けば、うまくいく人は何をしてもうまくいきます。そんな仲間が集まったとき、「これやったら面白そうじゃない？ちょっとやってみようよ！」と言える会社。それが目標であり、ビジョンです。
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
                <div>
                  <dt>事業内容</dt>
                  <dd>
                    人材サービス事業（1on1ミーティング推進事業、新卒採用支援事業、新規事業開発支援事業）
                  </dd>
                </div>
                <div>
                  <dt>企業WEBサイト</dt>
                  <dd>
                    <a href="https://mementoink.wixsite.com/memento" target="_blank" rel="noopener noreferrer">
                      https://mementoink.wixsite.com/memento
                    </a>
                  </dd>
                </div>
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
                私が起業した理由は、サラリーマン時代に過労で倒れたことがきっかけでした。それ以降、私のモットーは「明日死ぬなら今何をするか？」です。この思いに賛同してくれる仲間を探し、毎日を一生懸命生きています。自分のため、家族のため、大事な人のため——生き方は様々です。仕事ばかりが人生ではありません。一人ひとりに沿った働き方を提供できる企業になりたいと考えています。
              </p>
            </div>
          </div>
        </section>

        {/* ====== 1on1 推進事業（既存） ====== */}
        <section id="promotion" className={styles.section} data-reveal>
          <h2 className={styles.sectionTitle}>1on1推進事業</h2>
          <p className={styles.sectionText}>
            AIを活用した1on1支援ツール「地蔵1on1」で、効果的な対話を促進し、組織と個人の成長をサポートする。
            上司と部下の継続的なコミュニケーションを通じて、エンゲージメントと生産性の向上を実現する。
          </p>
        </section>

        {/* ====== 事業内容（既存） ====== */}
        <section id="services" className={styles.section} data-reveal>
          <h2 className={styles.sectionTitle}>事業内容</h2>
          <div className={styles.serviceGrid}>
            <div className={`${styles.serviceCard} ${styles.tilt}`}>
              <h3>人材事業</h3>
              <p>
                企業向け1on1導入支援、当社オリジナル「地蔵1on1メソッド」、管理職向け研修などを通じて、
                組織のコミュニケーションを活性化させる。
              </p>
              <button onClick={() => scrollToSection('presentation')} className={styles.serviceLink}>
                企画書を見る
              </button>
            </div>
            <div className={`${styles.serviceCard} ${styles.tilt}`}>
              <h3>養鶏事業</h3>
              <p>福岡県飯塚市にて平飼い養鶏場「あかね農場」を運営。健康で美味しいたまごを生産する。</p>
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
              <p>企業と求職者の最適なマッチングを支援（許可No. 40-ユ-301391）。</p>
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
            双日九州株式会社, 自然電力株式会社, 株式会社タカミヤ, 株式会社福住, エフコープ生活協同組合（順不同）。
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
            事業に関するご相談やお見積もりのご依頼は、下記より気軽にご連絡ください。
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
